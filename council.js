import {getCivicOptions, getStats} from './rules.js';

// The compact panel also serves hosts that embed the older game shell.
export function paintCompactCivics(view, order) {
  if (document.getElementById('civics-card')) return;
  let card = document.getElementById('compact-civics');
  let dialog = document.getElementById('compact-civics-modal');
  if (!card) {
    card = document.createElement('button');
    card.id = 'compact-civics';
    card.className = 'council-card panel';
    document.getElementById('research-card').after(card);
    dialog = document.createElement('dialog');
    dialog.id = 'compact-civics-modal';
    dialog.className = 'order-dialog';
    dialog.setAttribute('aria-labelledby','compact-civics-title');
    document.body.append(dialog);
  }
  const options = getCivicOptions(view.state,view.seat);
  const active = options.find(o=>o.active);
  const balance = view.state.players[view.seat].culture;
  const rate = getStats(view.state,view.seat).cultureIncome;
  card.textContent = 'Civics · ' + (active?.label || 'Choose a civic') + ' · ' + balance + ' culture';
  card.disabled = view.room?.phase==='lobby' && view.mode==='online';
  card.onclick = () => {
    dialog.innerHTML = '<div class="modal-shell"><header class="modal-head"><div><div class="modal-kicker">CIVICS</div><h2 class="modal-title" id="compact-civics-title">Civic assembly</h2></div><button class="modal-close" aria-label="Close civics">×</button></header><div class="modal-body"><p class="science-balance"></p><div class="discoveries"></div></div></div>';
    dialog.querySelector('.science-balance').textContent = balance + ' culture banked · +' + rate + ' each turn';
    for (const option of options) {
      const button = document.createElement('button');
      button.className = 'discovery-card';
      button.disabled = !option.enabled || view.busy;
      const detail = document.createElement('span');
      detail.className = 'discovery-detail';
      const name = document.createElement('strong');
      name.textContent = option.label;
      const desc = document.createElement('small');
      desc.textContent = option.description;
      const status = document.createElement('small');
      status.textContent = option.reason || option.cost + ' culture · ' + option.turns + ' turns';
      detail.append(name,desc,status);
      button.append(detail);
      button.onclick = () => { dialog.close(); order({type:'civic',item:option.item}); };
      dialog.querySelector('.discoveries').append(button);
    }
    dialog.querySelector('.modal-close').onclick = () => dialog.close();
    dialog.showModal();
  };
}
