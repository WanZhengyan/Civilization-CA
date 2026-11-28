import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,campaignView,getMap,hexDistance} from '../docs/rules.js';
import {fieldReport} from '../docs/field-expeditions.js';

function start(map='la'){
  let s=createGame([{name:'West'},{name:'East'}],map,{seed:624101,mapSize:'large'});
  s=applyAction(s,0,{type:'found',unit:s.units[0].id});
  s.players[0].capital=40;
  s.units.push({id:'field-team',seat:0,type:'scout',tile:s.cities[0].tile,moves:3,maxMoves:3,hp:65,maxHp:65});
  return s;
}
const scout=s=>s.units.find(u=>u.id==='field-team');
const read=s=>fieldReport(s,scout(s),getMap(s),hexDistance);
const order=(s,item,study='transect',extra={})=>applyAction(s,0,{type:'fieldStudy',unit:'field-team',item,study,step:read(s).mission?.notes.length||0,...extra});
const travel=(s,tile)=>{const next=structuredClone(s);scout(next).tile=tile;scout(next).moves=3;return next;};

test('a scout commissions, observes contrasting terrain, returns and collects a private one-time field report',()=>{
  const s=start(),city=s.cities[0],map=getMap(s);
  let next=order(s,'start');assert.equal(next.players[0].capital,37);assert.equal(s.players[0].fieldCrews,undefined);
  next=order(next,'sample');assert.throws(()=>order(next,'sample','transect',{step:0}));
  const site=map.tiles.find(t=>!['ocean','mountains',map.byId[city.tile].terrain].includes(t.terrain)&&hexDistance(t.id,city.tile)>2);
  next=order(travel(next,site.id),'sample');assert.throws(()=>order(next,'file'));
  const science=next.players[0].science;next=order(travel(next,city.tile),'file');assert.equal(next.players[0].science,science+6);
  assert.throws(()=>order(next,'start'));assert.equal(campaignView(next,1).players[0].fieldReports,undefined);
});
