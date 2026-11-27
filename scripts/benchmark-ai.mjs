// Paired two-seat campaigns. Swapping policies keeps the seed, start hexes and factions fixed.
// node scripts/benchmark-ai.mjs --pairs=hard:normal,normal:easy --seeds=17,63,417005
// Use --rules=/absolute/path/to/docs/rules.js for an archived engine, and --details for traces.
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { values } = parseArgs({ options: {
  maps: { type: 'string', default: 'la,sf,sd' },
  sizes: { type: 'string', default: 'standard,large' },
  seeds: { type: 'string', default: '17,63,417005' },
  pairs: { type: 'string', default: 'hard:normal,normal:easy' },
  rules: { type: 'string' },
  details: { type: 'boolean', default: false }
} });

function choices(list, valid) {
  const entries=list.split(',');
  if (entries.some(v=>!valid.includes(v)) || new Set(entries).size!==entries.length)
    throw new Error('Expected distinct entries from '+valid.join(', '));
  return entries;
}
const maps=choices(values.maps,['la','sf','sd']);
const sizes=choices(values.sizes,['standard','large']);
const levels=['easy','normal','hard'];
const seeds=values.seeds.split(',').map(s=>{
  if (!/^\d+$/.test(s) || !Number.isSafeInteger(+s) || +s>0xffffffff) throw new Error('Expected an unsigned 32-bit seed.');
  return +s;
});
if(new Set(seeds).size!==seeds.length)throw new Error('Seeds must be distinct.');
const pairs=values.pairs.split(',').map(p=>{
  const pair=p.split(':');
  if(pair.length!==2 || pair.some(v=>!levels.includes(v)))throw new Error('Expected two difficulties per pair.');
  return pair;
});
const moduleUrl=values.rules?pathToFileURL(resolve(values.rules)):new URL('../docs/rules.js',import.meta.url);
const {createGame,chooseBotAction,applyAction}=await import(moduleUrl);

function experiment(map,size,seed,pair,firstSeat,latency){
  let state=createGame([{bot:true},{bot:true}],map,{mapSize:size,seed});
  const orders=[{},{}],captures=[0,0],settlersQueued=[0,0];
  const startTiles=state.units.map(u=>u.tile);
  const hash=createHash('sha256');
  let steps=0;
  while(state.phase==='playing'){
    if(++steps>10000)throw new Error('Campaign exceeded 10,000 decisions for '+[map,size,seed,pair,firstSeat]);
    const seat=state.turn, side=seat===firstSeat?0:1;
    const start=performance.now();
    const action=chooseBotAction(state,pair[side]);
    latency[side].push(performance.now()-start);
    orders[side][action.type]=(orders[side][action.type]||0)+1;
    if(action.type==='produce' && action.item==='settler') settlersQueued[side]++;
    const target=action.type==='attack'&&state.cities.find(c=>c.tile===action.tile);
    try {
      state=applyAction(state,seat,action);
    } catch (cause) {
      const context={map,size,seed,pair,firstSeat,seat,round:state.round,step:steps,action};
      throw new Error('Rejected benchmark order '+JSON.stringify(context),{cause});
    }
    if(target && state.cities.find(c=>c.id===target.id)?.seat===seat)captures[side]++;
    hash.update(JSON.stringify(action)+'\n');
  }
  if(!state.winners.length)throw new Error('A two-seat contest ended without a winner.');
  return {map,size,seed,firstSeat,startTiles,round:state.round,reason:state.victoryReason,
    result:state.winners.length>1?'D':state.winners[0]===firstSeat?'W':'L',
    scores:[state.players[firstSeat].score,state.players[1-firstSeat].score],
    orders,captures,settlersQueued,
    unusedSettlers:[firstSeat,1-firstSeat].map(seat=>state.units.filter(u=>u.seat===seat && u.type==='settler').length),
    actionHash:hash.digest('hex')};
}

function tally(games){
  const count=outcome=>games.filter(g=>g.result===outcome).length;
  return {W:count('W'),D:count('D'),L:count('L')};
}
function summarize(orders,i){
  const counts={};
  for(const row of orders)for(const [k,n] of Object.entries(row.orders[i]))counts[k]=(counts[k]||0)+n;
  return {orders:counts,captures:orders.reduce((s,g)=>s+g.captures[i],0),
    settlersQueued:orders.reduce((s,g)=>s+g.settlersQueued[i],0),
    unusedSettlers:orders.reduce((s,g)=>s+g.unusedSettlers[i],0)};
}
const reports=[];
for(const pair of pairs){
  const games=[],latency=[[],[]],matching={},bySize={};
  const pairedOpenings={twoWins:0,oneWinOneLoss:0,twoLosses:0,involvingDraw:0};
  for(const map of maps) {
    for(const size of sizes) {
      const group=[];
      for(const seed of seeds) {
        const swapped=[0,1].map(firstSeat=>experiment(map,size,seed,pair,firstSeat,latency));
        const result=tally(swapped);
        if (result.D) pairedOpenings.involvingDraw++;
        else if (result.W===2) pairedOpenings.twoWins++;
        else if (result.L===2) pairedOpenings.twoLosses++;
        else pairedOpenings.oneWinOneLoss++;
        group.push(...swapped);
      }
      matching[map+'/'+size]=tally(group);
      games.push(...group);
    }
  }
  for(const size of sizes)bySize[size]=tally(games.filter(g=>g.size===size));
  const decisions=latency.map(samples=>{
    samples.sort((a,b)=>a-b);
    const msAt=p=>Math.round(samples[Math.ceil(samples.length*p)-1]*1000)/1000;
    return {count:samples.length,p50ms:msAt(.5),p95ms:msAt(.95)};
  });
  reports.push({pair,games:games.length,...tally(games),firstPolicyAsSeat0:tally(games.filter(g=>g.firstSeat===0)),
    firstPolicyAsSeat1:tally(games.filter(g=>g.firstSeat===1)),byMapSize:matching,bySize,pairedOpenings,
    meanRounds:Math.round(games.reduce((n,g)=>n+g.round,0)*100/games.length)/100,
    meanScoreMargin:Math.round(games.reduce((n,g)=>n+g.scores[0]-g.scores[1],0)*100/games.length)/100,
    decisions,behavior:[summarize(games,0),summarize(games,1)],
    ...(values.details?{records:games}:{})});
}
console.log(JSON.stringify({seeds,maps,sizes,reports},null,2));
