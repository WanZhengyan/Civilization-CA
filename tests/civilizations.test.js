import assert from 'node:assert/strict';
import test from 'node:test';
import {CIVILIZATIONS,allocateCivilizations,validCivilizationPick} from '../docs/civilizations.js';
import {seededRandom,shuffled} from '../docs/opening.js';
import {applyAction,campaignView,createGame,getCityYield,getStats,migrateGame} from '../docs/rules.js';
import {projectForSeat} from '../docs/vision.js';

const ids=CIVILIZATIONS.map(civ=>civ.id);

function* allPicks(length) {
  if (!length) { yield []; return; }
  for (const fixed of allPicks(length-1)) for (const choice of ['random',...ids]) yield [...fixed,choice];
}

test('every 1–4 seat combination reserves explicit choices before drawing the rest',()=>{
  for (let count=1;count<=4;count++) {
    for (const picks of allPicks(count)) {
      const fixed=picks.filter(id=>id!=='random');
      if (new Set(fixed).size<fixed.length) {
        assert.throws(()=>allocateCivilizations(picks,17),/only once/);
        continue;
      }
      for (const seed of [17,28]) {
        const assigned=allocateCivilizations(picks,seed);
        assert.deepEqual(assigned,allocateCivilizations(picks,seed));
        assert.equal(assigned.length,count);
        assert.equal(new Set(assigned).size,count);
        assigned.forEach((value,i)=>{
          assert.ok(CIVILIZATIONS[value]);
          if (picks[i]!=='random') assert.equal(CIVILIZATIONS[value].id,picks[i]);
        });
      }
    }
  }
  for (const invalid of ['',null,1,{},'unlisted','toString']) {
    assert.equal(validCivilizationPick(invalid),false);
    assert.throws(()=>createGame([{civilization:invalid},'B'],'la',{seed:3}),/valid civilization/);
  }
  assert.throws(()=>createGame([{civilization:'republic'},{civilization:'republic'}]),/only once/);
});

test('unspecified seats retain the published seeded civilization draw',()=>{
  const pairs=new Set();
  for (let seed=0;seed<64;seed++) {
    const before=shuffled([0,1,2,3],seededRandom(seed,'civilizations'));
    assert.deepEqual(allocateCivilizations([undefined,'random',undefined,'random'],seed),before);
    pairs.add(allocateCivilizations(['random','random'],seed).join(','));
  }
  assert.equal(pairs.size,12);
});

test('selecting human and bot civilizations leaves starts, forces, sight, deposits and initiative untouched',()=>{
  for (const map of ['la','sf','sd']) {
    const inputs=ids.map((id,i)=>({name:'Seat '+i,bot:i>0,civilization:id}));
    const options={seed:32,drawInitiative:true,teams:[0,0,1,1],simultaneousTeams:true};
    const selected=createGame(inputs,map,options);
    const random=createGame(inputs.map(({civilization,...seat})=>seat),map,options);
    assert.deepEqual(selected.players.map(player=>player.faction),[0,1,2,3]);
    assert.deepEqual(selected.players.map(player=>player.bot),[false,true,true,true]);
    for (const field of ['board','barbarians','teamPhase','firstSeat','units','exploration']) {
      assert.deepEqual(selected[field],random[field],field);
    }
    for (let seat=0;seat<4;seat++) {
      const view=projectForSeat(selected,seat);
      // The dossier reflects the selected civilization. Its sight and every
      // other public field must remain independent of the identity assignment.
      const {diplomacy,...sight}=view.intel;
      const {diplomacy:randomDossier,...randomSight}=projectForSeat(random,seat).intel;
      assert.deepEqual(sight,randomSight);
      const observations=rows=>rows.map(({faction,...reports})=>reports);
      assert.deepEqual(observations(diplomacy),observations(randomDossier));
      assert(diplomacy.every(row=>row.faction===selected.players[row.seat].faction));
      assert.deepEqual(view.players.map(player=>player.faction),[0,1,2,3]);
      assert.equal(view.players[(seat+1)%4].science,undefined);
      assert.equal(view.players[(seat+1)%4].civilization,undefined);
    }
  }
  const practice=createGame([{name:'Me',civilization:'arroyo'}],'la',{practice:true,seed:5});
  assert.equal(practice.players[0].faction,3);
});

