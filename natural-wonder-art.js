import {NATURAL_WONDERS} from './natural-wonders.js';

export function naturalWonderArt(id) {
  return Object.hasOwn(NATURAL_WONDERS,id) ? './art/'+id+'.webp' : null;
}
