import {validMapId} from './maps.js';

// Invitation links only provide a public room code. API requests always go to the configured room host.
export function invitationCode(input) {
  const raw = String(input || '').trim();
  let candidate = raw;
  if (/^https?:\/\//i.test(raw)) {
    try { candidate = new URL(raw).searchParams.get('room') || ''; }
    catch { return ''; }
  }
  return /^[a-z0-9]{6}$/i.test(candidate) ? candidate.toUpperCase() : '';
}

export function launchDestination(url, hasSolo, seats) {
  const location = new URL(url);
  if (location.searchParams.has('room')) {
    const code = invitationCode(location.searchParams.get('room'));
    return {screen: code && seats[code] ? 'reconnect' : 'join', code};
  }
  if (location.hash === '#tutorial' || location.searchParams.get('setup') === 'tutorial') return {screen:'tutorial'};
  if (location.hash === '#campaign') return {screen: hasSolo ? 'solo' : 'home'};
  const setup = location.searchParams.get('setup');
  if (setup === 'guide') return {screen:'guide'};
  if (location.searchParams.get('play') === '1' && !setup) return hasSolo ? {screen:'solo'} : {screen:'setup',mode:'solo',region:null};
  if (['solo','create','host','join'].includes(setup)) {
    const region = location.searchParams.get('region');
    return {screen:'setup',mode:setup === 'host' ? 'create' : setup,region:validMapId(region) ? region : null};
  }
  return {screen:'home'};
}
