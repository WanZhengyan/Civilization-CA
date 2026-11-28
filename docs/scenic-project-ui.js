import {SCENIC_WORKS,getScenicWorkStatus} from './scenic-works.js';
import {NATURAL_WONDERS} from './natural-wonders.js';
import {CIVICS,TECHS,councilTree} from './progression.js';
import {safe} from './city-profile-format.js';

const byLandmark=Object.fromEntries(Object.entries(SCENIC_WORKS).map(([id,work])=>[work.landmark,id]));

export const scenicSiteHint='Choose an empty owned land tile beside this landmark and within two hexes of the city.';

export function scenicProjectFor(state,landmark) {
  const id=byLandmark[landmark], work=SCENIC_WORKS[id];
  if (!work || !state?.naturalWonderVersion) return null;
  const tree=councilTree(state,work.tech?'research':'civic');
  return Object.hasOwn(tree,work.tech || work.civic)?id:null;
}

export function scenicGate(item) {
  const work=SCENIC_WORKS[item];
  const gate=work.tech ? TECHS[work.tech] : CIVICS[work.civic];
  return '<span>'+(work.tech?'Technology':'Civics')+'</span> · <span>'+safe(gate.name)+'</span>';
}

export function scenicLandmark(item) {
  return '<span>Beside</span> · <span>'+safe(NATURAL_WONDERS[SCENIC_WORKS[item].landmark].name)+'</span>';
}

export function scenicProjectDetails(state,item) {
  if (!item) return '';
  const work=SCENIC_WORKS[item], status=getScenicWorkStatus(state,item);
  const statusText=status==='complete'?'Completed':status==='commissioned'?'Under construction':'';
  return '<div class="scenic-project"><small>Natural wonder project</small><strong>'+safe(work.name)+'</strong>'+
    '<small>'+scenicGate(item)+' · <span>'+work.required+' production</span></small>'+
    '<small>'+safe(work.description)+'</small>'+(statusText?'<small class="scenic-status">'+statusText+'</small>':'')+'</div>';
}
