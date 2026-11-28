import {AI_LEVELS} from './ai-levels.js';
import {teamLabel} from './teams.js';
import {civilizationPicker,compareCivilizations,validCivilization} from './campaign-choices.js';
export {teamLabel};
const levels=Object.fromEntries(AI_LEVELS.map(id=>[id,id[0].toUpperCase()+id.slice(1)]));
export const difficultyNotes={
  easy:'Easy develops home districts first and patrols within three hexes of its cities.',
  normal:'Normal balances scouting, growth and production, and compares targets for each unit.',
  hard:'Hard expands earlier and compares attacks across its units before committing one.'
};
const presetLabels={
  open:'Open lobby for 2–4 people',duel:'You vs. computer',coop:'Two friends vs. two computers',
  free:'Four-way free-for-all',custom:'Custom seats'
};
export const difficultyLabel=id=>levels[id] || levels.normal;
const human=team=>({kind:'human',team});
const bot=team=>({kind:'bot',team,difficulty:'normal'});

// The live builder provisions a human host and an invitation for a second player.
export function newRoomSetup(count=2) {
  if (!Number.isInteger(count) || count<2 || count>4) throw new RangeError('Choose two to four seats.');
  return {preset:'custom', seats:Array.from({length:count},(_,seat)=>human(seat))};
}

// Continue to read configurations from the previous setup interface.
export function roomPreset(preset) {
  switch(preset){
    case 'open': return {preset,seats:[]};
    case 'coop': return {preset,seats:[human(0),bot(1),human(0),bot(1)]};
    case 'free': return {preset,seats:[human(0),human(1),bot(2),bot(3)]};
    default: return {preset,seats:[human(0),bot(1)]};
  }
}

export function changeRoomSetup(config,name,value) {
  if(name==='roomPreset' && Object.hasOwn(presetLabels,value)) {
    return value==='custom' && config.seats.length ? {...config,preset:'custom'} : roomPreset(value);
  }
  const seats=config.seats.map(s=>({...s}));
  if(name==='roomSeatCount' && ['2','3','4'].includes(value)){
    while(seats.length<Number(value)) seats.push(human(seats.length));
    seats.length=Number(value);
  }else{
    const match=/^seat-(kind|team|difficulty|civilization)-([0-3])$/.exec(name);
    if(!match)return null;
    const [,field,index]=match, seat=seats[index];
    if(!seat)return null;
    if(field==='kind' && index!=='0' && ['human','bot'].includes(value)) seats[index]=value==='human' ? human(seat.team) : bot(seat.team);
    else if(field==='team' && /^[0-3]$/.test(value)) seat.team=Number(value);
    else if(field==='difficulty' && seat.kind==='bot' && Object.hasOwn(levels,value)) seat.difficulty=value;
    else if(field==='civilization' && (index==='0' || seat.kind==='bot') && validCivilization(value)
      && (value==='random' || !seats.some((other,i)=>i!==Number(index) && other.civilization===value))) seat.civilization=value;
    else return null;
  }
  return {preset:'custom',seats};
}

export function validRoomTeams(config) {
  return !config.seats.length || new Set(config.seats.map(seat=>seat.team)).size>=2;
}

function select(name,label,choices,selected,disabled){
  const options=Object.entries(choices).map(([id,text])=>'<option value="'+id+'"'+(String(selected)===id?' selected':'')+'>'+text+'</option>').join('');
  return '<label class="room-select"><span>'+label+'</span><select name="'+name+'"'+(disabled?' disabled':'')+'>'+options+'</select></label>';
}
const teamChoices=Object.fromEntries([0,1,2,3].map(id=>[id,teamLabel(id)]));

export function difficultyField(selected,disabled=false) {
  return '<div class="room-difficulty">'+select('soloDifficulty','Computer difficulty',levels,selected,disabled)+
    '<p>'+difficultyNotes[selected]+'</p></div>';
}

function difficultyGuide(seats) {
  const chosen=new Set(seats.filter(s=>s.kind==='bot').map(s=>s.difficulty));
  if(!chosen.size)return '';
  const current=AI_LEVELS.filter(id=>chosen.has(id)).map(id=>'<p class="room-rule">'+difficultyNotes[id]+'</p>').join('');
  const others=AI_LEVELS.filter(id=>!chosen.has(id));
  return current+(others.length?'<details class="room-difficulty-guide"><summary>Compare computer difficulties</summary>'+
    others.map(id=>'<p>'+difficultyNotes[id]+'</p>').join('')+'</details>':'');
}

export function roomSetupFields(config,disabled=false) {
  if (!config.seats.length) config=newRoomSetup();
  const count='<fieldset class="room-size"><legend>Number of seats</legend><div>'+[2,3,4].map(n=>
    '<label><input type="radio" name="roomSeatCount" value="'+n+'"'+(config.seats.length===n?' checked':'')+(disabled?' disabled':'')+'><span>'+n+'</span></label>'
  ).join('')+'</div></fieldset>';
  const seats=config.seats.map((seat,i)=>{
    const kind=i===0 ? '<strong class="room-host">Host</strong>' : select('seat-kind-'+i,'Controller',{human:'Human player',bot:'Computer'},seat.kind,disabled);
    return '<fieldset class="room-seat"><legend>Seat '+(i+1)+'</legend><div>'+kind+
      select('seat-team-'+i,'Team',teamChoices,seat.team,disabled)+
      (seat.kind==='bot'?select('seat-difficulty-'+i,'Difficulty',levels,seat.difficulty,disabled):'')+'</div>'+
      (i===0||seat.kind==='bot'?civilizationPicker('seat-civilization-'+i,seat.civilization,config.seats.map(s=>s.civilization),disabled):
        '<small>The invited player chooses their civilization.</small>')+'</fieldset>';
  }).join('');
  const sizes=new Map();
  for(const seat of config.seats) sizes.set(seat.team,(sizes.get(seat.team) || 0)+1);
  const unequal=new Set(sizes.values()).size>1;
  const teamHelp=[...sizes.values()].some(count=>count>1) ? '<p class="room-rule">Allies act together. Mark ready when you finish. The next team starts once every active ally is ready.</p>' : '';
  const invites=config.seats.filter(s=>s.kind==='human').length-1;
  const invitation=invites ? '<p class="room-rule"><strong>Human seats to invite</strong> · '+invites+'</p>'
    : '<p class="room-rule">Only the host needs to join. Computer seats are filled automatically.</p>';
  return count+'<div class="room-seats">'+seats+'</div>'+compareCivilizations()+invitation+teamHelp+'<p class="room-rule">Allies share sight, discoveries and victory. Each player commands their own units and treasury.</p>'+
    '<p class="room-rule">The starting team is drawn at random.</p>'+
    (unequal?'<p class="room-rule">Teams are uneven. Each civilization controls its own cities and units.</p>':'')+
    difficultyGuide(config.seats)+
    (validRoomTeams(config)?'':'<p class="modal-error" role="alert">Assign the seats to at least two different teams.</p>');
}
