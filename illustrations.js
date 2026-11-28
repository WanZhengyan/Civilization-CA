import {UNIT_TYPES, BUILDINGS, IMPROVEMENTS} from './rules.js';
import {SCIENCE_PROJECT} from './victory-rules.js';
import {SCENIC_WORKS} from './scenic-works.js';
import {RESOURCES} from './resources.js';

// Full-size art normally paints over its local miniature. Keep the miniature
// visible if the high-resolution file fails, including when the browser draws
// a broken-image badge for an empty alt attribute.
if (typeof document!=='undefined') document.addEventListener('error',event=>{
  const image=event.target;
  if(image.tagName==='IMG' && image.classList.contains('item-illustration') && !image.dataset.unavailable) {
    image.dataset.unavailable='true';
    image.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
},true);

const catalog = {...UNIT_TYPES, ...BUILDINGS, ...IMPROVEMENTS, ...RESOURCES, [SCIENCE_PROJECT.id]:SCIENCE_PROJECT};

export function illustrationPath(id) {
  return Object.hasOwn(catalog, id) ? './art/'+(SCENIC_WORKS[id]?.landmark || id)+'.webp' : null;
}

// The adjacent live label names the subject in the player's language.
export function illustration(id) {
  const src = illustrationPath(id);
  return src ? '<img class="item-illustration" data-art="'+id+'" src="'+src+'" alt="" decoding="sync">' : '';
}
