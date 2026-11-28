export const TRAINING_XP=3;
const drills={
  assault:{name:'Assault training',effect:'Deal 6 additional damage when attacking.'},
  guard:{name:'Guard training',effect:'Reduce damage received by 6, including counterattacks.'}
};
export function militaryTraining(state,unit,definition) {
  if (state.campaignVariety!==1 || !unit || !definition?.strength) return null;
  return {xp:unit.combatXP || 0, drill:drills[unit.drill] || null};
}
export function recordExperience(state,unit,definition,finishedOpponent) {
  const training=militaryTraining(state,unit,definition);
  if (!training || training.drill || unit.hp<=0) return;
  unit.combatXP=Math.min(TRAINING_XP,training.xp+1+Number(finishedOpponent));
}
export function chooseDrill(state,unit,definition,id) {
  const training=militaryTraining(state,unit,definition);
  if (!training || training.xp<TRAINING_XP || training.drill || !Object.hasOwn(drills,id) || !unit.moves)
    throw new Error('Choose an untrained military unit with 3 combat XP and movement left.');
  unit.drill=id;
  unit.moves=0;
}
export function drillAttack(state,unit) {
  return state.campaignVariety===1 && unit.drill==='assault' ? 6 : 0;
}
export function drillDefense(state,unit) {
  return state.campaignVariety===1 && unit?.drill==='guard' ? 6 : 0;
}
export const attackTrainingNote='Assault training adds 6 attack damage.';
export const defenseTrainingNote='Guard training absorbs up to 6 incoming damage.';
export const counterTrainingNote='Guard training absorbs up to 6 counterdamage.';
export function trainingPanel(training,own,disabled) {
  if (!training || (!own && !training.drill)) return '';
  const title=training.drill ? training.drill.name : 'Combat experience';
  const summary=training.drill ? training.drill.effect :
    'Survive a damaging battle for 1 XP. Defeating the opponent grants 1 extra XP.';
  const meter=training.drill ? '' : '<b>'+training.xp+' / '+TRAINING_XP+' XP</b>';
  const ready=own && !training.drill && training.xp>=TRAINING_XP;
  const choices=ready ? '<div>Choose one permanent drill. Training spends remaining movement.</div>'+
    Object.entries(drills).map(([id,drill])=>'<button type="button" class="service-commit" data-order="train:'+id+
      '" '+(disabled?'disabled':'')+'><b>'+drill.name+'</b><br><span>'+drill.effect+'</span></button>').join('') : '';
  return '<section class="recovery-panel"><header><span>'+title+'</span>'+meter+'</header><div>'+summary+'</div>'+choices+'</section>';
}

export const trainingTranslations=`
Combat experience|战斗经验
Assault training|突击训练
Guard training|防护训练
Deal 6 additional damage when attacking.|主动攻击额外造成 6 点伤害。
Reduce damage received by 6, including counterattacks.|每次受到的伤害减少 6 点，也可抵消反击伤害。
Survive a damaging battle for 1 XP. Defeating the opponent grants 1 extra XP.|在造成伤害的战斗中存活可获 1 点经验，击败对手额外获得 1 点。
Choose one permanent drill. Training spends remaining movement.|永久选择一种训练，消耗本回合剩余移动力。
Choose an untrained military unit with 3 combat XP and movement left.|选择有 3 点战斗经验、尚未受训且仍有移动力的军事单位。
The unit completed assault training.|该单位已完成突击训练。
The unit completed guard training.|该单位已完成防护训练。
${attackTrainingNote}|突击训练使攻击伤害增加 6 点。
${defenseTrainingNote}|防护训练抵消最多 6 点来袭伤害。
${counterTrainingNote}|防护训练抵消最多 6 点反击伤害。
`;
