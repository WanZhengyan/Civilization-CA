import {createGame, migrateGame} from './rules.js';

export const SOLO_KEY = 'angel-basin.solo.v1';

export function soloSlotKey(region, size = 'standard') {
  // Standard uses the original region slot, including saves from before map sizes.
  return SOLO_KEY + '.' + region + (size === 'large' ? '.large' : '');
}

export function restoreSolo(state) {
  if (!Array.isArray(state?.players) || state.players.length < 2 || state.players.length > 4 ||
      !state.board || !Array.isArray(state.log) || !['finished','playing'].includes(state.phase)) return null;
  try { return migrateGame(state); } catch { return null; }
}

export function newSolo(region, mapSize, rivals) {
  const players = [{name:'You'}, ...Array.from({length:rivals}, ()=>({bot:true}))];
  return createGame(players, region, {mapSize});
}
