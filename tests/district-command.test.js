import assert from 'node:assert/strict';
import test from 'node:test';
import {cityKind,developmentPanel,developmentReceipt,foundingLabel} from '../docs/district-command.js';
import {createGame,applyAction,campaignView,getDevelopmentPreview,getMap,getStats} from '../docs/rules.js';

test('city labels distinguish the founder, the current controller, ordinary cities and unseen former capitals',()=>{
  for(const seat of [0,1]) {
    assert.equal(cityKind({seat,originalSeat:seat},seat),'Your capital city');
    assert.equal(cityKind({seat,originalSeat:seat},1-seat),'Rival capital city');
    assert.equal(cityKind({seat,originalSeat:1-seat},seat),'Captured original capital');
    assert.equal(cityKind({seat,originalSeat:null},seat),'Your city');
    assert.equal(cityKind({seat},1-seat),'Rival city');
  }
  const teamGame={players:[{}, {}, {}],teams:[1,2,1]};
  assert.equal(cityKind({seat:2,originalSeat:2},0,teamGame),'Allied capital city');
  assert.equal(cityKind({seat:2},0,teamGame),'Allied city');
  assert.equal(cityKind({seat:1},0,teamGame),'Rival city');
  const fresh={opening:'settlers',cities:[],log:[{type:'start'}]};
  assert.equal(foundingLabel(fresh,0),'Found capital');
  assert.equal(foundingLabel({...fresh,intel:{hasFoundedCapital:true}},0),'Found city');
  assert.equal(foundingLabel({...fresh,log:[...fresh.log,{type:'found',seat:0}]},0),'Found city');
  assert.equal(foundingLabel({...fresh,log:[{type:'end',seat:0}]},0),'Found city');
});

test('the district panel gives exact results, recognizes the cap and confirms each accepted order only once',()=>{
  let game=createGame(['Host','Peer'],'la',{seed:417005});
  game=applyAction(game,0,{type:'found',unit:game.units[0].id});
  const tile=game.cities[0].tile, map=getMap(game);
  game.players[0].capital=100;
  game.board[tile].level=0;
  let projected=campaignView(game,0);
  for(const level of [0,1]){
    const previous=projected;
    const preview=getDevelopmentPreview(previous,0,tile);
    const panel=developmentPanel(preview,getStats(previous,0));
    game=applyAction(game,0,{type:'develop',tile});
    projected=campaignView(game,0);
    const before=getStats(previous,0),after=getStats(projected,0);
    assert.ok(panel.includes(level+' → '+(level+1)));
    for(const [label,key] of [['Capital per turn','capitalIncome'],['Influence per turn','influenceIncome'],['Civic points','score']]) {
      assert.ok(panel.includes(label+'</dt><dd>'+before[key]+' → <strong>'+after[key]+'</strong>'));
    }
    const receipt=developmentReceipt(previous,projected,0,map);
    assert.deepEqual(receipt.slice(0,3),['District developed',map.byId[tile].name,level+' → '+(level+1)]);
    assert.ok(receipt.some(part=>Array.isArray(part) && part.join(' ')==='Civic points +1'));
    assert.ok(receipt.some(part=>Array.isArray(part) && ['Capital per turn +1','Influence per turn +1'].includes(part.join(' '))));
    assert.equal(developmentReceipt(projected,projected,0,map),null);
    assert.equal(developmentReceipt(projected,structuredClone(projected),0,map),null);
    assert.equal(developmentReceipt(previous,projected,1,map),null);
    const fogged=structuredClone(projected);
    fogged.board[tile]={owner:null,level:0};
    fogged.intel.visible=fogged.intel.visible.filter(id=>id!==tile);
    assert.deepEqual(developmentReceipt(previous,fogged,0,map),receipt.slice(0,2));
    const coalesced=structuredClone(projected);
    coalesced.log.push({type:'end',seat:0});
    assert.deepEqual(developmentReceipt(previous,coalesced,0,map),receipt.slice(0,3));
  }
  assert.match(developmentPanel(null),/Maximum district level/);
  assert.doesNotMatch(developmentPanel(null),/→|data-order/);
});
