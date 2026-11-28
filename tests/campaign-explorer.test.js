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
