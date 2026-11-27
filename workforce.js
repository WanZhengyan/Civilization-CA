// City centers can always employ specialists. A controlled district normally
// gives a stronger return, so access to the surrounding land matters.
export const CITY_FOCUS = {balanced:'Balanced',food:'Food supply',industry:'Industry focus',science:'Science focus'};
const districtOutput = {
  plains:[3,0,0], coast:[2,0,1], hills:[0,3,0],
  forest:[1,2,0], urban:[0,1,2]
};
const centerJobs = [
  ['garden','City garden',[1,0,0]],
  ['yard','City workshop',[0,1,0]],
  ['study','Study hall',[0,0,1]]
];

export function assignWorkforce(city, eligibleTiles, focus = city.focus || 'balanced') {
  const weights = {balanced:[3,2,1],food:[7,1,1],industry:[1,7,1],science:[1,1,7]}[focus];
  const eligible = eligibleTiles.filter(tile=>districtOutput[tile.terrain]).map(tile=>({
    id:tile.id,name:tile.name,terrain:tile.terrain,output:districtOutput[tile.terrain],specialist:false
  }));
  const score = job => job.output.reduce((sum,amount,k)=>sum+amount*weights[k],0);
  const centers=centerJobs.map(([id,name,output])=>({id,name,output,specialist:true}));
  const bestCenter=centers.sort((a,b)=>score(b)-score(a))[0];
  const ranked=[...eligible,bestCenter].sort((a,b)=>score(b)-score(a)||Number(a.specialist)-Number(b.specialist)||a.id.localeCompare(b.id));
  const workedTiles=[];
  for (const job of ranked) {
    if (workedTiles.length>=city.population) break;
    const workers=job.specialist ? city.population-workedTiles.length : 1;
    workedTiles.push({...job,workers});
    if(job.specialist) break;
  }
  const yields={food:0,production:0,science:0};
  for (const job of workedTiles) {
    yields.food+=job.workers*job.output[0];
    yields.production+=job.workers*job.output[1];
    yields.science+=job.workers*job.output[2];
  }
  return {focus,eligibleTiles:eligible,workedTiles,yields};
}
