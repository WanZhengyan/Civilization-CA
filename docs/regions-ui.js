import {CAMPAIGN_MAPS, getMap} from './rules.js';

// Terrain strips make the actual scenario coastline visible before the first turn.
function thumbnail(map) {
  const colors = {ocean:'#367989',coast:'#dbc88a',urban:'#c5a680',plains:'#9cab7e',hills:'#849479',forest:'#60806c',mountains:'#868679'};
  const rows = Array.from({length:13}, (_,r) => {
    const tiles = map.tiles.slice(r*17,r*17+17);
    const runs = [];
    for (const tile of tiles) {
      if (runs.at(-1)?.terrain === tile.terrain) runs.at(-1).length++;
      else runs.push({terrain:tile.terrain,length:1});
    }
    return '<span>'+runs.map(run=>'<i style="flex:'+run.length+';background:'+colors[run.terrain]+'"></i>').join('')+'</span>';
  });
  return '<span class="region-chart" aria-hidden="true">'+rows.join('')+'</span>';
}

export function mapPicker(selected,disabled=false) {
  return '<fieldset class="region-picker"><legend>Campaign map</legend>'+CAMPAIGN_MAPS.map(choice=>{
    const active=choice.id===selected;
    return '<label class="region-choice"><input type="radio" name="mapId" value="'+choice.id+'" '+(active?'checked ':'')+(disabled?'disabled':'')+'>'+thumbnail(getMap(choice.id))+
      '<span class="region-details"><strong>'+choice.shortName+'</strong><small>'+choice.description+'</small></span></label>';
  }).join('')+'</fieldset>';
}

export function installMapStyles() {
  if (document.querySelector('link[data-region-styles]')) return;
  const link=document.createElement('link');
  link.setAttribute('rel','stylesheet');
  link.setAttribute('data-region-styles','');
  link.href=new URL('./regions.css',import.meta.url).href;
  document.head.appendChild(link);
}
