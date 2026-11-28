const label=s=>'<span>'+s+'</span>';

export function freightPanel(manifest,esc,button,locked) {
  if(!manifest)return '';
  const {origin,cargo,routes,delivery,type,ready,food}=manifest;
  const rows=routes.map(route=>'<div><b>'+esc(route.name)+'</b> · '+esc(route.berth)+' · '+label(route.steps+' '+(route.steps===1?'hex':'hexes'))+
    ' · +'+route.gold+' '+label('Gold')+'</div>').join('');
  const hint=!cargo && !routes.length?'Chart a water route to a second friendly harbor.':
    !cargo && origin.food<food?'The departure city needs 4 stored food.':
    cargo?'Unload at another friendly berth for food and gold, or return the crate to its origin.':'Take 4 food from this city and carry it to another friendly berth.';
  const title={loadFreight:'Load coastal freight',landFreight:'Deliver coastal freight',returnFreight:'Return cargo to origin'}[type];
  return '<section class="recovery-panel"><header>'+label('Coastal freight')+'<b>'+label(cargo?'Crate aboard':'Empty hold')+'</b></header>'+
    '<div>'+label(cargo?'Loaded at':'Departure harbor')+' · '+esc(origin.name)+'</div><p>'+label(hint)+'</p>'+rows+
    (delivery?'<div>+4 '+label('Food')+' · +'+delivery.gold+' '+label('Gold')+'</div>':'')+
    (title?button(type,title,'Spends all remaining movement','gold',locked||!ready):'')+'</section>';
}

export function voyagePanel(quote,esc,button,locked) {
  if(!quote)return '';
  const {harbor,stocked,underway,price,budget,base,after,ready}=quote;
  return '<section class="recovery-panel"><header>'+label('Voyage supplies')+
    '<b>'+label(stocked?'Supplies stowed':underway?'Extended sailing turn':'Harbor outfitter')+'</b></header>'+
    (harbor?'<div>'+esc(harbor)+'</div>':'')+
    (stocked?'<div>'+label('Movement next turn')+' · '+after+'</div>':
      underway?'<div>'+label('Movement this turn')+' · '+after+' · '+label('Normal range next turn')+' · '+base+'</div>':'')+
    (harbor && !stocked?'<div>'+label('Movement next turn')+' · '+base+' → '+after+'</div><div>'+label('Price in gold')+' · '+price+' · '+label('Treasury')+' · '+budget+'</div>'+
      button('provisionVoyage','Outfit for a long voyage','Spends all remaining movement','gold',locked||!ready):'')+'</section>';
}
