import {eraFor} from './progression.js';
import {seatMayOrder} from './team-turns.js';
import {sameTeam} from './teams.js';

// Remember whom this observer actually encountered. Older charts contain terrain,
// but cannot say which civilization controlled that terrain in an earlier round.
export function observeContacts(state,seat,visible) {
  const old=state.contacts?.[seat] || {};
  let contacts=old;
  function meet(other) {
    if (!Number.isInteger(other) || !state.players[other] || sameTeam(state,seat,other) || contacts[other]) return;
    if (contacts===old) contacts={...old};
    contacts[other]={firstMetRound:state.round};
  }
  for (const id of visible) meet(state.board[id]?.owner);
  for (const unit of state.units) if (visible.has(unit.tile)) meet(unit.seat);
  const observedCities=new Map();
  for (const city of state.cities) {
    if (!visible.has(city.tile)) continue;
    meet(city.seat);
    observedCities.set(city.tile,city);
  }
  // Only an actual return to a site can correct an old city name or ownership.
  for (const [other,record] of Object.entries(contacts)) {
    let cities=record.cities || {};
    for (const tile of Object.keys(cities)) {
      if (visible.has(tile) && observedCities.get(tile)?.seat!==Number(other)) {
        cities={...cities};delete cities[tile];
      }
    }
    for (const city of observedCities.values()) {
      if (city.seat!==Number(other) || !city.name) continue;
      const last=cities[city.tile];
      if (last?.name!==city.name || last.lastSeenRound!==state.round) {
        cities={...cities,[city.tile]:{name:city.name,lastSeenRound:state.round}};
      }
    }
    if (cities!==record.cities && (record.cities || Object.keys(cities).length)) {
      if (contacts===old) contacts={...old};
      contacts[other]={...record,cities};
    }
  }
  return contacts;
}

const DELEGATION_COST=6;
function delegationWindow(state,observer,target) {
  const sentRound=state.delegations?.[observer]?.[target];
  if (!Number.isInteger(sentRound) || state.round>sentRound+2) return null;
  return {sentRound,throughRound:sentRound+2};
}

function delegationOption(state,observer,target,contacts) {
  let reason='';
  if (!Number.isInteger(target) || !state.players[target] || sameTeam(state,observer,target) || !contacts[target]) reason='Choose a contacted rival.';
  else if (state.phase!=='playing') reason='The campaign has ended.';
  else if (state.players[observer].eliminated || !seatMayOrder(state,observer)) reason='Wait for your turn.';
  else if (state.players[target].eliminated) reason='This civilization has been eliminated.';
  else if (delegationWindow(state,observer,target)) reason='A delegation is already active.';
  else if (state.players[observer].influence<DELEGATION_COST) reason='You need 6 influence.';
  return {enabled:!reason,cost:DELEGATION_COST,reason};
}

export function sendDelegation(state,seat,target,visible) {
  const offer=delegationOption(state,seat,target,observeContacts(state,seat,visible));
  if (!offer.enabled) throw new Error(offer.reason);
  const own=state.delegations?.[seat];
  state.delegations={...state.delegations,[seat]:{...own,[target]:state.round}};
  state.players[seat].influence-=offer.cost;
}

export function diplomacyView(state,observer,visible) {
  const contacts=observeContacts(state,observer,visible);
  return state.players.flatMap((player,seat)=>{
    const relation=seat===observer?'self':sameTeam(state,observer,seat)?'ally':'rival';
    if (relation==='rival' && !contacts[seat]) return [];
    const knownCities=relation==='rival' ? Object.entries(contacts[seat].cities || {}).map(([tile,last])=>
      ({...last,tile,visible:visible.has(tile)})) :
      state.cities.filter(c=>c.seat===seat && visible.has(c.tile)).map(city=>
        ({name:city.name,tile:city.tile,lastSeenRound:state.round,visible:true}));
    // A delegation publishes only aggregates. City sites, armies, treasury, queues
    // and specific discoveries still require ordinary intelligence.
    const window=delegationWindow(state,observer,seat);
    const report=window && !player.eliminated ? {...window,era:eraFor(player.technologies,player.civics).id,
      cityCount:state.cities.filter(c=>c.seat===seat).length} : null;
    const rival=relation==='rival';
    return [{seat,relation,knownCities,
      delegationOrder:rival?delegationOption(state,observer,seat,contacts):null,
      delegation:rival?report:null,
      visibleUnits:state.units.filter(u=>u.seat===seat && visible.has(u.tile)).length,
      visibleDistricts:[...visible].filter(id=>state.board[id]?.owner===seat).length,name:player.name,faction:player.faction,eliminated:Boolean(player.eliminated),
      firstMetRound:contacts[seat]?.firstMetRound ?? null}];
  });
}

// Reserve influence for border contests and policy changes. A city that has
// disappeared into fog makes a more useful destination than one in plain view.
export function proposeDelegation(rows,round,influence,difficulty) {
  if (difficulty==='easy' || round<7 || influence<15 || rows.some(row=>row.delegation)) return null;
  const rival=rows.find(row=>row.delegationOrder?.enabled && !row.knownCities.some(city=>city.visible));
  return rival ? {type:'delegation',target:rival.seat} : null;
}