const expectedBonuses={
  republic:[1,0,0,0],
  pacific:[0,0,2,0],
  valley:[0,2,0,0],
  arroyo:[0,0,0,1]
};

function economy(state, seat, cityId) {
  const city=getCityYield(state,cityId), seatStats=getStats(state,seat);
  return [city.production,city.food,seatStats.capitalIncome,seatStats.scienceIncome];
}
function difference(after,before) {
  return after.map((value,index)=>value-before[index]);
}

for (const civilization of ids) {
  test(civilization+' has the advertised capital yield in its forecasts and the actual end-turn ledger',()=>{
    const options={seed:23,practice:true};
    let state=createGame([{civilization}],'la',options);
    let historical=createGame([{civilization}],'la',{...options,civilizationTraits:false});
    assert.deepEqual(getStats(state,0),getStats(historical,0));
    const prepare=g=>{
      g=applyAction(g,0,{type:'found',unit:g.units[0].id});
      return applyAction(g,0,{type:'produce',city:g.cities[0].id,item:'ranged'});
    };
    state=prepare(state); historical=prepare(historical);
    const cityId=state.cities[0].id;
    const projected=campaignView(state,0);
    assert.equal(state.civilizationTraits,1); assert.equal(projected.civilizationTraits,1);
    const historicalLoaded=migrateGame(JSON.parse(JSON.stringify(historical)));
    assert.equal(Object.hasOwn(historicalLoaded,'civilizationTraits'),false);
    assert.equal(Object.hasOwn(campaignView(historicalLoaded,0),'civilizationTraits'),false);
    const expected=expectedBonuses[civilization];
    assert.deepEqual(difference(economy(state,0,cityId),economy(historicalLoaded,0,cityId)),expected);
    assert.deepEqual(economy(projected,0,cityId),economy(state,0,cityId));
    assert.equal(getCityYield(projected,cityId).capital-getCityYield(historical,cityId).capital,expected[2]);
    const ledger=g=>[g.cities[0].queue.progress,g.cities[0].food,g.players[0].capital,g.players[0].science];
    assert.deepEqual(difference(ledger(applyAction(state,0,{type:'end'})),ledger(applyAction(historicalLoaded,0,{type:'end'}))),expected);
  });
}

test('losing the original capital pauses the trait, recapturing restores it and additional cities never multiply it',()=>{
  for (const civilization of ids) {
    let game=createGame([{civilization},{name:'Ally'},{name:'Rival'}],'sd',{seed:42,teams:[0,0,1]});
    game=applyAction(game,0,{type:'found',unit:game.units[0].id});
    const city=game.cities[0];
    for (const [holder,founder] of [[0,0],[1,0],[2,0],[0,1],[0,null],[0,0]]) {
      city.seat=holder;city.originalSeat=founder;
      const neutral={...game,civilizationTraits:undefined};
      const diff=difference(economy(game,holder,city.id),economy(neutral,holder,city.id));
      assert.deepEqual(diff,holder===0 && founder===0 ? expectedBonuses[civilization] : [0,0,0,0]);
    }
    const additional={...city,id:'additional',tile:game.units[0].tile,originalSeat:null};
    game.cities.push(additional);
    const neutral={...game,civilizationTraits:undefined};
    assert.deepEqual(getCityYield(game,additional.id),getCityYield(neutral,additional.id));
    assert.deepEqual(difference(economy(game,0,city.id),economy(neutral,0,city.id)),expectedBonuses[civilization]);
    const distant=campaignView(game,2);
    assert.equal(distant.cities.some(c=>c.id===city.id),false);
    assert.equal(Object.hasOwn(distant.players[0],'capital'),false);
    assert.equal(Object.hasOwn(distant.players[0],'science'),false);
    assert.equal(distant.intel.hasFoundedCapital,false);
  }
});
