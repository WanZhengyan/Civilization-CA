import {CIVICS} from './progression.js';
import {POLICIES, policyOptions} from './policy.js';

export function addPolicyPanel(council, state, seat, mayOrder, order) {
  const options=policyOptions(state,seat);
  const neighbor=council.previousElementSibling;
  const previous=neighbor?.classList.contains('civic-government') ? neighbor : null;
  const signature=JSON.stringify([mayOrder,...options.map(p=>[p.current,p.reason,p.fee])]);
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
