import {sameTeam} from './rules.js';

export function foundingLabel(state,seat) {
  if (state.opening!=='settlers') return 'Found city';
  if (typeof state.intel?.hasFoundedCapital === 'boolean') return state.intel.hasFoundedCapital ? 'Found city' : 'Found capital';
  // An older server may no longer show the original capital or retain the
  // whole record. Only promise a capital when the complete opening is known.
  const founded=state.cities.some(city=>city.originalSeat===seat) || state.log.some(entry=>entry.type==='found' && entry.seat===seat);
  return !founded && state.log[0]?.type==='start' ? 'Found capital' : 'Found city';
}

export function cityKind(city,seat,state) {
  if (city.originalSeat != null && city.originalSeat !== city.seat) return 'Captured original capital';
  const capital=city.originalSeat != null;
  if (city.seat===seat) return capital ? 'Your capital city' : 'Your city';
  if (state && sameTeam(state,seat,city.seat)) return capital ? 'Allied capital city' : 'Allied city';
  return capital ? 'Rival capital city' : 'Rival city';
}
