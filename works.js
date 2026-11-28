// A city's production revision identifies the exact order shown by its menu.
export function revisionOf(city) { return city.productionRevision || 0; }
export function advanceProduction(city) { city.productionRevision=revisionOf(city)+1; }
export function verifyProduction(city, expected) {
  if (expected!==revisionOf(city)) throw new Error('Production changed. Review the current city order.');
}

export function parkedProduction(city,item) { return city.parkedProduction?.[item] || 0; }
export function parkProject(city) {
  const q=city.queue;
  if (q?.progress) city.parkedProduction={...city.parkedProduction,[q.item]:q.progress};
}
export function resumeWork(city,item) {
  const progress=parkedProduction(city,item);
  if (progress) {
    const stored={...city.parkedProduction};
    delete stored[item];
    city.parkedProduction=stored;
  }
  return progress;
}

export function purchasePrice(city,item,required) {
  const work=city.queue?.item===item ? city.queue.progress : parkedProduction(city,item);
  return 3 * Math.max(0,required-work);
}
