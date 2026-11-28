import {CAMPAIGN_SIZES,DEFAULT_MAP_SIZE} from './maps.js';
import {CAMPAIGN_MAPS, SCORE_TARGETS, TARGET_SCORE, getMap} from './rules.js';
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

export function mapPicker(selected,disabled=false,mapSize=DEFAULT_MAP_SIZE) {
  return '<fieldset class="region-picker"><legend>Campaign map</legend>'+CAMPAIGN_MAPS.map(choice=>{
    const active=choice.id===selected;
    return '<label class="region-choice"><input type="radio" name="mapId" value="'+choice.id+'" '+(active?'checked ':'')+(disabled?'disabled':'')+'>'+regionThumbnail(getMap(choice.id,mapSize))+
      '<span class="region-details"><strong>'+choice.shortName+'</strong><small>'+choice.description+'</small></span></label>';
  }).join('')+'</fieldset>';
}

export function sizeName(mapSize) {
  return ({standard:'Classic',large:'Large',grand:'Grand',epic:'Epic'})[mapSize||'standard']||'Classic';
}

export function sizePicker(mapId,selected=DEFAULT_MAP_SIZE,disabled=false) {
  const choices = CAMPAIGN_SIZES.map(size=>{
    const count = getMap(mapId,size).tiles.length;
    return `<label><input type="radio" name="mapSize" value="${size}"${size===selected?' checked':''}${disabled?' disabled':''}>
      <span><strong>${sizeName(size)}</strong><small>${count} <span>playable hexes</span></small></span></label>`;
  });
  return '<fieldset class="setup-setting size-options"><legend>Map size</legend><div>'+choices.join('')+'</div></fieldset>';
}

function soloOption(name, value, selected, title, detail, describedBy) {
  return `<label><input type="radio" name="${name}" value="${value}"${value===selected?' checked':''}${describedBy?' aria-describedby="'+describedBy+'"':''}>
    <strong>${title}</strong><small>${detail}</small></label>`;
}

export function rivalPicker(selected=3) {
  const choices = [0,1,2,3].map(count => {
    if (count===0) return soloOption('rivals',0,selected,'0 rivals','Solo practice','solo-practice-note');
    return soloOption('rivals',count,selected,count===1?'1 rival':count+' rivals',(count+1)+' civilizations total');
  });
  return '<fieldset class="setup-setting solo-options solo-rivals"><legend>Computer opponents</legend><div>'+choices.join('')+
    '</div><p id="solo-practice-note">In practice, neutral camps remain on the map. Complete the Orbital Survey to win.</p></fieldset>';
}

export function victoryPicker(scoreTarget=TARGET_SCORE) {
  const lengths = {100:'Short',125:'Standard',150:'Long'};
  const choices = SCORE_TARGETS.map(target=>soloOption('scoreTarget',target,scoreTarget,lengths[target],target+' civic points'));
  return '<fieldset class="setup-setting solo-options"><legend>Victory target</legend><div>'+choices.join('')+'</div></fieldset>';
}

export function installMapStyles() {
  if (document.querySelector('link[data-region-styles]')) return;
  const link=document.createElement('link');
  link.setAttribute('rel','stylesheet');
  link.setAttribute('data-region-styles','');
  link.href=new URL('./regions.css',import.meta.url).href;
  document.head.appendChild(link);
}
