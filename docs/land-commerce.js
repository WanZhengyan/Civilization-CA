// Wagon roads follow charted land. Unseen hexes cannot shorten the journey.
export function tradeCorridors(state,seat,originId,map,explored) {
  const cities=state.cities.filter(c=>c.seat===seat);
  const origin=cities.find(c=>c.id===originId);
  if (!origin || cities.length<2) return [];
  const parents=new Map([[origin.tile,null]]), queue=[origin.tile];
  for (let i=0;i<queue.length;i++) {
    for (const id of map.neighbors(queue[i])) {
      if (parents.has(id) || !explored.has(id)) continue;
      const tile=map.byId[id];
      if (!tile || ['mountains','ocean'].includes(tile.terrain)) continue;
      parents.set(id,queue[i]);queue.push(id);
    }
  }
  return cities.filter(c=>c.id!==originId && parents.has(c.tile)).map(city=>{
    const path=[];
    for (let id=city.tile;id!=null;id=parents.get(id)) path.push(id);
    path.reverse();
    const steps=path.length-1;
    return {origin:origin.id,destination:city.id,path,steps,turns:Math.max(1,Math.ceil(steps/3))};
  }).sort((a,b)=>a.turns-b.turns || a.steps-b.steps || a.destination.localeCompare(b.destination));
}
