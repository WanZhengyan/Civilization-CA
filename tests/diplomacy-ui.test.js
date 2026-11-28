import assert from 'node:assert/strict';
import test from 'node:test';
import {publicContacts,ribbonMarkup} from '../docs/diplomacy-ui.js';
const own={seat:0,relation:'self',name:'Host',faction:1};
const rival={seat:1,relation:'rival',name:'Guest',faction:0};
const view={seat:0,state:{players:[own,rival],intel:{seat:0,diplomacy:[own]}}};
test('the ribbon renders only documented contacts; an old server exposes only the local seat',()=>{
  assert.deepEqual(publicContacts(view),[own]);
  const html=ribbonMarkup(publicContacts(view),'zh-CN');
  assert.match(html,/太平洋联盟/);
  assert.doesNotMatch(html,/Guest|加州共和国|republic/);
  assert.equal(publicContacts({seat:0,state:{players:[own,rival]}}).length,1);
});
import {dossierMarkup} from '../docs/diplomacy-ui.js';
const fullView={...view,state:{...view.state,civilizationTraits:1,players:[{...own,influence:6,capital:12}]}};
const stats={cities:2,population:5,capitalIncome:7,influenceIncome:3,units:4};
test('own dossier shows the treasury and real trait; player names are quoted safely',()=>{
 const html=dossierMarkup(fullView,{...own,name:'<Pat>'},stats,'en');
 assert.match(html,/Pacific Exchange/);assert.match(html,/Influence/);assert.match(html,/\+3 \/ turn/);
 assert.match(html,/&lt;Pat&gt;/);assert.doesNotMatch(html,/<Pat>/);
 const historical=dossierMarkup({...fullView,state:{...fullView.state,civilizationTraits:undefined}},own,stats,'zh-CN');
 assert.match(historical,/影响力/);assert.doesNotMatch(historical,/太平洋商会/);
});
test('dossiers use authorized sighting records, bound counts and dated reports without consulting another treasury',()=>{
 const reported={...rival,firstMetRound:2,visibleUnits:1,visibleDistricts:3,knownCities:[{name:'<Quoted city>',tile:'11,7',lastSeenRound:3,visible:false}]};
 const html=dossierMarkup({...view,state:{...view.state,players:[own,{...rival,capital:9999,secret:'a hidden city'}]}},reported,stats,'en');
 assert.match(html,/First contact · round 2/);assert.match(html,/Last seen · round 3/);assert.match(html,/&lt;Quoted city&gt;/);
 assert.doesNotMatch(html,/9999|a hidden city|Gold|Population/);
 const ally=dossierMarkup(view,{...reported,relation:'ally',firstMetRound:null},stats,'zh-CN');
 assert.match(ally,/盟友/);assert.match(ally,/视野内单位/);assert.doesNotMatch(ally,/初次接触/);
});
test('delegations show the current authority quote, waiting reason or authorized report; only rivals have an order',()=>{
 const row={...rival,knownCities:[],delegationOrder:{enabled:true,cost:6,reason:null}};
 const html=dossierMarkup(fullView,row,stats,'en');
 assert.match(html,/Send delegation/);assert.match(html,/6 Influence/);assert.doesNotMatch(html,/data-send-delegation disabled/);
 assert.match(dossierMarkup({...fullView,busy:true},row,stats,'zh-CN'),/data-send-delegation disabled/);
 assert.match(dossierMarkup(fullView,{...row,delegationOrder:{enabled:false,cost:6,reason:'Wait for your turn.'}},stats,'en'),/Wait for your turn/);
 const chinese=dossierMarkup(fullView,{...row,delegation:{era:'modern',cityCount:2,sentRound:3,throughRound:5}},stats,'zh-CN');
 assert.match(chinese,/第 5 轮/);assert.match(chinese,/现代/);assert.match(chinese,/城市总数/);assert.doesNotMatch(chinese,/data-send-delegation/);
 assert.doesNotMatch(dossierMarkup(fullView,{...row,relation:'ally'},stats,'en'),/Send delegation/);
});

test('the unknown marker carries no name, color, count or seat identifier',()=>{
 const html=ribbonMarkup([own],'zh-CN',null,true);
 const hint=html.match(/<span class="delegate-unmet"[^>]*>[\s\S]*?<\/span>/)[0];
 assert.match(hint,/未知文明/);assert.doesNotMatch(hint,/data-contact|太平洋|加州|republic|pacific|arroyo|valley/);
 assert.doesNotMatch(ribbonMarkup([own],'en',null,false),/delegate-unmet/);
});
