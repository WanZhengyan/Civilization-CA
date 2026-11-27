import {frontierSeatsAt} from './political-borders.js';

const gridPreference = 'civilization-ca.map-grid';

export function mountSurveyControls(atlas) {
  const menu = document.getElementById('layers-menu');
  const grid = document.createElement('label');
  grid.innerHTML = '<input type="checkbox" id="hex-grid" checked>Hex grid';
  menu.prepend(grid);
  const input = grid.querySelector('input');

  const key = document.createElement('div');
  key.className = 'map-survey-key';
  key.setAttribute('role','group');
  key.setAttribute('aria-label','Map key');
  key.innerHTML = '<span data-grid-key><i class="grid-sample" aria-hidden="true"></i>Hex grid</span>'
    + '<span><i class="frame-sample" aria-hidden="true"></i>Map edge</span>'
    + '<span data-territory-key><i class="claim-sample" aria-hidden="true"></i>Claim edge</span>'
    + '<span data-territory-key><i class="frontier-sample" aria-hidden="true"></i>Shared frontier</span>'
    + '<span><svg class="city-symbol" viewBox="0 0 18 15" aria-hidden="true"><rect x="4" y="3" width="10" height="9" rx="1"/></svg>City</span>'
    + '<span><svg class="capital-symbol" viewBox="0 0 18 15" aria-hidden="true"><path d="m2 4 4 3 3-5 3 5 4-3-2 7H4zM5 13h8"/></svg>Original capital</span>'
    + '<button type="button">Fit region</button>';
  document.getElementById('legend').closest('.map-key').before(key);
  key.querySelector('button').onclick = () => atlas.reset();

  try { input.checked = localStorage.getItem(gridPreference) !== 'off'; } catch {}
  function showGrid() {
    atlas.setGrid(input.checked);
    key.querySelector('[data-grid-key]').hidden = !input.checked;
  }
  showGrid();
  input.addEventListener('change',()=>{
    showGrid();
    try { localStorage.setItem(gridPreference, input.checked ? 'on' : 'off'); } catch {}
  });
  const readout = document.createElement('div');
  readout.id = 'frontier-readout';
  readout.hidden = true;
  readout.setAttribute('role','status');
  document.getElementById('entity-tabs').after(readout);

  const territory = document.getElementById('territory-lines');
  territory.addEventListener('change',()=>{
    for (const entry of key.querySelectorAll('[data-territory-key]')) entry.hidden = !territory.checked;
  });
}

export function showSelectedFrontier(id, board, visible, byId, faction) {
  const readout = document.getElementById('frontier-readout');
  if (!readout) return;
  const factions = frontierSeatsAt(id, board, visible, byId).map(faction);
  const signature = factions.map(entry => entry.name).join('|');
  if (readout.dataset.factions === signature) return;
  readout.dataset.factions = signature;
  readout.hidden = !factions.length;
  readout.replaceChildren();
  if (!factions.length) return;
  const heading = document.createElement('small');
  heading.textContent = 'Shared frontier';
  readout.append(heading);
  for (const entry of factions) {
    const tag = document.createElement('span');
    tag.textContent = entry.name;
    tag.style.setProperty('--faction-color', entry.color);
    readout.append(tag);
  }
}
