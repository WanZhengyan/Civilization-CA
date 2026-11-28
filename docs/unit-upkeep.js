// Support costs are assessed on deployed formations at the start of their owner's harvest.
const rates = {
  settler:0, builder:1, workboat:1, scout:1, melee:1, ranged:1,
  pikes:2, skirmisher:2, cavalry:2, cutter:2,
  riflemen:3, sappers:3, artillery:4, frigate:4, ironclad:4,
  signals:5, armor:6, destroyer:6
};

export const ARREARS_REASON='Pay outstanding unit maintenance at harvest before recruiting or upgrading.';
export function unitUpkeep(type) {
  return Object.hasOwn(rates,type) ? rates[type] : 0;
}
export function rosterUpkeep(units,seat) {
  return units.reduce((total,unit)=>total+(unit.seat===seat?unitUpkeep(unit.type):0),0);
}
export function settlePayroll(player,netIncome) {
  const balance=player.capital+netIncome-(player.maintenanceArrears || 0);
  player.capital=Math.max(0,balance);
  if (balance<0) player.maintenanceArrears=-balance;
  else delete player.maintenanceArrears;
}
