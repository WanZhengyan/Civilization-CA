// Fifty reproducible practice openings exercise the same menu and orders as a human player.
import assert from 'node:assert/strict';
import {
  BUILDINGS, applyAction, createGame, getProductionOptions, getResearchOptions
} from '../docs/rules.js';
import {councilCourse} from '../docs/council-path.js';
import {revisionOf} from '../docs/works.js';

const projects=['shop','academy','grainMill','foundry','printingHouse'];
const regions=['la','sf','sd'];
const civilizations=['republic','pacific','valley','arroyo'];

function play(index) {
  const item=projects[index % projects.length];
  const map=regions[index % regions.length], seed=624101+index;
  const civilization=civilizations[index % civilizations.length];
  const purchase=Math.floor(index/projects.length)%2===1;
  let state=createGame([{name:'City planner',civilization}],map,{seed,practice:true,victoryMode:'science'});
  const act=action=>{state=applyAction(state,0,action)};
  act({type:'found',unit:state.units[0].id});
  const id=state.cities[0].id, city=()=>state.cities[0];
  const options=()=>getProductionOptions(state,id,{replace:true});
  assert.equal(city().population,1);
  assert.equal(options().find(o=>o.item==='settler').enabled,false);
  assert.ok(!options().some(o=>['workshop','walls',...projects].includes(o.item)));
  assert.throws(()=>act({type:'develop',tile:city().tile}));
  act({type:'focus',city:id,item:'food'});
  act({type:'produce',city:id,item:'scout'});

  const target=BUILDINGS[item].tech;
  const route=councilCourse(getResearchOptions(state,0),target,0).steps.map(s=>s.item);
  let eligibilityRound,settlerRound,unlockedRound,completedRound;
  while(state.round<=160 && state.phase==='playing') {
    const player=state.players[0];
    if(!player.research) {
      const next=route.find(key=>!player.technologies.includes(key));
      if(next)act({type:'research',item:next});
    }
    const unlocked=state.players[0].technologies.includes(target);
    if(unlocked)unlockedRound??=state.round;
    else assert.ok(!options().some(o=>o.item===item));
    if(city().population>=3)eligibilityRound??=state.round;
    if(!city().queue) {
      const choices=options();
      if(!settlerRound && city().population>=3) {
        assert.ok(choices.find(o=>o.item==='settler')?.enabled);
        act({type:'produce',city:id,item:'settler'});
      } else if(item==='foundry' && !city().buildings.includes('workshop') && choices.find(o=>o.item==='workshop')?.enabled) {
        act({type:'produce',city:id,item:'workshop'});
      } else if(!city().buildings.includes(item)) {
        const quote=choices.find(o=>o.item===item);
        if(quote?.enabled && (!purchase || quote.buyEnabled)) {
          if(purchase)act({type:'buyProduction',city:id,item,site:city().tile,gold:quote.gold,expected:revisionOf(city())});
          else act({type:'produce',city:id,item,site:city().tile});
        }
      }
    }
    if(city().buildings.includes(item))completedRound??=state.round;
    if(completedRound && settlerRound)break;
    const before=city();
    act({type:'end'});
    if(before.queue?.item==='settler' && !city().queue) {
      assert.ok(state.units.some(u=>u.type==='settler'));
      // Initial housing caps the city at 3. One inhabitant moves out on completion.
      assert.equal(before.population,3);
      assert.equal(city().population,2);
      settlerRound=state.round;
    }
  }
  assert.ok(eligibilityRound && unlockedRound && settlerRound && completedRound,
    JSON.stringify({map,seed,item,round:state.round,population:city().population,eligibilityRound,unlockedRound,settlerRound,completedRound}));
  assert.ok(state.units.some(u=>u.type==='scout'));
  return {map,seed,civilization,item,method:purchase?'gold':'production',eligibilityRound,settlerRound,unlockedRound,completedRound};
}

const results=Array.from({length:50},(_,i)=>play(i));
console.log(JSON.stringify({campaigns:results.length,results},null,2));
