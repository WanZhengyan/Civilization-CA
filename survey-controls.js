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
  key.setAttribute('aria-label','Map line key');
  key.innerHTML = '<span data-grid-key><i class="grid-sample" aria-hidden="true"></i>Hex grid</span>'
    + '<span><i class="frame-sample" aria-hidden="true"></i>Map edge</span>'
    + '<span data-territory-key><i class="claim-sample" aria-hidden="true"></i>Territory border</span>'
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
  const territory = document.getElementById('territory-lines');
  territory.addEventListener('change',()=>{
    key.querySelector('[data-territory-key]').hidden = !territory.checked;
  });
}
