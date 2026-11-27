import {CAMPAIGN_MAPS, getMap} from './rules.js';
import {chartPerimeter} from './hex-survey.js';

const chartCache = new WeakMap();
const terrainInks = {
  ocean:'#3b7888', coast:'#e1cb87', urban:'#c49870', plains:'#a9b684',
  hills:'#869675', forest:'#567e65', mountains:'#909498'
};

function outline(rings) {
  return rings.map(ring=>'M'+ring.map(([x,y])=>x+','+y).join('L')+'Z').join('');
}

// Use the same public coastline and tile boundary as the board. None of the
// players, claims, resources or exploration records are needed for this plate.
export function regionThumbnail(map) {
  if (chartCache.has(map)) return chartCache.get(map);
  const rim = chartPerimeter(map.tiles);
  const corners = rim.flat();
  const xs = corners.map(([x])=>x), ys = corners.map(([,y])=>y);
  const left = Math.min(...xs), right = Math.max(...xs);
  const top = Math.min(...ys), bottom = Math.max(...ys);
  const pad = (right-left)*.045;
  const extent = [left-pad, top-pad, right-left+2*pad, bottom-top+2*pad].join(' ');
  const fills = Object.entries(terrainInks).map(([terrain,ink])=>{
    const ground = map.tiles.filter(tile=>tile.terrain===terrain);
    if (!ground.length) return '';
    return '<path d="'+outline(chartPerimeter(ground))+'" fill="'+ink+'" stroke="'+ink+'" stroke-width="2" fill-rule="evenodd"/>';
  }).join('');
  const svg = '<svg class="region-chart" aria-hidden="true" focusable="false" viewBox="'+extent+
    '" xmlns="http://www.w3.org/2000/svg">'+fills+'<path class="region-rim" d="'+outline(rim)+
    '" fill="none" stroke="#e8d4a4" vector-effect="non-scaling-stroke" stroke-width="1.25" stroke-linejoin="round"/></svg>';
  chartCache.set(map,svg);
  return svg;
}

export function mapPicker(selected,disabled=false) {
  return '<fieldset class="region-picker"><legend>Campaign map</legend>'+CAMPAIGN_MAPS.map(choice=>{
    const active=choice.id===selected;
    return '<label class="region-choice"><input type="radio" name="mapId" value="'+choice.id+'" '+(active?'checked ':'')+(disabled?'disabled':'')+'>'+regionThumbnail(getMap(choice.id))+
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
