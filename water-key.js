import {waterCaptions} from './water-chart.js';

export function waterKind(tile) {
  if(tile?.waterway==='river')return 'River channel';
  if(tile?.waterway==='lake')return 'Lake';
  return tile?.terrain==='ocean'?'Sea or bay':null;
}

export function knownCrossings(map,id,explored) {
  return (map.crossings||[]).filter(bridge=>
    (bridge.a===id || bridge.b===id || bridge.via===id) &&
    explored.has(bridge.a) && explored.has(bridge.b) && (!bridge.via || explored.has(bridge.via)));
}

export function chartedWaterSites(map,explored) {
  if(!map.waterways)return [];
  const ids=[...map.waterways.lake,...map.waterways.river].filter(id=>explored.has(id));
  const named=waterCaptions(ids.map(id=>map.byId[id]).filter(Boolean));
  const seen=new Set(),sites=[];
  for(const {name,tile} of named){
    if(seen.has(name))continue;
    seen.add(name);sites.push({name,id:tile.id,kind:tile.waterway});
  }
  for(const crossing of map.crossings||[]){
    if(!crossing.waterway || !explored.has(crossing.a) || !explored.has(crossing.b) || !explored.has(crossing.via))continue;
    sites.push({name:crossing.name,id:crossing.via,kind:'bridge'});
  }
  return sites;
}

const symbols={
  river:'<path d="M1 11C7 11 7 3 14 4s9-1 12-2" fill="none" stroke="#74c7bc" stroke-width="4"/><path d="M3 11c4-.7 6-6 10-6" fill="none" stroke="#c4e4d8"/>',
  lake:'<path d="M2 8c0-3 5-6 9-5s5-2 10 0 4 6 0 8-5 1-10 2-9-1-9-5Z" fill="#6299af" stroke="#afcdd2"/><path d="M8 7h5m2 2h5" stroke="#d1e5e9"/>',
  sea:'<path d="M1 6q3-3 6 0t6 0 6 0 6 0M1 10q3-3 6 0t6 0 6 0 6 0" stroke="#8abbbd" stroke-width="1.6" fill="none"/>',
  bridge:'<path d="m3 12 20-8m-21 5 20-8" stroke="#d7c7a5" stroke-width="2"/><path d="m5 5 3 8m10-14 3 8" stroke="#b59b77" stroke-width="2"/>'
};
function mark(kind){return '<svg aria-hidden="true" width="27" height="15" viewBox="0 0 27 15">'+symbols[kind]+'</svg>';}

export function mountWaterKey(menu,select) {
  const details=document.createElement('details');
  details.className='water-map-key';
  const summary=document.createElement('summary');
  summary.textContent='Waterway chart';details.append(summary);
  const swatches=document.createElement('div');swatches.className='water-swatches';
  for(const [kind,label] of [['river','River channel'],['lake','Lake'],['sea','Sea or bay'],['bridge','Bridge']]){
    const entry=document.createElement('span');entry.innerHTML=mark(kind);entry.append(label);swatches.append(entry);
  }
  const note=document.createElement('p');note.textContent='Ships travel along connected water. Land units cross between bridgeheads.';
  const sites=document.createElement('div');sites.className='charted-water-sites';
  details.append(swatches,note,sites);menu.append(details);
  sites.onclick=e=>{const button=e.target.closest('button');if(button)select(button.dataset.waterSite);};
  let previous;
  return (map,explored)=>{
    details.hidden=!map.waterways;
    if(details.hidden)return;
    const available=chartedWaterSites(map,explored),signature=JSON.stringify(available);
    if(signature===previous)return;
    previous=signature;sites.replaceChildren();
    if(!available.length){const empty=document.createElement('p');empty.textContent='Explore inland water to chart its name and crossings.';sites.append(empty);return;}
    const heading=document.createElement('small');heading.textContent='Locate on map';sites.append(heading);
    for(const {id,name,kind} of available) {
      const button=document.createElement('button');button.type='button';button.dataset.waterSite=id;
      button.innerHTML=mark(kind);
      const label=document.createElement('span');label.textContent=name;button.append(label);
      sites.append(button);
    }
  };
}
