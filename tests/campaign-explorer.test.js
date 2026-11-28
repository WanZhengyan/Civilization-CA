import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, campaignView, applyAction} from '../docs/rules.js';
import {explorerRows} from '../docs/campaign-explorer.js';
const start=()=>createGame([{name:'Explorer',civilization:'arroyo'}],'la',{practice:true,seed:624101});
function view(s){return {seat:0,state:campaignView(s,0)};}
function capital(){const s=start();return applyAction(s,0,{type:'found',unit:s.units[0].id});}
test('the place index contains only personally charted tiles and rejects an unprojected or mismatched seat',()=>{
 const s=start(),v=view(s),rows=explorerRows(v);
 assert.deepEqual(new Set(rows.map(r=>r.id)),new Set(v.state.intel.explored));
 assert.equal(explorerRows({state:s,seat:0}).length,0);
 assert.equal(explorerRows({state:v.state,seat:1}).length,0);
});

test('resource inventory pairs charted deposits with their proper works and omits unsurveyed ground',()=>{
 const v=view(capital()),id=v.state.intel.visible[0];
 v.state.board[id].resource='iron';
 const row=explorerRows(v,'deposits').find(r=>r.id===id);
 assert.match(row.info,/Iron ore.*Mine/i);
 v.state.board[id].resource=undefined;
 assert.ok(!explorerRows(v,'deposits').some(r=>r.id===id));
});

test('settlement comparisons use a real settler and disappear once it founds a city',()=>{
 const s=start(),v=view(s),sites=explorerRows(v,'founding');
 assert.ok(sites.some(r=>r.id===s.units[0].tile && /this turn/.test(r.info)));
 assert.ok(sites.every(r=>v.state.intel.explored.includes(r.id)));
 assert.equal(explorerRows(view(capital()),'founding').length,0);
});

test('the frontier index lists only visible bordering land with the current authority price',()=>{
 const s=capital(),options=explorerRows(view(s),'borders');
 assert.ok(options.length);
 assert.match(options[0].info,/4 gold/);
 const chosen=options.find(r=>r.info.startsWith('Claim'));
 assert.equal(applyAction(s,0,{type:'claim',tile:chosen.id}).board[chosen.id].owner,0);
});

test('the work crew directory respects the owning seat and remaining charges',()=>{
 const s=capital(),v=view(s),id=v.state.cities[0].tile;
 v.state.units.push({id:'crew',seat:0,tile:id,type:'builder',charges:2});
 v.state.intel.workSites={crew:{[id]:'farm'}};
 assert.match(explorerRows(v,'crews')[0].info,/Farm.*2 charges/);
 v.state.units.at(-1).charges=0;assert.equal(explorerRows(v,'crews').length,0);
});
