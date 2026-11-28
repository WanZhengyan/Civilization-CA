export function borderSummary(report, district, escape) {
  if (!report) return '';
  const turns=report.turns===null ? 'Frontier blocked' : report.turns+' '+(report.turns===1?'turn':'turns');
  const target=district ? '<button type="button" class="border-locate" data-frontier-tile="'+escape(report.tile)+'"><span>Locate next district</span><b>'+escape(district.name)+'</b></button>' :
    '<p class="panel-note">Explore or clear neutral land within three steps.</p>';
  const sources=report.surveying || report.federation ? [
    '<div><span>Residents</span><b>+'+report.residents+'</b></div>',
    report.surveying ? '<div><span>Land Surveying</span><b>+'+report.surveying+'</b></div>' : '',
    report.federation ? '<div><span>County Federation</span><b>+'+report.federation+'</b></div>' : ''
  ].join('') : '';
  return '<div class="city-food-report border-summary"><div><span>Border expansion</span><b>'+turns+'</b></div>'+
    '<progress max="'+report.required+'" value="'+report.progress+'" aria-label="Border progress"></progress>'+
    '<div><span>Border progress</span><b>'+report.progress+' / '+report.required+'</b></div>'+
    '<div><span>Points per turn</span><b>+'+report.rate+'</b></div>'+sources+target+'</div>';
}
