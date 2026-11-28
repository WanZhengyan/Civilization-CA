import {getVisibleTiles} from './vision.js';

const historyLimit = 48;

function combatant(kind, piece, hpAfter) {
  return {
    kind, seat:piece.seat ?? null, type:piece.type ?? 'city', tile:piece.tile,
    hpBefore:piece.hp, hpAfter,
    ...(kind === 'city' ? {name:piece.name} : {})
  };
}

// Capture what the seats witnessed before a death or conquest changes their sight.
export function prepareBattle(state, attacker, target, result, details = {}) {
  const source = combatant(details.attackerKind ?? (attacker.seat == null ? 'wild' : 'unit'), attacker, result.attackerHpAfter);
  const victim = combatant(result.defenderType, target, result.defenderHpAfterHit);
  const outcome = details.outcome ?? (result.capture ? 'captured' : result.defeated ? 'destroyed' : 'hit');
  const witnesses = [];
  for (let seat = 0; seat < state.players.length; seat++) {
    const visible = getVisibleTiles(state, seat);
    if (seat === source.seat || seat === victim.seat || result.cityGarrison?.some(g=>g.seat===seat) || visible.has(victim.tile)) {
      witnesses.push({seat, sawOrigin:seat === source.seat || visible.has(source.tile)});
    }
  }
  return function recordResult() {
    const journals = [...(state.battleReports || [])];
    for (const {seat, sawOrigin} of witnesses) {
      let observedAttacker = {kind:'unknown'};
      if (sawOrigin) observedAttacker = source;
      else if (result.advances && getVisibleTiles(state,seat).has(victim.tile)) {
        // The capturing unit can cross a long bridge out of fog. Only its arrival was visible.
        observedAttacker = {kind:source.kind, seat:source.seat, type:source.type, hpAfter:source.hpAfter};
      }
      const previous = journals[seat] || [];
      const report = {
        id:(previous.at(-1)?.id ?? 0) + 1, round:state.round,
        attacker:observedAttacker, target:victim,
        damage:result.damage, retaliation:sawOrigin ? result.retaliation : null, outcome,
        attackerLost:sawOrigin && Boolean(result.attackerDefeated), targetLost:Boolean(result.defeated)
      };
      if (sawOrigin && result.attackMode) report.attackMode=result.attackMode;
      if (result.cityGarrison?.length) {
        report.garrisonHits=result.cityGarrison.map(({seat,type,hpBefore,hpAfter})=>({seat,type,hpBefore,hpAfter}));
        if(result.capture)report.garrisonLost=result.cityGarrison.map(({seat,type})=>({seat,type}));
      }
      if (details.garrison) report.garrison = details.garrison;
      if (details.loot != null && seat === victim.seat) report.loot = details.loot;
      // Gaps in a shared sequence would disclose battles elsewhere on the map.
      journals[seat] = [...previous.slice(1 - historyLimit), report];
    }
    state.battleReports = journals;
  };
}
