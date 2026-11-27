import {UNIT_TYPES, BUILDINGS, IMPROVEMENTS} from './rules.js';
import {RESOURCES} from './resources.js';

const catalog = {...UNIT_TYPES, ...BUILDINGS, ...IMPROVEMENTS, ...RESOURCES};

export function illustrationPath(id) {
  return Object.hasOwn(catalog, id) ? './art/'+id+'.webp' : null;
}

// The adjacent live label names the subject in the player's language.
export function illustration(id) {
  const src = illustrationPath(id);
  return src ? '<img class="item-illustration" src="'+src+'" alt="" decoding="sync">' : '';
}
