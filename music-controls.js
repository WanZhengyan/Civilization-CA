import {CampaignMusic,themes} from './campaign-music.js';
import {getLanguage,translate} from './i18n.js';

export function soundtrackControls(music) {
  if (!music) return '';
  const {enabled,volume} = music.preference;
  const title = themes[music.scene]?.title || '';
  return '<section class="menu-music" aria-label="Campaign soundtrack"><div class="music-heading"><div><strong>Campaign soundtrack</strong>'+
    '<small data-track>'+title+'</small></div><button type="button" data-music-toggle aria-pressed="'+enabled+'">'+
    (enabled?'Mute music':'Enable music')+'</button></div><label class="music-volume"><span>Music volume</span>'+
    '<input data-music-volume type="range" min="0" max="100" step="1" value="'+volume+'"><output>'+volume+'%</output></label>'+
    '<small data-music-status role="status"></small></section>';
}

const statusLabels={off:'Silent',waiting:'Ready to play',loading:'Loading music…',playing:'Playing',unavailable:'Music unavailable'};

export function installSoundtrack(dialog) {
  let storage;
  try { storage=window.localStorage; } catch { /* Device-only settings. */ }
  const label = key=>translate(key,getLanguage());
  function refresh() {
    const panel=dialog.querySelector('.menu-music');
    if (!panel) return;
    const toggle=panel.querySelector('[data-music-toggle]');
    const {enabled,volume}=music.preference;
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.textContent=label(enabled?'Mute music':'Enable music');
    panel.querySelector('output').textContent=volume+'%';
    panel.querySelector('[data-music-volume]').value=String(volume);
    panel.querySelector('[data-track]').textContent=label(themes[music.scene]?.title || '');
    panel.querySelector('[data-music-status]').textContent=label(statusLabels[music.status]);
  }
  const music=new CampaignMusic({storage,onChange:refresh,
    createContext:()=>{
      const Context=window.AudioContext || window.webkitAudioContext;
      return new Context();
    },
    async readAudio(url) {
      const r=await fetch(url);
      if (!r.ok) throw new Error('Soundtrack request failed');
      return r.arrayBuffer();
    }});
  music.setVisible(!document.hidden);
  document.addEventListener('click',()=>music.activate(),true);
  document.addEventListener('keydown',e=>{if(!e.repeat) music.activate();},true);
  document.addEventListener('visibilitychange',()=>music.setVisible(!document.hidden));
  window.addEventListener?.('pagehide',()=>music.setVisible(false));
  window.addEventListener?.('pageshow',()=>music.setVisible(!document.hidden));
  // Settings follow the browser. No preference or audio context is written to a game save.
  dialog.addEventListener('click',e=>{
    if (!e.target.closest?.('[data-music-toggle]')) return;
    music.setPreference({enabled:!music.preference.enabled});
    music.activate(true);
  });
  dialog.addEventListener('input',e=>{
    if (!e.target.matches?.('[data-music-volume]')) return;
    music.setPreference({volume:Number(e.target.value)});
    music.activate(true);
  });
  return {music,refresh};
}
