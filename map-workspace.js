const compact = '(max-width:820px), (max-height:510px)';
const panels = new Map();
let current = '', dock, compactScreen;

function node(tag, className, value) {
  const element=document.createElement(tag);
  element.className=className;
  if (value) element.textContent=value;
  return element;
}

function applyPanels() {
  for (const [key, {panel, trigger, pinned}] of panels) {
    const fixed=pinned && !compactScreen.matches;
    const open=fixed || current===key;
    panel.hidden=!open;
    trigger.hidden=fixed;
    trigger.setAttribute('aria-expanded',String(open));
  }
}

export function showMapPanel(key, focus=false) {
  if (!panels.has(key)) return;
  current=key;
  applyPanels();
  if (focus) panels.get(key).panel.querySelector('.drawer-close')?.focus({preventScroll:true});
}

export function closeMapPanel(returnFocus=false) {
  if (!current) return;
  const former=panels.get(current);
  current='';
  applyPanels();
  if (returnFocus && !former.trigger.hidden) former.trigger.focus({preventScroll:true});
}

export function displayMapOnMobile() {
  if (compactScreen?.matches) closeMapPanel();
}

export function inspectMapOnMobile() {
  if (compactScreen?.matches) showMapPanel('command');
}

export function mountMapWorkspace() {
  const app=document.querySelector('.tactics');
  app.classList.add('map-workspace');
  compactScreen=window.matchMedia(compact);
  const resources=app.querySelector('.resources');
  app.querySelector('.head-actions').before(resources);
  const plan=app.querySelector('.strategy-rail');
  plan.prepend(app.querySelector('.campaign-name'));
  const tools=app.querySelector('.map-head-tools');
  tools.append(app.querySelector('.map-buttons'));
  const messages=node('div','map-messages');
  const hint=app.querySelector('.map-intel');
  hint.before(messages);
  messages.append(app.querySelector('#settlement-key'),hint);
  const menu=app.querySelector('#layers-menu');
  menu.append(app.querySelector('.map-survey-key'),app.querySelector('.map-key'));
  dock=node('nav','map-dock');
  dock.setAttribute('aria-label','Campaign controls');
  app.querySelector('main').append(dock);
  const entries=[
    ['plan','Planning',plan,true,'M3 4h14v13H3z M6 8h8m-8 4h5'],
    ['roster','Roster',app.querySelector('#roster-panel'),false,'M7 7a2.5 2.5 0 1 0 0 .1m5 1h4M3 16v-2c0-3 8-3 8 0v2m2-3h3'],
    ['command','Command',app.querySelector('.command-inspector'),true,'M10 2l7 3v5c0 4-4 7-7 8-3-1-7-4-7-8V5z M7 10l2 2 4-5']
  ];
  for (const [key,label,panel,pinned,path] of entries) {
    if (!panel.id) panel.id='map-panel-'+key;
    panel.classList.add('map-drawer','drawer-'+key);
    const trigger=node('button','dock-button');
    trigger.type='button';
    trigger.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"></path></svg>';
    trigger.append(node('span','',label));
    trigger.setAttribute('aria-controls',panel.id);
    const close=node('button','drawer-close','×');
    close.type='button';close.setAttribute('aria-label','Close panel');
    close.onclick=()=>closeMapPanel(true);
    panel.prepend(close);
    trigger.onclick=()=>current===key?closeMapPanel(true):showMapPanel(key);
    dock.append(trigger);
    panels.set(key,{panel,trigger,pinned});
  }
  const reports=document.getElementById('battle-reports-button');
  reports.classList.add('dock-button','dock-reports');
  panels.get('command').trigger.before(reports);
  reports.addEventListener('click',()=>closeMapPanel());
  app.querySelector('.chronicle').hidden=true;
  compactScreen.addEventListener('change',()=>{current='';applyPanels();});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && current && !document.querySelector('dialog[open]'))closeMapPanel(true);
  });
  document.addEventListener('click',e=>{
    if (current && !document.querySelector('dialog[open]') && e.target.closest('.map-heading, .end-turn, .masthead, #battle-dispatch') &&
        !e.target.closest('#cities-summary, #units-summary'))closeMapPanel();
  });
  app.querySelector('.brand').addEventListener('click',()=>closeMapPanel());
  applyPanels();
}

export function chartViewInsets() {
  const app=document.querySelector('.map-workspace');
  if(!app) return {left:0,right:0,top:0,bottom:0};
  const bounds=element=>element.getBoundingClientRect();
  const viewport=app.getBoundingClientRect();
  // At phone sizes the drawers slide above the map. Fit uses its resting view
  // so opening the orders sheet never causes a spontaneous camera movement.
  const left=compactScreen.matches ? 0 : bounds(panels.get('plan').panel).right-viewport.left;
  const right=compactScreen.matches ? 0 : viewport.right-bounds(panels.get('command').panel).left;
  const top=bounds(app.querySelector('.map-heading')).bottom-viewport.top+4;
  const bottom=viewport.bottom-bounds(dock).top+8;
  return {left,right,top,bottom};
}
