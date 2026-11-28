import {festivalBenefit} from './city-festivals.js';

export function councilFestivalIncome(state,seat,resource) {
  if (resource!=='culture' || state.campaignVariety!==1 || (state.intel && state.intel.seat!==seat)) return [];
  const bonuses=[];
  for (const city of state.cities) {
    if (city.seat!==seat) continue;
    const amount=festivalBenefit(state,city)?.culture;
    if (amount) bonuses.push({amount,turns:city.festivalHarvests});
  }
  return bonuses;
}

// The current rate includes all active festivals. Each pays on its last
// harvest; a new building starts paying on the following harvest.
export function incomeHorizon(points,rate,gain=0,construction=0,bonuses=[]) {
  if (points<=0) return 0;
  const permanent=rate-bonuses.reduce((sum,bonus)=>sum+bonus.amount,0);
  const lastChange=bonuses.reduce((last,bonus)=>Math.max(last,bonus.turns),construction);
  let remaining=points;
  for (let turn=1;turn<=lastChange;turn++) {
    let income=permanent+(turn>construction?gain:0);
    for (const bonus of bonuses) if (turn<=bonus.turns) income+=bonus.amount;
    remaining-=income;
    if (remaining<=0) return turn;
  }
  const finalRate=permanent+gain;
  return finalRate>0 ? lastChange+Math.ceil(remaining/finalRate) : null;
}

export function constructionTurns(state,city,points,rate) {
  const amount=festivalBenefit(state,city)?.production;
  return amount ? incomeHorizon(points,rate,0,0,[{amount,turns:city.festivalHarvests}]) : Math.ceil(Math.max(0,points)/Math.max(1,rate));
}
