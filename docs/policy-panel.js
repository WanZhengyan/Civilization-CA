import {CIVICS} from './progression.js';
import {POLICIES, policyOptions} from './policy.js';

export function addPolicyPanel(council, state, seat, mayOrder, order) {
  const options=policyOptions(state,seat);
  const neighbor=council.previousElementSibling;
  const previous=neighbor?.classList.contains('civic-government') ? neighbor : null;
  const signature=JSON.stringify([mayOrder,state.players[seat].civics,...options.map(p=>[p.current,p.reason,p.fee])]);
  if (previous?.dataset.policyState===signature) return;
  const current=options.find(p=>p.current);
  const canChoose=options.some(p=>!p.current && (!p.civic || state.players[seat].civics?.includes(p.civic)));
  // Keep the civic tree in view until the faction unlocks its first choice.
  const panel=document.createElement('details');
  panel.className='civic-government';
  panel.dataset.policyState=signature;
  const heading=document.createElement('summary');
  const label=document.createElement('strong');
  label.textContent='Government policy';
  const selected=document.createElement('span');
  selected.textContent=current?.name || POLICIES.balanced.name;
  heading.append(label,selected);
  panel.append(heading);
  const help=document.createElement('p');
  help.textContent=canChoose ? 'Fund one program at a time. The first vote is free. Later changes cost 3 influence, once per turn.' :
    'Adopt Municipal Charter or Public Works to fund a government program.';
  panel.append(help);
  const choices=document.createElement('div');
  choices.className='policy-choices';
  for (const option of options) {
    const button=document.createElement('button');
    button.type='button';
    button.dataset.policy=option.id;
    button.setAttribute('aria-pressed',String(option.current));
    button.disabled=!option.enabled || !mayOrder;
    const name=document.createElement('strong'),effect=document.createElement('span'),hint=document.createElement('small');
    name.textContent=option.name;
    effect.textContent=option.description;
    hint.textContent=option.reason==='Civic required' ? 'Requires '+CIVICS[option.civic].name+'.' :
      option.reason || (option.fee ? 'Ratify for 3 influence' : 'Ratify for free');
    button.append(name,effect,hint);
    button.onclick=()=>order({type:'policy',item:option.id});
    choices.append(button);
  }
  panel.append(choices);
  panel.open=previous?.open || false;
  if (previous) previous.replaceWith(panel);
  else council.before(panel);
}

export function updateCivicAgenda(council, active, unitTypes) {
  let filters=council.querySelector('.civic-filters');
  if (!active) { delete council.dataset.civicView; return; }
  if (filters) return;
  filters=document.createElement('div');
  filters.className='civic-filters';
  filters.setAttribute('role','group');
  filters.setAttribute('aria-label','Civic projects');
  const views=[['agenda','Council agenda'],['tree','Full civic tree']];
  const buttons=views.map(([id,label])=>{
    const button=document.createElement('button');
    button.type='button';
    button.dataset.view=id;
    button.textContent=label;
    return button;
  });
  function select(id) {
    council.dataset.civicView=id;
    for (const button of buttons) button.setAttribute('aria-pressed',String(button.dataset.view===id));
  }
  for(const button of buttons) button.onclick=()=>select(button.dataset.view);
  filters.append(...buttons);
  council.querySelector('.council-summary')?.after(filters);
  const cards=council.querySelectorAll('[data-project]');
  for (const card of cards) {
    const key=card.dataset.project;
    const unlocks=[
      ...Object.values(POLICIES).filter(p=>p.civic===key).map(p=>['Unlocks policy',p.name]),
      ...Object.values(unitTypes).filter(u=>u.civic===key).map(u=>['Unlocks unit',u.name])
    ];
    for (const [label,name] of unlocks) {
      const line=document.createElement('span'),kind=document.createElement('small'),title=document.createElement('span');
      line.className='civic-unlock';kind.textContent=label;title.textContent=name;
      line.append(kind,title);card.querySelector('.project-meta')?.before(line);
    }
  }
  const available=Array.from(cards).some(card=>['active','available'].includes(card.dataset.status));
  select(council.dataset.civicView || (available ? 'agenda' : 'tree'));
}
