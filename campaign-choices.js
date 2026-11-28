import {CIVILIZATIONS} from './civilizations.js';
import {victoryModes} from './victory-rules.js';

export const modeLabels={standard:'Standard victory',conquest:'Conquest victory',science:'Science victory'};
export const modeDetails={
  standard:'Win by conquest or launch the Orbital Survey.',
  conquest:'Control every original capital or be the last surviving side.',
  science:'Research Rocketry, then complete the Orbital Survey in one city.'
};
export const validCivilization=value=>value==='random'||CIVILIZATIONS.some(c=>c.id===value);

export function modePicker(name,selected,practice=false,disabled=false) {
  const options=victoryModes.map(id=>'<label><input type="radio" name="'+name+'" value="'+id+'"'+(id===selected?' checked':'')+(disabled||(practice&&id==='conquest')?' disabled':'')+'><strong>'+modeLabels[id]+'</strong><small>'+
    (practice&&id==='conquest'?'Conquest requires a rival.':practice&&id==='standard'?modeDetails.science:modeDetails[id])+'</small></label>');
  return '<fieldset class="setup-setting solo-options victory-modes"><legend>Victory conditions</legend><div>'+options.join('')+'</div></fieldset>';
}

export function civilizationName(id) {
  return CIVILIZATIONS.find(c=>c.id===id)?.name || 'Random civilization';
}

export function traitLine(civ) {
  return civ?'<p class="trait-note"><strong>'+civ.traitName+'</strong> · <span>'+civ.description+'</span></p>':'';
}

export function civilizationPicker(name,selected='random',used=[],disabled=false) {
  const options=[{id:'random',name:'Random civilization'},...CIVILIZATIONS].map(c=>
    '<option value="'+c.id+'"'+(c.id===selected?' selected':'')+(c.id!=='random'&&used.includes(c.id)&&c.id!==selected?' disabled':'')+'>'+c.name+'</option>');
  return '<div class="civilization-choice"><label class="room-select"><span>Civilization</span><select name="'+name+'"'+(disabled?' disabled':'')+'>'+options.join('')+'</select></label>'+
    traitLine(CIVILIZATIONS.find(c=>c.id===selected))+'</div>';
}

export function compareCivilizations() {
  return '<details class="room-difficulty-guide civilization-guide"><summary>Compare civilization traits</summary>'+
    '<p>Each civilization is unique in a campaign. Random draws from the civilizations still available.</p>'+
    CIVILIZATIONS.map(c=>'<section><h4>'+c.name+'</h4>'+traitLine(c)+'</section>').join('')+'</details>';
}
