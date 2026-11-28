import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,chooseBotAction,createGame,getCitizenWorkforce,getCityExpansion} from '../docs/rules.js';

test('a governor buys a productive parcel with a long wait and saves influence when natural growth is imminent',()=>{
  let state=createGame(['West','East'],'sf',{seed:624102,mapSize:'large'});
  const seat=0;
  state=applyAction(state,seat,{type:'found',unit:state.units.find(u=>u.seat===seat).id});
  const city=state.cities[0],player=state.players[seat];
  // Offer new coastal work to a citizen currently employed in the city garden.
  for(const holding of Object.values(state.board)) if(holding.owner===seat) holding.owner=null;
  state.board[city.tile].owner=seat;
  city.focusRound=state.round;
  city.queue={item:'scout',progress:0,required:7};
  player.research='agronomy';player.civic='charter';player.capital=0;player.influence=15;
  state.actionsLeft=0;
  for(const unit of state.units) if(unit.seat===seat) unit.moves=0;

  const report=getCityExpansion(state,city.id),order=chooseBotAction(state);
  assert.deepEqual(order,{type:'charterBorder',city:city.id,tile:report.tile});
  assert.deepEqual(chooseBotAction(campaignView(state,seat)),order);
  assert.equal(report.turns,8);
  assert.equal(chooseBotAction({...state,influencePlanning:undefined}).type,'end');
  const lowReserve=structuredClone(state);
  lowReserve.players[seat].influence=14;
  assert.notEqual(chooseBotAction(lowReserve).type,'charterBorder');
  const next=applyAction(state,seat,order);
  assert.equal(next.players[seat].influence,player.influence-6);
  const before=getCitizenWorkforce(state,city.id).yields,after=getCitizenWorkforce(next,city.id).yields;
  assert.ok(Object.keys(before).every(resource=>after[resource]>=before[resource]));
  assert.ok(Object.keys(before).some(resource=>after[resource]>before[resource]));

  player.technologies.push('civics');
  player.civics.push('federation');
  assert.equal(getCityExpansion(state,city.id).turns,2);
  assert.notEqual(chooseBotAction(state).type,'charterBorder');
});
