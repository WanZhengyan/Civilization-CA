import {getDevelopmentPreview,getStats} from './rules.js';

const metrics=[['Capital per turn','capitalIncome'],['Influence per turn','influenceIncome'],['Civic points','score']];

export function foundingLabel(state,seat) {
  if (state.opening!=='settlers') return 'Found city';
  if (typeof state.intel?.hasFoundedCapital === 'boolean') return state.intel.hasFoundedCapital ? 'Found city' : 'Found capital';
  // An older server may no longer show the original capital or retain the
  // whole record. Only promise a capital when the complete opening is known.
  const founded=state.cities.some(city=>city.originalSeat===seat) || state.log.some(entry=>entry.type==='found' && entry.seat===seat);
  return !founded && state.log[0]?.type==='start' ? 'Found capital' : 'Found city';
}

export function cityKind(city,seat) {
  if (city.originalSeat == null) return city.seat === seat ? 'Your city' : 'Rival city';
  if (city.originalSeat !== city.seat) return 'Captured original capital';
  return city.seat === seat ? 'Your capital city' : 'Rival capital city';
}

export function developmentPanel(preview,stats) {
  if (!preview) return '<div class="district-development" tabindex="-1"><strong>Maximum district level</strong><b>3 / 3</b></div>';
  const rows = metrics.map(([label,key])=>{
    const before=Number(stats[key]), gain=Number(preview.delta[key]);
    return '<div><dt>'+label+'</dt><dd>'+before+' → <strong>'+(before+gain)+'</strong></dd></div>';
  }).join('');
  return '<div class="district-development" tabindex="-1"><strong>District level</strong><b>'+Number(preview.currentLevel)+' → '+Number(preview.nextLevel)+
    '</b><dl>'+rows+'</dl></div>';
}

// Two legal orders on the same district in one round can have identical log
// entries. Count accepted entries across the two private snapshots.
export function developmentReceipt(previous,current,seat,map) {
  if (!previous || previous === current || (current.intel && current.intel.seat!==seat)) return null;
  const event=current.log.findLast(entry=>entry.type === 'develop' && entry.seat === seat);
  if (!event || !map.byId[event.tile]) return null;
  const matches=entry=>entry.type === 'develop' && entry.seat === seat && entry.round === event.round && entry.tile === event.tile;
  if (current.log.filter(matches).length <= previous.log.filter(matches).length) return null;
  const feedback=['District developed',map.byId[event.tile].name];
  const before=previous.board[event.tile], after=current.board[event.tile];
  if (before?.owner!==seat || after?.owner!==seat || after.level<=before.level ||
      (current.intel && !current.intel.visible.includes(event.tile))) return feedback;
  feedback.push(before.level+' → '+after.level);
  // On normal acknowledgment the preceding log entries are a suffix of the
  // previous seat view; older entries may have rolled out of the log. A
  // coalesced poll still confirms the order, without crediting other income.
  const preceding=current.log.slice(0,-1);
  const offset=previous.log.length-preceding.length;
  const consecutive=current.log.at(-1)===event && offset>=0 && previous.round===current.round &&
    after.level===before.level+1 && preceding.every((entry,i)=>JSON.stringify(entry)===JSON.stringify(previous.log[offset+i]));
  if (!consecutive) return feedback;
  const preview=getDevelopmentPreview(previous,seat,event.tile);
  if (!preview?.enabled) return feedback;
  const oldStats=getStats(previous,seat),newStats=getStats(current,seat);
  if (metrics.every(([,key])=>newStats[key]-oldStats[key]===preview.delta[key])) {
    for (const [label,key] of metrics) if (preview.delta[key]) feedback.push([label,'+'+preview.delta[key]]);
  }
  return feedback;
}
