export function waterKind(tile) {
  if (tile?.terrain!=='ocean') return null;
  return tile.waterway==='river' || tile.waterway==='lake' ? tile.waterway : 'sea';
}

// Follow adjacent water, never an overland bridge link. A private chart can
// restrict the traversal before reading an unknown tile's terrain.
export function waterDistances(start,byId,neighbors,limit=Infinity,charted) {
  const steps=new Map();
  if ((charted && !charted.has(start)) || !waterKind(byId[start])) return steps;
  const queue=[start];steps.set(start,0);
  for(let i=0;i<queue.length;i++) {
    const id=queue[i],distance=steps.get(id);
    if (distance===limit) continue;
    for(const next of neighbors(id)){
      if(steps.has(next) || (charted && !charted.has(next)) || !waterKind(byId[next]))continue;
      steps.set(next,distance+1);queue.push(next);
    }
  }
  return steps;
}
