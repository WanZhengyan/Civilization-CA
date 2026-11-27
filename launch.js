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
  return {screen: location.hash === '#campaign' && hasSolo ? 'solo' : 'home'};
}
