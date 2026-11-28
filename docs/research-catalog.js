let toolbar;

export function researchLinks(item, options, units) {
  return {
    discoveries:options.filter(other=>other.requires.includes(item)).map(other=>other.label),
    formations:Object.values(units).filter(unit=>unit.tech===item).map(unit=>unit.name)
  };
}

function filterCards(container) {
  const tier=toolbar.querySelector('select').value;
  const available=toolbar.querySelector('input').checked;
  let matches=0;
  for (const group of container.querySelectorAll('[data-era]')) {
    let groupMatches=0;
    for (const card of group.querySelectorAll('[data-project]')) {
      const status=card.dataset.status;
      card.hidden=Boolean((tier && group.dataset.era!==tier) || (available && status!=='active' && status!=='available'));
      if (!card.hidden) groupMatches++;
    }
    group.hidden=!groupMatches;
    matches+=groupMatches;
  }
  toolbar.querySelector('[role=status]').hidden=Boolean(matches);
}

export function syncResearchLens(track, container, planning=false) {
  if (!toolbar && track==='research') {
    toolbar=document.createElement('div');
    toolbar.className='research-filters';
    toolbar.innerHTML='<label><span>Research era</span> <select><option value="">All eras</option><option value="frontier">Frontier Era</option><option value="industrial">Industrial Era</option><option value="modern">Modern Era</option></select></label><label><input type="checkbox"> <span>Available research only</span></label><span role="status" hidden>No discoveries match these filters.</span>';
    toolbar.addEventListener('change',()=>filterCards(container));
    container.before(toolbar);
  }
  if (!toolbar) return;
  toolbar.hidden=planning || track!=='research';
  if (track==='research') filterCards(container);
}

// A reminder should always reveal an available choice, even after browsing later eras.
export function focusAvailableProject(track,container) {
  const selector='[data-project][data-status="available"]:enabled';
  const visible=()=>Array.from(container.querySelectorAll(selector)).find(card=>!card.closest('[hidden]'));
  let project=visible();
  if(!project && track==='research' && toolbar) {
    toolbar.querySelector('select').value='';
    filterCards(container);
    project=visible();
  }
  project?.focus();
}
