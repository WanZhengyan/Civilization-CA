import {councilTree} from './progression.js';
import {WONDERS} from './wonders.js';
import {policyOptions} from './policy.js';

export function councilAgenda(state,seat,openFrontier=false) {
  const tree=councilTree(state,'civic');
  const cities=state.cities.filter(c=>c.seat===seat);
  const owns=key=>state.players[seat].civics.includes(key);
  const ideas=[seat%2 ? 'publicWorks' : 'charter'];
  if (cities.some(c=>c.hp<c.maxHp)) ideas.push('mutualAid');
  if (cities.some(c=>c.buildings.includes('harbor'))) ideas.push('harborCommission');
  if (cities.some(c=>c.buildings.some(id=>WONDERS[id]))) ideas.push('exposition','normalSchools','conservation');
  if (openFrontier && !owns('federation')) ideas.push(...tree.federation.requires,'federation');
  if (cities.some(c=>c.population>=3)) ideas.push('housingTrust','normalSchools');
  if (Object.values(state.board).some(t=>t.owner===seat && !t.pillaged && ['farm','orchard'].includes(t.improvement))) ideas.push('irrigationDistricts');
  ideas.push('charter','federation','publicWorks','conservation','irrigationDistricts','normalSchools','mobilization','publicRadio',...Object.keys(tree));
  return ideas.find(key=>!owns(key) && tree[key].requires.every(owns));
}

export function proposePolicy(state,seat,foodForCity) {
  const player=state.players[seat];
  if (player.policyRound!=null && state.round-player.policyRound<3) return null;
  const cities=state.cities.filter(c=>c.seat===seat);
  if (!cities.length) return null;
  const current=player.policy||'balanced';
  const votes=policyOptions(state,seat);
  const legal=id=>votes.some(p=>p.id===id && (p.enabled || p.current));
  const usualFoodChange=current==='relief' ? 2 : current==='contracts' ? -1 : 0;
  const supply=cities.map(city=>foodForCity(state,city.id).surplus-usualFoodChange);
  const programs=[];
  if (supply.some(food=>food<0)) programs.push('relief');
  if (cities.some(c=>c.buildings.includes('harbor')) && player.capital<12) programs.push('portDues');
  if (player.capital>=18 && player.research) programs.push('grants');
  if (supply.every(food=>food>=1) && cities.some(c=>c.queue)) programs.push('contracts');
  if (player.civic && !player.research) programs.push('lectures');
  programs.push('balanced');
  const choice=programs.find(legal);
  return choice && choice!==current ? {type:'policy',item:choice} : null;
}
