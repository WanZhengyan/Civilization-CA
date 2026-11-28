import {CIVILIZATIONS} from './civilizations.js';
import {modeDetails,modeLabels,traitLine} from './campaign-choices.js';
import {allowsConquest,allowsScience,scienceProgress} from './victory-rules.js';
import {sameTeam,teamLabel} from './teams.js';

const text=value=>'<span>'+value+'</span>';
function metric(name,value) {
  return '<li class="victory-metric">'+text(name)+'<strong>'+value+'</strong></li>';
}

export function victoryPanel(state,seat,escape) {
  const finished=state.phase==='finished';
  const winners=state.winners || [];
  const own=state.players[seat];
  let html='<p class="modal-kicker">'+modeLabels[state.victoryMode]+'</p>';
  if(finished){
    const names=state.teams ? [...new Set(winners.map(i=>state.teams[i]))].map(teamLabel)
      : winners.map(i=>CIVILIZATIONS[state.players[i].faction].name);
    const cause={science:'The winning side completed the Orbital Survey.',domination:'The winning side controls every original capital.',survival:'The winning side is the last surviving side.'};
    html+='<section class="victory-result"><h3>'+(winners.includes(seat)?'Victory':'Campaign ended')+'</h3><p>'+
      names.map(text).join(' · ')+'</p><p>'+cause[state.victoryReason]+'</p></section>';
  }else{
    html+='<p class="modal-copy">'+(state.practice ? modeDetails.science : modeDetails[state.victoryMode])+'</p>';
  }
  if(allowsConquest(state)){
    const controlled=state.cities.filter(c=>Number.isInteger(c.originalSeat) && sameTeam(state,seat,c.seat)).length;
    html+='<h3 class="journal-heading">Conquest</h3><ul class="victory-metrics">'+metric('Original capitals confirmed under your control',controlled)+'</ul>'+
      '<p class="modal-muted">The chart counts only capitals visible to your side.</p>';
  }
  if(allowsScience(state)){
    const p=scienceProgress(state,seat);
    if(p){
      html+='<h3 class="journal-heading">Science victory</h3><ul class="victory-metrics">'+
        p.prerequisites.map(t=>metric(t.id==='radio'?'Radio Networks':'Motorization',text(t.complete?'Complete':'Pending'))).join('')+
        metric('Rocketry',text(p.hasRocketry?'Complete':'Pending'))+
        metric('Orbital Survey',p.production+' / '+p.required)+'</ul>';
      if(!finished){
        html+=p.cityName?'<p class="modal-muted">'+text(p.paused?'Paused project':'Launch city')+' · <span translate="no">'+escape(p.cityName)+'</span></p>':
          '<p class="modal-muted">'+(p.hasRocketry?'Open City production and choose Orbital Survey.':'Research Radio Networks and Motorization to unlock Rocketry.')+'</p>';
      }
    }
  }
  if(state.civilizationTraits===1 && own) {
    const civ=CIVILIZATIONS[own.faction];
    html+='<h3 class="journal-heading">Your civilization</h3><strong>'+civ.name+'</strong>'+traitLine(civ);
  }
  return html;
}
