import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,getMap,hexDistance,campaignView} from '../docs/rules.js';
import {FIELD_STATIONS,fieldStationReport,nearestKnownStation} from '../docs/field-stations.js';
import {translate} from '../docs/i18n.js';

function open(seed,mapId='la',size='large'){
  return createGame([{name:'Coast'},{name:'Valley'}],mapId,{mapSize:size,seed});
}
const stations=state=>Object.entries(state.board).filter(([,cell])=>cell.fieldStation);
test('all regions seed dry, separated, repeatable field stations outside the starting squares',()=>{
  for(const region of ['la','sd','sf'])for(const seed of [5,17,114]){
    const game=open(seed,region),sites=stations(game),map=getMap(game);
    assert.deepEqual(sites,stations(open(seed,region)));
    assert.ok(sites.length>=3);
    assert.equal(new Set(sites.map(([,c])=>c.fieldStation)).size,3);
    for(const [tile,cell] of sites){
      assert.ok(!['ocean','mountains'].includes(map.byId[tile].terrain));
      assert.ok(!cell.resource && !cell.naturalWonder);
      assert.ok(sites.every(([id])=>id===tile || hexDistance(id,tile)>=3));
    }
    for(const settler of game.units)assert.ok(sites.some(([tile])=>hexDistance(tile,settler.tile)<=4));
    const view=campaignView(game,0);
    assert.ok(stations(view).length<sites.length);
    for(const [tile] of stations(view))assert.ok(view.intel.explored.includes(tile));
  }
});
test('an exchange spends movement and pays once per civilization; a rival cannot inspect the receipt',()=>{
  const game=open(17);
  for(const [tile,cell] of stations(game).filter(([,c],i,all)=>all.findIndex(([,d])=>c.fieldStation===d.fieldStation)===i)){
    const scout={id:'survey',seat:0,type:'scout',tile,hp:55,maxHp:65,moves:2,maxMoves:3};
    const start={...game,units:[...game.units,scout]};
    const report=fieldStationReport(start,scout);
    assert.equal(report.choices.length,2);
    assert.equal(report.name,FIELD_STATIONS[cell.fieldStation].name);
    for(const choice of report.choices){
      const action={type:'visitStation',unit:'survey',item:choice.key};
      const next=applyAction(start,0,action);
      const unit=next.units.at(-1);
      assert.equal(unit.moves,0);
      if(choice.stat==='hp')assert.equal(unit.hp,65);
      else assert.equal(next.players[0][choice.stat]-start.players[0][choice.stat],choice.amount);
      assert.deepEqual(start.players[0].stationVisits,undefined);
      assert.deepEqual(next.players[0].stationVisits,[tile]);
      assert.equal(campaignView(next,1).players[0].stationVisits,undefined);
      unit.moves=3;
      assert.throws(()=>applyAction(next,0,action));
      assert.equal(nearestKnownStation(next,unit,[tile],hexDistance),null);
      assert.notEqual(translate(choice.name,'zh-CN'),choice.name);
      assert.notEqual(translate(choice.label,'zh-CN'),choice.label);
    }
    assert.throws(()=>applyAction({...start,campaignVariety:undefined},0,{type:'visitStation',unit:'survey',item:report.choices[0].key}));
  }
});
