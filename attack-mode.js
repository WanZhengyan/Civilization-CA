// The attack command uses one mode for each formation. Ships fire even when
// their range is only one hex. Target distance never turns a shot into melee.
export function attackMode(definition) {
  if (!definition?.range) return null;
  return definition.domain==='sea' || definition.range>1 ? 'ranged' : 'melee';
}

export function witnessedMode(report,definitions) {
  // Early saves have no explicit mode. A seat that saw the attacker may
  // reconstruct it from the recorded unit type, never from the current map.
  if (report.attacker.kind==='unknown' || report.retaliation==null) return null;
  return report.attackMode || (report.attacker.kind==='unit' ? attackMode(definitions[report.attacker.type]) : null);
}

export function forecastCounterLabel(result) {
  const loss=result.retaliation+' retaliation damage';
  if (result.attackMode==='ranged') return 'Ranged strike · '+loss;
  if (result.attackMode==='melee') return 'Melee strike · '+loss;
  return result.retaliation ? loss : 'No retaliation';
}

export function garrisonImpact(unit,cityDamage,captured) {
  const hpAfter=captured ? 0 : Math.max(0,unit.hp-Math.round(cityDamage/4));
  return {id:unit.id,seat:unit.seat,type:unit.type,hpBefore:unit.hp,hpAfter,maxHp:unit.maxHp};
}

export const captureOrderHint='Finish the capture with a ground unit such as Militia.';

export function cityAttackHint(forecast,definition,city) {
  if(!city)return '';
  if(forecast.defenderType==='city' && forecast.cityGarrison?.length)
    return forecast.capture?'On capture, the city garrison is defeated and removed.':'Each garrison unit loses 25% of the HP lost by the city, rounded to the nearest whole point.';
  if(forecast.defenderType==='city' && !definition.captures)return 'This unit can weaken a city down to 1 HP.';
  return '';
}

// A teammate may change a siege while the confirmation dialog is open.
export function siegeQuote(forecast) {
  if(!Array.isArray(forecast?.cityGarrison))return undefined;
  return JSON.stringify([forecast.defenderId,forecast.defenderHpBefore,forecast.defenderHpAfterHit,
    forecast.attackerHpAfter,forecast.capture,forecast.cityGarrison.map(g=>JSON.stringify([g.id,g.seat,g.type,g.hpBefore,g.hpAfter])).sort()]);
}
