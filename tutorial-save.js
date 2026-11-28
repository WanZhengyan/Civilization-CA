import {createGame} from './rules.js';
import {restoreSolo} from './solo-saves.js';

export const TUTORIAL_KEY = 'civilization-ca.tutorial.v1';

export function newTutorial() {
  // Pasadena can found in place; both neutral camps begin more than 16 hexes away.
  const game = createGame([{name:'You',civilization:'valley'}], 'la', {
    seed:24680, mapSize:'large', practice:true, victoryMode:'science'
  });
  const id = globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  return {id, game, progress:{}};
}

export function restoreTutorial(saved) {
  if (!saved || typeof saved.id !== 'string' || !saved.id || !saved.game?.practice) return null;
  const game = restoreSolo(saved.game);
  if (!game || game.mapId !== 'la' || game.seed !== 24680) return null;
  return {id:saved.id, game, progress:{...saved.progress}};
}

const lessonsByAction = {
  found:'founded', research:'choseResearch', civic:'choseCivic', produce:'choseProduction',
  switchProduction:'choseProduction', buyProduction:'choseProduction', charterBorder:'expanded'
};

export function tutorialProgressAfter(progress, before, action) {
  const changes = {};
  const lesson = lessonsByAction[action.type];
  if (lesson) changes[lesson] = true;
  const hasCity = before.cities.some(city=>city.seat === 0);
  if (action.type === 'end' && hasCity) changes.endedTurn = true;
  if (action.type === 'move' || action.type === 'skipUnit') {
    if (hasCity) changes.mobileUnitOrder = true;
    if (before.units.find(unit=>unit.id === action.unit)?.type === 'scout') {
      changes[action.type === 'move' ? 'movedScout' : 'skippedScout'] = true;
    }
  }
  return {...progress,...changes};
}
