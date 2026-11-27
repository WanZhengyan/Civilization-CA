import {createGame, migrateGame, TARGET_SCORE} from './rules.js';

export const SOLO_KEY = 'angel-basin.solo.v1';

export function soloSlotKey(region, size = 'standard') {
  // Standard uses the original region slot, including saves from before map sizes.
  return SOLO_KEY + '.' + region + (size === 'large' ? '.large' : '');
}

export function restoreSolo(state) {
  if (!Array.isArray(state?.players) || !state.board || !Array.isArray(state.log) || !['finished','playing'].includes(state.phase)) return null;
  const validRoster = state.practice === true
    ? state.players.length === 1 && state.players[0] && !state.players[0].bot
    : state.players.length >= 2 && state.players.length <= 4;
  if (!validRoster) return null;
  try { return migrateGame(state); } catch { return null; }
}

export function newSolo(region, mapSize, rivals = 3, scoreTarget = TARGET_SCORE, difficulty = 'normal') {
  if (!Number.isInteger(rivals) || rivals < 0 || rivals > 3) throw new RangeError('Choose zero to three computer opponents.');
  const players = [{name:'You'}, ...Array.from({length:rivals}, ()=>({bot:true}))];
  return createGame(players, region, {mapSize, scoreTarget, difficulty:rivals ? difficulty : 'normal', practice:rivals === 0});
}
