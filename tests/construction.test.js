import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClassicGame} from './classic-game.js';
import {applyAction,getProductionOptions,getMap} from '../docs/rules.js';
import {revisionOf} from '../docs/works.js';
const fresh=()=>{const s=createClassicGame(['Pacific','Sierra']);s.players[0].civics=['publicWorks'];return s;};
const city=s=>s.cities.find(c=>c.seat===0);
const order=(s,type,item,extra={})=>applyAction(s,0,{type,city:city(s).id,item,...extra});
const cycle=s=>applyAction(applyAction(s,0,{type:'end'}),1,{type:'end'});
test('city owners explicitly replace a project with an optimistic revision',()=>{
 let s=order(fresh(),'produce','granary');
 assert.throws(()=>order(s,'switchProduction','builder',{expected:0}),/changed/);
 s=order(s,'switchProduction','builder',{expected:revisionOf(city(s))});
 assert.equal(city(s).queue.item,'builder');
 assert.throws(()=>order(s,'produce','granary'));
});
test('suspended work stays in the host city and resumes after saving',()=>{
 let s=cycle(order(fresh(),'produce','neighborhood')),n=city(s).queue.progress;
 s=order(s,'switchProduction','builder',{expected:revisionOf(city(s))});
 assert.equal(city(s).parkedProduction.neighborhood,n);
 s=order(JSON.parse(JSON.stringify(s)),'switchProduction','neighborhood',{expected:revisionOf(city(s))});
 assert.equal(city(s).queue.progress,n);
 assert.equal(city(s).parkedProduction.neighborhood,undefined);
});
import {getWonderSites} from '../docs/rules.js';
test('suspending a university returns its charter fee and releases its parcel',()=>{
 let s=fresh(); s.players[0].capital=20;s.players[0].civics=['charter'];
 const site=getWonderSites(s,city(s).id,'ucla')[0].id;
 s=order(s,'produce','ucla',{site});assert.equal(s.players[0].capital,15);
 s=order(s,'switchProduction','monument',{expected:revisionOf(city(s))});
 assert.equal(s.players[0].capital,20);assert(!s.wonderRegistry.ucla);
 assert(getWonderSites(s,city(s).id,'ucla').some(o=>o.id===site));
});
test('the advertised gold cost discounts completed work and excludes wonders',()=>{
 let s=cycle(order(fresh(),'produce','neighborhood'));s.players[0].capital=100;
 const opts=getProductionOptions(s,city(s).id,{replace:true}),q=city(s).queue;
 assert.equal(opts.find(o=>o.item==='neighborhood').gold,(q.required-q.progress)*3);
 assert(opts.find(o=>o.item==='neighborhood').buyEnabled);
 s.players[0].civics=['charter'];assert.match(getProductionOptions(s,city(s).id,{replace:true}).find(o=>o.item==='ucla').buyReason,/wonders/);
});
test('buying a building finishes immediately without advancing food, charging twice or accepting a stale quote',()=>{
 let s=fresh();s.players[0].capital=100;
 const quote=getProductionOptions(s,city(s).id).find(o=>o.item==='granary');
 const args={expected:0,gold:quote.gold},food=city(s).food;
 assert.throws(()=>order(s,'buyProduction','granary',{...args,gold:1}),/price/);
 const bought=order(s,'buyProduction','granary',args);
 assert.equal(bought.players[0].capital,100-quote.gold);assert.equal(city(bought).queue,null);
 assert.equal(city(bought).food,food);assert(city(bought).buildings.includes('granary'));
 assert.throws(()=>order(bought,'buyProduction','granary',args),/changed/);
 assert.equal(s.players[0].capital,100);
});
test('a blocked unit purchase leaves production and the treasury untouched',()=>{
 let s=fresh();s.players[0].capital=100;
 const c=city(s),map=getMap(s);
 for (const id of [c.tile,...map.neighbors(c.tile)]) s.units.push({id:'occupant'+id,type:'melee',seat:0,tile:id,hp:80,maxHp:80,moves:0});
 const quote=getProductionOptions(s,c.id).find(o=>o.item==='builder');
 assert.match(quote.buyReason,/deployment/);
 assert.throws(()=>order(s,'buyProduction','builder',{expected:0,gold:quote.gold}),/deployment/);
 assert.equal(s.players[0].capital,100);assert.equal(c.queue,null);
});
import {getProjectSites} from '../docs/rules.js';
test('ordinary construction selects a specific connected, non-resource city tile',()=>{
 const s=fresh(),c=city(s),map=getMap(s);
 const t=map.neighbors(c.tile).find(id=>map.byId[id].terrain==='urban'||map.byId[id].terrain==='plains');
 s.board[t]={owner:0,level:0,improvement:null};
 assert(getProjectSites(s,c.id,'granary').some(k=>k.id===t));
 assert.equal(order(s,'produce','granary',{site:t}).cities[0].queue.site,t);
 assert.throws(()=>order(s,'produce','granary',{site:'999,999'}),/construction tile/);
 s.board[t].resource='grain';assert(!getProjectSites(s,c.id,'granary').some(k=>k.id===t));
 assert.equal(order(s,'produce','granary').cities[0].queue.site,c.tile);
});
test('completed facilities retain their parcel and protect it from new construction',()=>{
 let s=fresh();const c=city(s),map=getMap(s);
 const t=map.neighbors(c.tile).find(id=>!['mountains','ocean'].includes(map.byId[id].terrain));
 s.board[t]={owner:0,level:0,improvement:null};s.players[0].capital=100;
 const price=getProductionOptions(s,c.id).find(o=>o.item==='granary').gold;
 s=order(s,'buyProduction','granary',{site:t,expected:0,gold:price});
 assert.equal(city(s).buildingSites.granary,t);assert.equal(s.board[t].facility,'granary');
 assert(!getProjectSites(s,c.id,'workshop').some(o=>o.id===t));s.players[0].civics=['charter'];
 assert(!getWonderSites(s,c.id,'ucla').some(o=>o.id===t));
});
import {campaignView} from '../docs/rules.js';
test('every available berth is selectable and the private map receives the owner’s harbor sites',()=>{
 let s=applyAction(fresh(),0,{type:'end'});const c=s.cities.find(x=>x.seat===1);
 const sites=getProjectSites(s,c.id,'harbor');
 assert(sites.length>=1);assert(sites.every(t=>t.terrain==='ocean'));
 const view=campaignView(s,1);assert.deepEqual(getProjectSites(view,c.id,'harbor').map(t=>t.id),sites.map(t=>t.id));
 const t=sites.at(-1).id;s=applyAction(s,1,{type:'produce',item:'harbor',city:c.id,site:t});
 const q=s.cities.find(x=>x.id===c.id).queue;assert.equal(q.portTile,t);assert.equal(q.site,t);
});
test('a rush keeps the chosen site and resumed work lowers the bill',()=>{
 let s=fresh();s.players[0].capital=120;
 s=cycle(order(s,'produce','neighborhood'));const c=city(s),q=c.queue;
 const quote=getProductionOptions(s,c.id,{replace:true}).find(o=>o.item===q.item);
 assert.throws(()=>order(s,'buyProduction',q.item,{gold:quote.gold,expected:revisionOf(c),site:'-1,-1'}),/construction tile/);
 const bought=order(s,'buyProduction',q.item,{expected:revisionOf(c),gold:quote.gold});
 assert.equal(city(bought).buildingSites.neighborhood,q.site);
 assert.equal(bought.players[0].capital,s.players[0].capital-quote.gold);
});
import {draftOrder,orderButtons,orderReview} from '../docs/work-orders.js';
test('production cards show both methods, quote and work at risk before an order',()=>{
 let s=cycle(order(fresh(),'produce','neighborhood'));s.players[0].capital=100;
 const c=city(s),o=getProductionOptions(s,c.id,{replace:true}).find(o=>o.item==='granary');
 const draft=draftOrder(c,o,true);
 assert.equal(draft.gold,o.gold);assert.equal(draft.expected,revisionOf(c));
 assert(orderButtons(o,true).includes('Buy with gold'));
 const html=orderReview(draft,c,o,getProjectSites(s,c.id,o.item),key=>key);
 assert(html.includes('Confirm purchase')&&html.includes('Work saved')&&html.includes('data-work-site'));
});
import {siteOrderAllowed} from '../docs/work-orders.js';
test('map selection checks the actual city, matching quote, legal hexes and active seat',()=>{
 const s=fresh(),c=city(s),o=getProductionOptions(s,c.id).find(x=>x.item==='granary'),sites=getProjectSites(s,c.id,o.item);
 const draft={...draftOrder(c,o,false),site:sites[0].id};
 assert(siteOrderAllowed(draft,c,o,sites,true));assert(!siteOrderAllowed(draft,c,o,sites,false));
 assert(!siteOrderAllowed({...draft,site:'-1,-1'},c,o,sites,true));
 assert(!siteOrderAllowed({...draft,expected:999},c,o,sites,true));
});
import {paintWorkSurvey} from '../docs/construction-art.js';
test('map selection contours draw only visible project sites',()=>{
 const drawn=[],ctx=new Proxy({},{get:()=>()=>{},set:()=>true});
 const byId=new Map([['a',{q:2,r:3}],['b',{q:5,r:5}]]);
 paintWorkSurvey(ctx,{byId,workSites:['a','b'],fog:{visible:new Set(['a'])}},1,(q,r)=>drawn.push([q,r]),()=>[0,0]);
 assert.deepEqual(drawn,[[2,3]]);
});
import {paintSiteBar} from '../docs/work-orders.js';
test('map order bar supports a keyboard tile choice, confirmation, cancellation and suited terrain',()=>{
 const s=fresh(),c=city(s),o={item:'ucla',label:'UCLA',enabled:true},sites=[{id:'4,3',name:'City <A>',favored:true}];
 const draft={...draftOrder(c,o,false),site:'4,3',university:true};const bar={dataset:{}};
 paintSiteBar(bar,draft,c,o,sites,true);
 for (const label of ['data-site-list','data-site-confirm','data-site-cancel','Specialty terrain','&lt;A&gt;']) assert(bar.innerHTML.includes(label));
});
import {drawCivicBuilding,drawWorkInProgress} from '../docs/construction-art.js';
test('civic building and construction markers render separately from city flags',()=>{
 const strokes=[];const g=new Proxy({},{get:(_,k)=>(...args)=>strokes.push([k,...args]),set:()=>true});
 for(const id of ['granary','monument','workshop','neighborhood','walls','shipyard'])drawCivicBuilding(g,id,20,20,'#efe');
 drawWorkInProgress(g,10,15);assert.equal(strokes.filter(x=>x[0]==='save').length,7);
 assert(strokes.filter(x=>x[0]==='lineTo').length>60);
});
test('inspectable building and worksite data remains limited to observed ground',()=>{
 let s=fresh();const c=city(s);
 const target=getProjectSites(s,c.id,'granary').find(t=>t.id!==c.tile);
 assert(target);s.players[0].capital=120;
 const quote=getProductionOptions(s,c.id).find(o=>o.item==='granary');
 s=order(s,'buyProduction','granary',{site:target.id,expected:0,gold:quote.gold});
 assert.equal(campaignView(s,0).board[target.id].facility,'granary');
 const opponent=campaignView(s,1);if(!opponent.intel.visible.includes(target.id))assert.equal(opponent.board[target.id].facility,undefined);
});
import {translate} from '../docs/i18n.js';
test('Chinese construction prompts preserve costs, project carryover and placement rules',()=>{
 for(const k of ['Buy with gold','Confirm project change','Work saved if you switch','Choose a highlighted tile on the map.','Confirm site','Gold cost','University wonders require city production.','No deployment tile is available. Move a unit before buying.'])assert.match(translate(k,'zh-CN'),/\p{Script=Han}/u,k);
});
test('old partially built city projects can be resumed, rushed and located without a migration',()=>{
 let s=fresh();const c=city(s);c.queue={item:'workshop',required:13,progress:5};s.players[0].capital=120;
 const o=getProductionOptions(s,c.id,{replace:true}).find(x=>x.item==='workshop');
 assert.equal(o.gold,24);
 s=order(s,'buyProduction','workshop',{expected:0,gold:o.gold});
 assert.equal(city(s).buildingSites.workshop,c.tile);
 assert.equal(s.players[0].capital,96);
});
