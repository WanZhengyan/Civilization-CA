function line(label, value) {
  return '<div><span>'+label+'</span><b>'+value+'</b></div>';
}
function signed(value) { return (value > 0 ? '+' : '') + value; }
export function populationSummary(p) {
  const notice = p.starvationTurns ? 'Population loss' : p.growthTurns ? 'Next citizen' : 'Population stable';
  const time = p.starvationTurns || p.growthTurns;
  return '<div class="city-food-report">'+line('Stored food',p.food+' / '+p.threshold)+
    line('Harvest',p.harvest)+line('Consumption',p.consumption)+line('Food balance',signed(p.surplus))+
    line(notice,time ? time+' '+(time===1?'turn':'turns') : '—')+'</div>';
}
