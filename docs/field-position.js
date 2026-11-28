const positions = {
  forest: {guard:8, benefit:'Woodland cover absorbs 8 additional damage.'},
  hills: {guard:10, benefit:'A dug-in ridge absorbs 10 additional damage.'},
  open: {guard:4, benefit:'Fieldworks absorb 4 additional damage.'}
};

export function fieldPosition(state, unit, definition, terrain) {
  if (state.campaignVariety!==1 || !definition?.strength || definition.domain==='sea' || !unit) return null;
  return positions[terrain] || positions.open;
}

export function holdGround(state, unit, definition, terrain) {
  if (!fieldPosition(state,unit,definition,terrain) || unit.fortified || unit.moves!==unit.maxMoves)
    throw new Error('Fortifying requires a full move allowance on an armed land unit.');
  unit.fortified=true;
  unit.moves=0;
}

export function fieldPositionPanel(position, unit, own, disabled) {
  if (!position || (!own && !unit.fortified)) return '';
  const button=own && !unit.fortified ? '<button type="button" class="service-commit" data-order="fortify" '+
    (disabled || unit.moves!==unit.maxMoves?'disabled':'')+'><span>Fortify</span> · <span>Full movement</span></button>' : '';
  const details=own && !unit.fortified ? '<small>Holds until the unit takes another order.</small>' : '';
  return '<section class="recovery-panel"><header><span>'+(unit.fortified?'Fortified position':'Prepare defenses')+'</span></header>'+
    '<div>'+position.benefit+'</div>'+details+button+'</section>';
}

export const positionTranslations=`
Fortify|构筑工事
Prepare defenses|准备防守
Full movement|全部移动力
Fortified position|已构筑工事
Holds until the unit takes another order.|防守姿态将持续至该单位执行其他命令。
Woodland cover absorbs 8 additional damage.|林地掩体使每次受到的伤害再减少 8 点。
A dug-in ridge absorbs 10 additional damage.|山脊工事使每次受到的伤害再减少 10 点。
Fieldworks absorb 4 additional damage.|野战工事使每次受到的伤害再减少 4 点。
Fortifying requires a full move allowance on an armed land unit.|仅剩余全部移动力的武装陆地单位可以构筑工事。
The unit prepared a defensive position.|单位已构筑防御工事。
`;
