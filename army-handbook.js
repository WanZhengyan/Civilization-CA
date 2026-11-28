// The same unit definitions drive recruitment, combat, and this comparison.
import {UNIT_TYPES, TECHS, CIVICS, ERAS} from './rules.js';
import {advancementRoutes} from './unit-service.js';
import {getSightRadius} from './vision.js';

const notes = {
  builder: 'Spends charges to improve land connected to a friendly city.',
  melee: 'Captures a weakened city through an adjacent attack.',
  ranged: 'Can attack from two hexes away.'
};

export function handbookRows(era) {
  return Object.entries(UNIT_TYPES).filter(([,unit])=>unit.era===era).map(([id,unit])=>{
    const requirements = [];
    if (id==='settler') requirements.push('City of 3 or more residents');
    if (unit.tech) requirements.push(TECHS[unit.tech].name);
    if (unit.civic) requirements.push(CIVICS[unit.civic].name);
    if (unit.domain==='sea') requirements.push('Harbor');
    if (unit.shipyard) requirements.push('Shipyard');
    return {
      id, name:unit.name, moves:unit.moves, sight:getSightRadius(), range:unit.range, cost:unit.required,
      requirements, note:unit.description || notes[id] || '', upgrade:UNIT_TYPES[unit.upgrade]?.name,
      routes:advancementRoutes(id,UNIT_TYPES).map(r=>({name:UNIT_TYPES[r.to].name,cost:r.cost}))
    };
  });
}

export function armyHandbook(escapeHTML) {
  const safe = escapeHTML;
  function badges(names) {
    return names.map(name=>'<span class="manual-tag">'+safe(name)+'</span>').join('');
  }
  const chapter = Object.values(ERAS).map((era,index)=>{
    const units = handbookRows(era.id);
    if (!units.length) return '';
    const rows = units.map(unit=>{
      const description = unit.note ? '<p>'+safe(unit.note)+'</p>' : '';
      const upgrade = unit.routes.length ? '<p class="manual-unlocks"><b>Upgrades to</b>'+unit.routes.map(r=>
        '<span class="manual-tag"><span>'+safe(r.name)+'</span> · <span>'+safe(r.cost)+' <span>gold</span></span></span>').join('')+'</p>' : '';
      const info = '<details><summary data-guide-target="unit-'+safe(unit.id)+'">'+safe(unit.name)+'</summary>'+description+
        '<p class="manual-unlocks"><b>Train with</b>'+badges(unit.requirements.length ? unit.requirements : ['City center'])+'</p>'+upgrade+'</details>';
      return '<tr><th scope="row">'+info+'</th><td>'+unit.moves+'</td><td>'+unit.sight+'</td><td>'+unit.range+'</td><td>'+unit.cost+'</td></tr>';
    }).join('');
    const header = ['Formation','Move','Sight','Range','Cost'].map(name=>'<th scope="col">'+name+'</th>').join('');
    return '<details class="manual-era" '+(index===0?'open':'')+'><summary><strong>'+safe(era.name)+'</strong><span>'+units.length+'</span></summary>'+
      '<table><caption class="sr-only">Base unit statistics</caption><thead><tr>'+header+'</tr></thead><tbody>'+rows+'</tbody></table></details>';
  }).join('');
  return '<section class="army-manual"><p>Compare base movement, sight, attack range and production cost. Select a formation to see its role and requirements.</p>'+chapter+'</section>';
}
