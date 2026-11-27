import {getSightRadius} from './vision.js';
import {createAtlas} from "./atlas.js";
import {drawUnitPortrait} from "./unit-art.js";
import {Game} from "./game.js";
import {FACTIONS,getMap,getCivicOptions,getEra,ERAS,MAX_ROUNDS,getRouteDetail,getSettlementAssessment,getResearchOptions,combatPreview,getActions,getStats,getCityYield,getProductionOptions,getUnitOptions,UNIT_TYPES,BUILDINGS,IMPROVEMENTS} from "./rules.js";

const el=id=>document.getElementById(id);
const names=FACTIONS.map(f=>f.name);
const items=Object.fromEntries(Object.entries({...UNIT_TYPES,...BUILDINGS,...IMPROVEMENTS}).map(([key,v])=>[key,v.name]));
const terrain={ocean:"Open ocean",coast:"Coast",plains:"Lowlands",urban:"Urban",forest:"Woodland",hills:"Foothills",mountains:"Mountains"};
const unitRole={settler:"Civilian unit",builder:"Engineering unit",melee:"Melee unit",ranged:"Ranged unit"};
const isSeaUnit=item=>UNIT_TYPES[item]?.domain==="sea";
const portBuildings=new Set(["harbor","shipyard"]);
const eraName=id=>ERAS[id]?.name||id;
let mapRegion,councilKind="research",lastCouncilMarkup="",lastProjectsMarkup="";
const itemDesc={settler:"Founds a new city at least three hexes from another city.",builder:"Builds farms and mines in your territory. Three charges.",melee:"Fights adjacent enemies and captures weakened cities.",ranged:"Strikes enemies up to two hexes away.",granary:"Adds 2 food per turn to help this city grow.",workshop:"Adds 2 production per turn in this city.",monument:"Adds 3 influence per turn.",walls:"Increases this city’s defenses."};
const symbols={
  science:'<path d="M9 3h6m-5 0v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8"/>',
  civic:'<path d="m3 9 9-6 9 6M4 10h16M6 13v5m4-5v5m4-5v5m4-5v5M3 21h18M4 19h16"/>',
  harbor:'<circle cx="12" cy="5" r="2"/><path d="M12 7v13m-4-9h8M3 14v3c1 3 6 5 9 5 3 0 8-2 9-5v-3M3 14l3 2m15-2-3 2"/>',
  shipyard:'<path d="M3 20h18M6 16V4h12l-4 4H8m8 1v4m-5 2h11l-2 3h-7z"/>',
  workboat:'<path d="M3 15h17l-3 4H7zM7 14V9h5v4m2 0V4l6 2v5m-3-1 3 1"/>',
  cutter:'<path d="M2 15h20l-4 5H6zM6 14l2-5h7l3 5m-7-5V4h4M3 22h18"/>',
  frigate:'<path d="M2 15h20l-3 5H6zM6 14l3-5h7l2 5m-7-5V3h4m-1 9h6M4 22h16"/>',
  fishery:'<path d="M3 13q5-8 12-3l5-3v10l-5-3q-8 6-12-1z"/><circle cx="8" cy="12" r=".5"/>',
  scout:'<path d="m3 15 3-8h3l1 6m4 0 1-6h3l3 8M9 14h6"/><circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/>',
  cavalry:'<path d="M4 21h16m-13-3 3-5-4 1-2-3 5-6 3-1 5-1-1 3c4 4 3 9 3 12z"/>',
  riflemen:'<path d="m4 18 3 3 4-6 3-1 7-9-2-2-8 9-3 1z"/>',
  artillery:'<circle cx="8" cy="17" r="4"/><path d="m8 13 11-8 3 4-10 7m-1 2 8 3"/>',
  armor:'<path d="M3 15h18l-1 4H5zM6 14l3-5h6l2 5m-2-3 6-2"/><circle cx="8" cy="17" r=".5"/><circle cx="12" cy="17" r=".5"/><circle cx="16" cy="17" r=".5"/>',
  settler:'<path d="M5 21V4l11 2-3 3 3 3-11-2M3 21h6"/>',
  builder:'<path d="m4 20 10-10m-3-2 4-4 5 5-3 3-4-3M4 20l2 1"/>',
  melee:'<path d="m5 19 3-3 8-10 4-2-1 5-10 9m-4-5 6 6"/>',
  ranged:'<path d="M3 4q14-1 17 16L4 4m1 15 13-13m-5 0h5v5"/>',
  city:'<path d="M3 21h18M5 20V9h5v11m0-14 4-3 4 3v14m0-10h3v10M7 12h1m5-3h2m-2 4h2"/>',
  land:'<path d="m3 18 5-9 4 6 3-4 6 7H3z"/><circle cx="17" cy="6" r="2"/>',
  move:'<path d="M12 2v20M2 12h20M9 5l3-3 3 3m-6 14 3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3"/>',
  attack:'<path d="m3 3 4 1 12 14m-4 1 4-5m-9-1-5 6-2-2 5-6m5-2 4-5 4-1-1 4-5 4"/>',
  found:'<path d="M3 21h18M5 20V10l4-4 4 4v10m0-8 3-3 4 3v8M9 6V2m0 0 5 1-5 2"/>',
  farm:'<path d="M12 21V8m-1 7C7 16 4 12 4 8c4 0 7 2 8 6m1-1c1-4 4-6 8-6-1 4-4 7-8 7m-1-6c-3-2-3-4 0-7 3 3 3 5 0 7"/>',
  mine:'<path d="M3 20 16 7m-7-3c5-1 9 1 13 6l-6-2-3-2z"/>',
  production:'<path d="M3 20V9l6 3V8l6 3 2-8h3l1 17H3zm4-4h2m3 0h2m3 0h1"/>',
  granary:'<path d="m3 9 9-6 9 6M5 9h14v11H5zM9 13h6v7"/>',
  workshop:'<path d="m4 20 9-9m-2-4 5-4 5 6-4 3-4-4M3 21l2-1"/>',
  monument:'<path d="M5 21h14m-11-3 2-13 2-3 2 3 2 13m-10 3v-3h12v3"/>',
  walls:'<path d="M3 20V8h3V5h3v3h6V5h3v3h3v12H3zm6 0v-4a3 3 0 0 1 6 0v4"/>'
};
function icon(key){return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(symbols[key]||symbols.land)+'</svg>'}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function text(id,v){const node=el(id);if(node.textContent!==String(v))node.textContent=String(v)}
function fmt(v){return String(v??"—")}
function sameId(a,b){return a!=null&&b!=null&&String(a)===String(b)}
function actionButton(key,title,detail,style="",disabled=false,pressed=false){
  return '<button class="order-btn '+style+'" data-order="'+esc(key)+'" '+(disabled?'disabled':'')+(pressed?' aria-pressed="true"':'')+'>'+icon(key==='choose-production'?'production':key)+'<b>'+esc(title)+'</b><small>'+esc(detail)+'</small></button>';
}
function stat(label,value,total){return '<div class="entity-stat"><small>'+esc(label)+'</small><strong>'+esc(fmt(value))+(total!=null?' <em>/ '+esc(total)+'</em>':'')+'</strong></div>'}
function healthBar(cur,max){return '<div class="entity-health"><i style="width:'+percentage(cur,max)+'%"></i></div>'}
function percentage(cur,max){return Math.min(100,Math.max(0,Number(cur)/Math.max(1,Number(max))*100))||0}
function note(s){return s?'<p class="panel-note">'+esc(s)+'</p>':''}
function tileAt(){return mapRegion.byId[selectedTile]}
function cityAt(tile){return view.state.cities.find(c=>c.tile===tile)}
function getUnit(){return view.state.units.find(u=>sameId(u.id,selectedUnit))}
function faction(seat){const player=view.state.players[seat];return {name:names[player?.faction??seat],color:FACTIONS[player?.faction??seat]?.color||"#9aabb2"}}
function ownUnits(){return view.state.units.filter(u=>u.seat===view.seat)}
function ownCities(){return view.state.cities.filter(c=>c.seat===view.seat)}
function customCity(city){return Boolean(city && city.name!==mapRegion.byId[city.tile]?.name)}
function cityNameAttrs(city){return customCity(city)?' translate="no"':''}
function lobby(){return view.mode==="online"&&view.room?.phase==="lobby"}
function mayOrder(){return view.state.phase==="playing"&&view.state.turn===view.seat&&!lobby()&&!view.busy}
let view,atlas,selectedTile,selectedUnit,kind="tile",order="",matchKey="",activeRoster="units",timer,productionCity=null;
let hoverId=null, battle=null, selectedOptions=null, feedbackTimer, previousEvent="";
const unavailableArt=new Set();
let surveyUnitId=null;
let survey=new Map(), explored=new Set(), visible=new Set();
function toast(message){text("toast",message);el("toast").hidden=false;clearTimeout(timer);timer=setTimeout(()=>el("toast").hidden=true,3200)}
function select(tile,unit=null,city=false){
  if(!mapRegion.byId[tile])return;
  order="";selectedTile=tile;
  const candidates=view.state.units.filter(u=>u.tile===tile);
  const piece=candidates.find(u=>sameId(u.id,unit)) || (city ? null : candidates.find(u=>u.seat===view.seat)||candidates[0]);
  const place=cityAt(tile);
  kind=piece?"unit":place?"city":"tile";selectedUnit=piece?.id??null;
}
function selectOpening(){
  const units=ownUnits(),starter=units.find(u=>u.type==="settler"&&u.moves>0)||units.find(u=>u.moves>0)||units[0];
  if(starter)select(starter.tile,starter.id);
  else {const city=ownCities()[0];select(city?.tile || view.state.intel?.explored?.[0] || mapRegion.tiles[0].id,null,true)}
}
function openMapOnMobile(){
  if(window.matchMedia("(max-width:700px)").matches)el("map-frame").scrollIntoView({block:"center",behavior:"smooth"});
}
function onMapSelect(tileId,unitId){
  if(!view || !mapRegion.byId[tileId])return;
  if(!explored.has(tileId)) {toast("Uncharted territory. Move closer to explore.");return}
  const unit=getUnit(), targetUnit=view.state.units.find(u=>sameId(u.id,unitId));
  const available=unit && unit.seat===view.seat && mayOrder() && order!=="inspect";
  if(available && targetUnit?.seat!==view.seat){
    const options=getUnitOptions(view.state,unit.id);
    if(options.attacks.includes(tileId)){openCombat(unit.id,tileId);return}
    if(options.moves.includes(tileId) && order!=="attack"){
      Game.doAction({type:"move",unit:unit.id,tile:tileId});return;
    }
  }
  const keepInspect=order==="inspect";select(tileId,unitId);if(keepInspect)order="inspect";redraw();
}
function turnsText(value){return value+" "+(value===1?"turn":"turns")}
function nearestCityText(test){
  const c=test?.nearestCity;
  return c ? c.name+" is "+c.distance+" "+(c.distance===1?"hex":"hexes")+" away." : "";
}
function surveySummary(test,here){
  if(!test)return "";
  if(test.status==="invalid")return test.reason;
  if(test.status==="now")return here?"You can found a city here this turn.":"Move here and found a city this turn.";
  return here?"End your turn to restore movement, then found a city here.":"Move here and found a city next turn.";
}
function updateSurvey(){
  const u=kind==="unit"?getUnit():null;
  survey=new Map();
  surveyUnitId=u?.type==="settler" && u.seat===view.seat && mayOrder() ? u.id:null;
  if(surveyUnitId){
    for(const tile of [u.tile,...(selectedOptions?.moves||[])]){
      survey.set(tile,getSettlementAssessment(view.state,u.id,tile));
    }
  }
  el("settlement-key").hidden=!surveyUnitId;
  if(surveyUnitId)text("survey-sites","View sites ("+[...survey.values()].filter(s=>s.status!=="invalid").length+")");
  if(el("survey-modal").open)renderSurveyDialog();
}
function renderSurveyDialog(){
  const u=getUnit();
  if(!u || !sameId(surveyUnitId,u.id)){el("survey-modal").close();return}
  const source=survey.get(u.tile);
  const now=[...survey].filter(([,data])=>data.status==="now"),later=[...survey].filter(([,data])=>data.status==="next-turn");
  let html='<p class="survey-current"><strong>Current site · '+esc(mapRegion.byId[u.tile].name)+'</strong><span>'+esc(surveySummary(source,true))+'</span></p>';
  if(!now.length && !later.length)html+='<p class="survey-empty">No suitable sites are within this turn’s movement range.</p>';
  for(const [heading,sites] of [["Found this turn",now],["Found next turn",later]]){
    if(!sites.length)continue;
    html+='<h3 class="production-group">'+heading+'</h3><div class="survey-options-group">';
    for(const [id,data] of sites){
      const here=u.tile===id;
      const label=here?(data.status==="now"?"Found city":"Wait here"):"Move here";
      const cost=here?"Current hex":data.moveCost+" movement";
      html+='<div class="survey-option"><div><strong>'+esc(mapRegion.byId[id].name)+'</strong><small>'+esc(cost)+' · '+esc(terrain[mapRegion.byId[id].terrain])+'</small><small>'+esc(nearestCityText(data))+'</small></div><button class="modal-secondary" data-survey-site="'+esc(id)+'" '+(here && data.status!=="now"?"disabled":"")+'>'+label+'</button></div>';
    }
    html+='</div>';
  }
  el("survey-options").innerHTML=html;
}
function updateHint(id){
  hoverId=id;
  if(!view)return;
  if(id && !explored.has(id)){text("map-hint","Uncharted territory. Move closer to explore.");return}
  const tile=mapRegion.byId[id],u=getUnit();
  const ready=Boolean(u && u.seat===view.seat && mayOrder() && order!=="inspect");
  let hint=order==="inspect"?"Inspection mode. Click a hex to inspect it without moving.":"Select a unit, city or district to inspect it.";
  if(ready && selectedOptions?.moves.length)hint="Click a highlighted hex to move your "+items[u.type]+".";
  if(ready && order==="attack")hint="Click a red target to review the combat forecast.";
  if(tile){
    hint=tile.name+" · "+terrain[tile.terrain];
    if(ready && selectedOptions?.attacks.includes(id))hint+=" · Click to preview attack";
    else if(ready && selectedOptions?.moves.includes(id) && order!=="attack"){
      const route=getRouteDetail(view.state,u.id,id);
      hint+=" · Move here for "+route.cost+" movement"+(route.crossings.length?" · "+route.crossings.join(", "):"");
    }
  }
  if(surveyUnitId){
    const surveyInfo=tile ? (survey.get(id) || getSettlementAssessment(view.state,surveyUnitId,id)) : survey.get(selectedTile);
    if(tile && surveyInfo){
      const details=surveySummary(surveyInfo,id===selectedTile);
      hint=tile.name+" · "+(Number.isFinite(surveyInfo.moveCost) && id!==selectedTile?surveyInfo.moveCost+" movement · ":"")+details;
    }else if(!tile){
      const tests=[...survey.values()],now=tests.filter(v=>v.status==="now").length,later=tests.filter(v=>v.status==="next-turn").length;
      if(now)hint=now+" "+(now===1?"site is":"sites are")+" ready to settle this turn. Follow a gold flag or open View sites.";
      else if(later)hint=later+" "+(later===1?"site":"sites")+" within reach. Follow a blue flag to settle next turn.";
      else hint="No suitable sites are within the settler’s current movement range.";
    }
  }
  if(order==="inspect" && surveyUnitId)hint="Inspect mode · "+hint;
  if(tile && !visible.has(id))hint=tile.name+" · "+terrain[tile.terrain]+" · Outside current sight";
  if(tile && mapRegion.bridgesByTile?.[tile.id])hint+=" · "+mapRegion.bridgesByTile[tile.id].map(b=>b.name).join(", ");
  text("map-hint",hint);
}
function flash(message){
  text("map-feedback",message);el("map-feedback").hidden=false;clearTimeout(feedbackTimer);
  feedbackTimer=setTimeout(()=>el("map-feedback").hidden=true,3400);
}
function entityTabs(tile,selected){
  const units=view.state.units.filter(u=>u.tile===tile);
  const choices=units.map(u=>({id:'u'+u.id,label:items[u.type]||u.type,selected:kind==="unit"&&sameId(selected?.id,u.id)}));
  if(cityAt(tile))choices.push({id:'city',label:'City',selected:kind==="city"});
  if(choices.length)choices.push({id:"land",label:"District",selected:kind==="tile"});
  const bar=el("entity-tabs");
  bar.hidden=choices.length<2;
  bar.innerHTML=choices.map(x=>'<button type="button" data-entity="'+esc(x.id)+'" aria-pressed="'+x.selected+'">'+esc(x.label)+'</button>').join('');
}
function artFor(tile,city){
  if(tile.landmark==="downtown" || (city && tile.terrain==="urban"))return 'downtown';
  if(['coast','ocean'].includes(tile.terrain))return 'coast';
  if(['hills','mountains','forest'].includes(tile.terrain))return 'hills';
  return 'neighborhoods';
}
function cityQueue(city){
  const q=city.queue;
  if(!q)return '<p class="inspect-caption idle-status"><i></i> This city is ready to produce.</p>';
  const production=getCityYield(view.state,city.id).production;
  const turns=Math.ceil(Math.max(0,q.required-q.progress)/Math.max(1,production));
  const remaining=q.progress>=q.required?'Awaiting deployment':turnsText(turns)+' left';
  return '<div class="queue-info"><div class="queue-name"><strong>Producing · '+esc(items[q.item]||q.item)+'</strong><small>'+remaining+'</small></div><div class="queue-progress"><i style="width:'+percentage(q.progress,q.required)+'%"></i></div></div>';
}
function inspect(){
  const state=view.state,tile=tileAt(),unit=getUnit(),city=cityAt(selectedTile);
  if(!tile || !explored.has(selectedTile)){
    text("hex-coord","—");text("entity-kind","Survey");text("entity-name","Uncharted territory");text("entity-location","");
    el("unit-portrait").hidden=true;el("district-img").style.visibility="hidden";el("entity-tabs").innerHTML="";
    selectedOptions=null;updateSurvey();el("entity-info").innerHTML="";el("entity-commands").innerHTML=note("Uncharted territory. Move closer to explore.");return;
  }
  el("district-img").style.visibility="";
  const activeUnit=kind==="unit"?unit:null,activeCity=kind==="city"?city:null;
  const owner=activeUnit?.seat??activeCity?.seat??state.board[tile.id]?.owner;
  const gov=owner!=null?faction(owner):null,own=owner===view.seat && !lobby();
  text("hex-coord","HEX "+[tile.q,tile.r].map(v=>String(v).padStart(2,"0")).join(" / "));
  const image=el("district-img");
  const port=state.cities.find(c=>c.portTile===tile.id);
  const atHarbor=activeCity?.buildings.includes("harbor") || port || state.board[tile.id]?.improvement==="fishery";
  const fallback=atHarbor?"./art/harbor.webp":'./'+artFor(tile,activeCity)+'.webp';
  const unitArt=activeUnit?'./art/'+activeUnit.type+'.webp':null;
  const fullArt=unitArt&&!unavailableArt.has(unitArt);
  const art=fullArt?unitArt:fallback;
  const portrait=el("unit-portrait");
  portrait.hidden=!activeUnit||Boolean(fullArt);
  if(fullArt){
    image.onerror=()=>{unavailableArt.add(unitArt);image.onerror=null;image.src=fallback;portrait.hidden=false;drawUnitPortrait(portrait,activeUnit.type,gov.color)};
  }else{image.onerror=null;if(activeUnit)drawUnitPortrait(portrait,activeUnit.type,gov.color)}
  if(image.getAttribute("src")!==art)image.src=art;
  text("entity-kind",activeUnit ? (own?"Your ":"Rival ")+(UNIT_TYPES[activeUnit.type].role||unitRole[activeUnit.type]||"unit") : activeCity ? (own?"Your city":"Rival city") : (port?"Harbor district":tile.landmark?"Landmark":"District"));
  el("entity-name").translate=!customCity(activeCity);
  text("entity-name",activeUnit ? (items[activeUnit.type]||activeUnit.type) : activeCity?.name||(port?"Harbor":tile.name));
  text("entity-location",activeUnit ? tile.name : activeCity ? gov.name : port?.name||terrain[tile.terrain]);
  entityTabs(tile.id,activeUnit);
  const disabled=!mayOrder()||!own;
  let info="",actions="",explanation="";
  selectedOptions=activeUnit?getUnitOptions(state,activeUnit.id):null;
  updateSurvey();
  if(activeUnit){
    const u=activeUnit,o=selectedOptions;
    info='<div class="entity-stats">'+stat("Health",u.hp,u.maxHp)+stat("Movement",u.moves,u.maxMoves)+(["builder","workboat"].includes(u.type)?stat("Charges",u.charges):(UNIT_TYPES[u.type].range?stat("Range",UNIT_TYPES[u.type].range):stat("Terrain",terrain[tile.terrain])))+'</div>'+healthBar(u.hp,u.maxHp);
    info+='<div class="unit-sight"><span>'+icon("inspect")+' Sight radius</span><strong>'+getSightRadius(u.type)+' <small>hexes</small></strong></div>';
    if(own){
      const moving=o.moves.length>0 && order!=="inspect" && order!=="attack";
      actions+=actionButton("move",moving?"Move unit":"Show moves",moving?o.moves.length+" hexes":u.moves?"Select":"Spent","green",disabled||!o.moves.length,moving);
      if(u.type==="settler"){
        const capital=state.opening==="settlers" && !state.cities.some(c=>c.originalSeat===view.seat);
        actions+=actionButton("found",capital?"Found capital":"Found city",o.canFound?"Settle here":"Unavailable","gold",disabled||!o.canFound);
        const assessment=survey.get(u.tile);
        explanation=assessment?surveySummary(assessment,true):"Settle at least three hexes from every city, with movement remaining.";
        if(assessment?.nearestCity && !explanation.includes(assessment.nearestCity.name))explanation+=" "+nearestCityText(assessment);
      }else if(u.type==="builder"||u.type==="workboat"){
        const water=u.type==="workboat";
        for(const item of water?["fishery"]:["farm","mine"]){
          const ok=o.improvements.includes(item);
          actions+=actionButton(item,'Build '+items[item].toLowerCase(),ok?'1 charge':'Unavailable',"gold",disabled||!ok);
        }
        explanation=water?"Build a fishery within two water hexes of a friendly harbor for +2 food and +1 capital.":"Build on an unimproved, friendly district outside a city.";
      }else{
        actions+=actionButton("attack","Preview attack",o.attacks.length+' '+(o.attacks.length===1?'target':'targets'),"red",disabled||!o.attacks.length,order==="attack");
        const definition=UNIT_TYPES[u.type];
        explanation=definition.description||itemDesc[u.type]||("Attack range · "+definition.range+" hexes.");
      }
      if(o.upgrade){
        actions+=actionButton("upgrade","Upgrade to "+items[o.upgrade.to],o.upgrade.cost+" capital","gold",disabled||!o.upgrade.enabled);
        if(!o.upgrade.enabled&&o.upgrade.reason)explanation+=" "+o.upgrade.reason;
      }
    }else explanation="Select a friendly unit to give orders.";
  }else if(activeCity){
    const c=activeCity,y=getCityYield(state,c.id);
    if(!own) {
      info='<div class="entity-stats">'+stat("Population",c.population)+stat("City HP",c.hp,c.maxHp)+'</div>'+healthBar(c.hp,c.maxHp);
      el("entity-info").innerHTML=info;el("entity-commands").innerHTML=note("Only the city owner can inspect its economy.");return;
    }
    info='<div class="entity-stats">'+stat("Population",c.population)+stat("Production","+"+y.production)+stat("City HP",c.hp,c.maxHp)+'</div>'+healthBar(c.hp,c.maxHp);
    const buildings=(c.buildings||[]).map(i=>items[i]||i);
    if(buildings.length)info+='<p class="built-list">Buildings · '+esc(buildings.join(", "))+'</p>';
    info+='<p class="built-list">Food '+c.food+' / '+(6+2*c.population)+' · +'+y.food+' per turn</p>'+cityQueue(c);
    if(own)actions=actionButton("choose-production",c.queue?"View production":"Choose production","City orders","gold",false);
  }else{
    const holding=state.board[tile.id];
    if(!visible.has(tile.id)){
      el("entity-info").innerHTML=stat("Terrain",terrain[tile.terrain])+(holding?.resource ? stat("Resource",items[holding.resource]||holding.resource) : "");
      el("entity-commands").innerHTML=note("Outside current sight");return;
    }
    info='<div class="province-meta"><i style="background:'+esc(gov?.color||"#98a1a6")+'"></i>'+esc(gov?.name||(tile.terrain==="ocean"?"Open water":"Unclaimed land"))+'</div><div class="entity-stats">'+stat("Terrain",terrain[tile.terrain])+stat("Improvement",items[holding?.improvement]||"None")+'</div>';
    const territory=getActions(state,view.seat,tile.id)[0];
    if(port){
      if(port.seat===view.seat)actions=actionButton("port-production","Port production",port.name,"gold");
      explanation="Ships launch here and repair in nearby water.";
    }else if(territory){
      const cost=[territory.cost.capital && (territory.cost.capital+" capital"),territory.cost.influence && (territory.cost.influence+" influence")].filter(Boolean).join(" · ");
      actions=actionButton(territory.type,territory.label,cost,"gold",!mayOrder()||!territory.enabled);
      explanation=territory.reason || state.actionsLeft+" district orders remain this turn.";
    }else explanation=tile.terrain==="ocean"?"Land units cannot cross open water.":"Select a unit to give orders or a city to set production.";
  }
  if(order==="attack")explanation="Select an enemy outlined in red to review the combat forecast.";
  el("entity-info").innerHTML=info;
  el("entity-commands").innerHTML='<div class="orders">'+actions+'</div>'+note(explanation);
}
function updateMap(){
  const u=getUnit(),ready=u && u.seat===view.seat && mayOrder() && order!=="inspect";
  const settlementSites={now:[],nextTurn:[]};
  for(const [id,assessment] of survey){
    if(assessment.status==="now")settlementSites.now.push(id);
    else if(assessment.status==="next-turn")settlementSites.nextTurn.push(id);
  }
  atlas.update({settlementSites,state:view.state,selectedId:selectedTile,selectedUnitId:u?.id??null,moveTiles:ready && order!=="attack"?selectedOptions?.moves||[]:[],attackTiles:ready?selectedOptions?.attacks||[]:[],targetId:battle?.tile??null});
  el("inspect-map").setAttribute("aria-pressed",String(order==="inspect"));
  updateHint(hoverId);
}
function roster(){
  const unitTab=activeRoster==="units",ownList=unitTab?ownUnits():ownCities();
  el("roster-units").setAttribute("aria-pressed",String(unitTab));el("roster-cities").setAttribute("aria-pressed",String(!unitTab));
  el("roster").innerHTML=ownList.map(o=>{
    const active=unitTab ? kind==="unit"&&sameId(o.id,selectedUnit) : kind==="city"&&o.tile===selectedTile;
    const label=unitTab ? items[o.type]||o.type : o.name;
    const turns=unitTab?null:projectTurns(o);
    const subtitle=unitTab?o.moves+' / '+o.maxMoves+' movement':o.queue?(items[o.queue.item]||o.queue.item)+' · '+(turns?turnsText(turns):'Awaiting deployment'):'Awaiting production';
    return '<button class="roster-unit" aria-pressed="'+active+'" data-roster-id="'+esc(o.id)+'"><span class="roster-symbol">'+icon(unitTab?o.type:'city')+'</span><span><b'+(unitTab?'':cityNameAttrs(o))+'>'+esc(label)+'</b><small>'+esc(subtitle)+'</small></span></button>';
  }).join('')||'<div class="roster-empty">'+(unitTab?'You have no units in the field.':'You have no cities.')+'</div>';
  el("next-unit").disabled=!mayOrder()||!ownUnits().some(u=>u.moves>0);
}
function redraw(){inspect();updateMap();roster()}
function projectTurns(city){
  if(!city.queue)return null;
  const remaining=Math.max(0,city.queue.required-city.queue.progress);
  return Math.ceil(remaining / Math.max(1,getCityYield(view.state,city.id).production));
}
function paintProjects(){
  const cities=ownCities();
  const markup=cities.map(city=>{
    const turns=projectTurns(city);
    const status=turns===null?"Choose production":turns===0?"Awaiting deployment":items[city.queue.item]||city.queue.item;
    return '<button class="watch-city" type="button" data-watch="'+esc(city.id)+'"><strong'+cityNameAttrs(city)+'>'+esc(city.name)+'</strong><span>'+esc(status)+'</span>'+(turns>0?'<small>'+esc(turnsText(turns))+'</small>':'')+'</button>';
  }).join("");
  if(markup!==lastProjectsMarkup){el("watch-cities").innerHTML=markup;lastProjectsMarkup=markup}
}
function productionOptions(){
  const c=view.state.cities.find(c=>sameId(c.id,productionCity));
  if(!c||c.seat!==view.seat){closeProduction();return}
  el("production-city").translate=!customCity(c);
  text("production-city",c.name);
  const list=getProductionOptions(view.state,c.id);
  const groups=[
    ["Train a unit",list.filter(x=>x.kind==="unit"&&!isSeaUnit(x.item))],
    ["Construct a building",list.filter(x=>x.kind==="building"&&!portBuildings.has(x.item))],
    ["Port and fleet",list.filter(x=>isSeaUnit(x.item)||portBuildings.has(x.item))]
  ];
  const html=groups.filter(([,opts])=>opts.length).map(([heading,opts])=>{
    return '<h3 class="production-group">'+heading+'</h3><div class="production-grid">'+opts.map(o=>{
      const disabled=!o.enabled||!mayOrder();
      const def=UNIT_TYPES[o.item]||BUILDINGS[o.item];
      const desc=def.description||itemDesc[o.item]||o.label;
      return '<button class="production-item" data-produce="'+esc(o.item)+'" '+(disabled?'disabled':'')+'>'+icon(o.item)+'<span><strong>'+esc(items[o.item]||o.label)+'</strong><small>'+esc(desc)+'</small><small>'+(def.era?esc(eraName(def.era))+' · ':'')+esc(turnsText(o.turns))+' · '+esc(o.required)+' production</small>'+(o.reason?'<small>'+esc(o.reason)+'</small>':'')+'</span></button>';
    }).join('')+'</div>'});
  el("production-options").innerHTML=(c.queue?cityQueue(c):'')+html.join('');
}
function openProduction(){const c=cityAt(selectedTile);if(!c||c.seat!==view.seat)return;productionCity=c.id;productionOptions();el("production-modal").showModal()}
function closeProduction(){if(el("production-modal").open)el("production-modal").close();productionCity=null}
const councilTypes={
  research:{heading:"Technology",resource:"science",income:"scienceIncome",options:getResearchOptions,choose:"Choose research",done:"All research complete",action:"research"},
  civics:{heading:"Civics",resource:"culture",income:"cultureIncome",options:getCivicOptions,choose:"Choose a civic",done:"All civics complete",action:"civic"}
};
function councilState(id,player,stats){
  const config=councilTypes[id],options=config.options(view.state,view.seat);
  const active=options.find(o=>o.active),completed=options.filter(o=>o.completed).length;
  return {...config,options,active,completed,balance:player[config.resource]||0,rate:stats[config.income]||0};
}
function paintResearch(){
  const {state,seat}=view,player=state.players[seat],stats=getStats(state,seat);
  const era=getEra(state,seat),eraLabel=era.name+" Era";
  text("era-name",eraLabel);text("council-era",eraLabel);
  for(const id of Object.keys(councilTypes)){
    const c=councilState(id,player,stats),active=c.active,all=c.completed===c.options.length;
    text(id+"-name",active?active.label:all?c.done:c.choose);
    text(id+"-progress",active?c.balance+" / "+active.cost+" · "+turnsText(active.turns):"+"+c.rate+" "+c.resource+" per turn");
    el(id+"-meter").style.width=(active?percentage(c.balance,active.cost):all?100:0)+"%";
    el(id+"-card").disabled=lobby();
    el("switch-"+id).setAttribute("aria-pressed",String(id===councilKind));
    if(id!==councilKind||!el("research-modal").open)continue;
    text("research-title",c.heading);el("research-modal").dataset.council=id;
    const optionNames=Object.fromEntries(c.options.map(o=>[o.item,o.label]));
    const tiers=[...new Set(c.options.map(o=>o.era))];
    const eraGroups=tiers.map(tier=>{
      const cards=c.options.filter(o=>o.era===tier).map(o=>{
        const label=o.completed?"Complete":o.active?"In progress":o.locked?"Locked":o.turns===0?"Ready":turnsText(o.turns);
        const needs=o.requires.map(key=>optionNames[key]||key);
        const prereq=needs.length?'<span class="project-prereq">Requires '+esc(needs.join(" + "))+'</span>':'';
        return '<button class="project-option" data-project="'+esc(o.item)+'" data-status="'+(o.completed?'complete':o.active?'active':o.locked?'locked':'available')+'" '+(!o.enabled||!mayOrder()?'disabled':'')+'><span class="project-name">'+esc(o.label)+'</span><span class="project-description">'+esc(o.description)+'</span>'+prereq+'<span class="project-meta"><span>'+esc(o.cost+" "+c.resource)+'</span><b>'+esc(label)+'</b></span></button>';
      }).join("");
      return '<section class="council-tier"><h3>'+esc(eraName(tier))+'</h3><div class="project-grid">'+cards+'</div></section>';
    });
    const markup='<div class="council-summary"><strong>'+esc(c.balance+" "+c.resource)+'</strong><span>'+esc("+"+c.rate+" per turn")+'</span><span>'+c.completed+' / '+c.options.length+' complete</span></div>'+eraGroups.join("");
    if(markup!==lastCouncilMarkup){el("research-options").innerHTML=markup;lastCouncilMarkup=markup}
  }
  paintProjects();
}
function openCouncil(id){
  councilKind=id;
  const dialog=el("research-modal");
  if(!dialog.open)dialog.showModal();
  paintResearch();
  dialog.querySelector(".council-scroll").scrollTop=0;
}
function forecastRow(role,label,before,after,max,damage,color){
  const percent=percentage(before,max), remaining=percentage(after,max);
  return '<div class="forecast-side"><div class="forecast-role">'+esc(role)+'</div><h3>'+esc(label)+'</h3><div class="forecast-hp"><b>'+before+' → '+after+'</b> HP</div><div class="forecast-bar"><i style="width:'+percent+'%;background:#75483d"></i><i style="width:'+remaining+'%;background:'+esc(color)+'"></i></div><small>'+esc(damage)+'</small></div>';
}
function drawCombat(){
  if(!battle)return false;
  const u=view.state.units.find(u=>sameId(u.id,battle.unit)), forecast=u&&combatPreview(view.state,u.id,battle.tile);
  if(!mayOrder()||!forecast){closeCombat();return false}
  const defender=forecast.defenderType==="city"?view.state.cities.find(c=>sameId(c.id,forecast.defenderId)):view.state.units.find(u=>sameId(u.id,forecast.defenderId));
  if(!defender){closeCombat();return false}
  text("combat-where",mapRegion.byId[battle.tile].name);
  const enemy=defender.type?items[defender.type]:defender.name;
  const attack=forecastRow("Attacker",items[u.type],forecast.attackerHpBefore,forecast.attackerHpAfter,u.maxHp,forecast.retaliation?forecast.retaliation+" retaliation damage":"No retaliation",faction(u.seat).color);
  const defend=forecastRow("Defender",enemy,forecast.defenderHpBefore,forecast.defenderHpAfterHit??forecast.defenderHpAfter,defender.maxHp,forecast.damage+" incoming damage",faction(defender.seat).color);
  const outcome=forecast.capture?"Your unit will capture this city.":forecast.attackerDefeated&&forecast.defeated?"Both units will fall.":forecast.attackerDefeated?"Your unit will fall in this attack.":forecast.defeated?"The defending unit will fall.":"Both sides will hold their positions.";
  el("combat-preview").innerHTML='<div class="forecast-grid">'+attack+defend+'</div><p class="forecast-outcome">'+esc(outcome)+'</p>';
  return true;
}
function openCombat(unit,tile){
  battle={unit,tile};
  if(!drawCombat())return;
  updateMap();if(!el("combat-modal").open)el("combat-modal").showModal();
}
function closeCombat(){
  battle=null;if(el("combat-modal").open)el("combat-modal").close();if(view&&atlas)updateMap();
}
function paint(next){
  const previousKey=matchKey;view=next;const {state,seat,mode,room}=next;
  mapRegion=getMap(state);
  visible=new Set(state.intel?.visible??Object.keys(state.board));explored=new Set(state.intel?.explored??Object.keys(state.board));
  const key=mapRegion.id+':'+mode+':'+(room?.code||next.session||'')+':'+seat;
  const focusOpening=key!==matchKey||!selectedTile||(state.round===1&&!explored.has(selectedTile));
  if(focusOpening){matchKey=key;activeRoster="units";selectOpening()}
  if(kind==="unit"){
    const u=getUnit();if(u)selectedTile=u.tile;else select(selectedTile,null,Boolean(cityAt(selectedTile)));
  }
  if(kind==="city"&&!cityAt(selectedTile))select(selectedTile);
  if(!mayOrder())order="";
  const player=state.players[seat],stats=getStats(state,seat),f=faction(seat);
  text("brand-region",mapRegion.shortName);text("campaign-title",mapRegion.name);
  text("chart-coordinate",mapRegion.coordinates);text("footer-region",mapRegion.shortName);
  document.querySelector(".map-panel").setAttribute("aria-label","Tactical map · "+mapRegion.shortName);
  text("faction-name",f.name);document.querySelector(".faction-icon").style.color=f.color;
  el("change-region").hidden=mode!=="solo";
  text("mode-name",mode==="solo"?"Solo campaign":"Online · "+room.code);document.querySelector(".multiplayer span").textContent=mode==="online"?"Room "+room.code:"Multiplayer";
  text("gold",player.capital);text("gold-rate","+"+stats.capitalIncome);text("score",stats.score);
  text("influence",player.influence);text("influence-rate","+"+stats.influenceIncome);text("unit-count",ownUnits().length);text("city-count",ownCities().length);
  const finished=state.phase==="finished",myTurn=state.turn===seat,waiting=lobby();
  text("turn-owner",waiting?"Room lobby":finished?"Campaign over":myTurn?"Your turn":faction(state.turn).name);
  text("turn-number",'Turn '+String(state.round).padStart(2,'0'));el("turn-number").title='Up to '+MAX_ROUNDS+' turns';
  text("end-label",waiting?"Open room":finished?"Standings":myTurn?"End turn":mode==="solo"?"Rivals playing…":"Waiting…");
  el("end-turn").disabled=!waiting&&!finished&&(!myTurn||view.busy);
  const event=state.log.at(-1);text("event-turn","TURN "+String(event?.round||1).padStart(2,"0"));text("event-text",event?Game.eventText(event):"");
  el("legend").innerHTML=state.players.map(p=>'<span class="legend-item"><i class="swatch" style="--swatch:'+FACTIONS[p.faction].color+'"></i>'+esc(names[p.faction])+'</span>').join('');
  const eventKey=event?JSON.stringify(event):"";
  if(previousKey===key && previousEvent && eventKey!==previousEvent && event?.seat===seat && !["start","end"].includes(event.type))flash(Game.eventText(event));
  previousEvent=eventKey;
  redraw();if(focusOpening && selectedTile && state.intel)atlas.focus(selectedTile,true);paintResearch();
  if(el("production-modal").open)productionOptions();
  if(el("combat-modal").open)drawCombat();
}
function chooseOrder(key){
  if(key==="port-production"){
    const port=ownCities().find(c=>c.portTile===selectedTile);
    if(port){select(port.tile,null,true);redraw();openProduction()}
    return;
  }
  if(key==="choose-production"){openProduction();return}
  if(["develop","claim","contest"].includes(key)&&mayOrder()){Game.doAction({type:key,tile:selectedTile});return}
  const u=getUnit();if(!u||!mayOrder()||u.seat!==view.seat)return;
  if(key==="move"){
    order="";redraw();openMapOnMobile();return;
  }
  if(key==="attack"){
    const targets=getUnitOptions(view.state,u.id).attacks;
    if(targets.length===1){openCombat(u.id,targets[0]);return}
    order=order==="attack"?"":"attack";redraw();if(order)openMapOnMobile();return;
  }
  if(key==="upgrade"){order="";Game.doAction({type:"upgrade",unit:u.id});return}
  if(key==="found"){order="";Game.doAction({type:"found",unit:u.id});return}
  if(["farm","mine","fishery"].includes(key)){order="";Game.doAction({type:"improve",unit:u.id,item:key})}
}
function chooseRoster(id){
  const units=activeRoster==="units",item=(units?ownUnits():ownCities()).find(o=>sameId(o.id,id));
  if(!item)return;select(item.tile,units?item.id:null,!units);atlas.focus(item.tile);redraw();openMapOnMobile();
}
function nextReady(){
  const ready=ownUnits().filter(u=>u.moves>0);if(!ready.length)return;
  const i=ready.findIndex(u=>sameId(u.id,selectedUnit));activeRoster="units";chooseRoster(ready[(i+1)%ready.length].id);
}
function showRoster(type){activeRoster=type;roster()}
function toggleLayers(open){el("layers-menu").hidden=!open;el("layers").setAttribute("aria-expanded",String(open))}
function mount(){
  atlas=createAtlas(el("atlas"),{onSelect:onMapSelect,onHover:updateHint,onZoom:percent=>text("map-zoom",Math.round(percent)+"%")});
  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>Game.open(b.dataset.open));
  el("board-nav").onclick=()=>el("map-frame").scrollIntoView({block:"nearest"});
  el("end-turn").onclick=()=>{if(lobby())Game.open("multiplayer");else if(view.state.phase==="finished")Game.open("standings");else{order="";Game.endTurn()}};
  el("zoom-out").onclick=()=>atlas.zoomBy(.8);el("zoom-in").onclick=()=>atlas.zoomBy(1.25);el("recenter").onclick=()=>atlas.reset();
  el("inspect-map").onclick=()=>{order=order==="inspect"?"":"inspect";hoverId=null;redraw()};
  el("layers").onclick=()=>toggleLayers(el("layers-menu").hidden);
  el("map-labels").onchange=e=>atlas.setLabels(e.currentTarget.checked);
  el("territory-lines").onchange=e=>atlas.setTerritories(e.currentTarget.checked);
  document.addEventListener("click",e=>{if(!e.target.closest(".layers-wrap"))toggleLayers(false)});
  el("entity-commands").onclick=e=>{const b=e.target.closest("[data-order]");if(b&&!b.disabled)chooseOrder(b.dataset.order)};
  el("entity-tabs").onclick=e=>{const key=e.target.closest("[data-entity]")?.dataset.entity;if(!key)return;if(key==="land"){kind="tile";selectedUnit=null;order=""}else select(selectedTile,key.startsWith("u")?key.slice(1):null,key==="city");redraw()};
  el("survey-sites").onclick=()=>{if(surveyUnitId){renderSurveyDialog();el("survey-modal").showModal()}};
  el("close-survey").onclick=()=>el("survey-modal").close();
  el("survey-modal").onclick=e=>{if(e.target===el("survey-modal"))el("survey-modal").close()};
  el("survey-options").onclick=e=>{
    const button=e.target.closest("[data-survey-site]"),u=getUnit();
    if(!button||button.disabled||!mayOrder()||!sameId(u?.id,surveyUnitId))return;
    const tile=button.dataset.surveySite,assessment=getSettlementAssessment(view.state,u.id,tile);
    if(assessment.status==="invalid" || (tile===u.tile && assessment.status!=="now"))return;
    const action=tile===u.tile?{type:"found",unit:u.id}:{type:"move",unit:u.id,tile};
    el("survey-modal").close();order="";Game.doAction(action);
  };
  for(const id of Object.keys(councilTypes)){
    el(id+"-card").onclick=()=>openCouncil(id);
    el("switch-"+id).onclick=()=>openCouncil(id);
  }
  el("watch-cities").onclick=e=>{
    const id=e.target.closest("[data-watch]")?.dataset.watch;
    const city=id && ownCities().find(c=>c.id===id);if(!city)return;
    select(city.tile,null,true);atlas.focus(city.tile);redraw();openProduction();
  };
  el("close-research").onclick=()=>el("research-modal").close();
  el("research-modal").onclick=e=>{if(e.target===el("research-modal"))el("research-modal").close()};
  el("research-options").onclick=e=>{const b=e.target.closest("[data-project]");if(!b||b.disabled||!mayOrder())return;el("research-modal").close();Game.doAction({type:councilTypes[councilKind].action,item:b.dataset.project})};
  el("close-combat").onclick=closeCombat;el("cancel-combat").onclick=closeCombat;
  el("combat-modal").addEventListener("close",()=>{battle=null;updateMap()});
  el("combat-modal").onclick=e=>{if(e.target===el("combat-modal"))closeCombat()};
  el("confirm-combat").onclick=()=>{if(!battle||!drawCombat())return;const {unit,tile}=battle;closeCombat();order="";Game.doAction({type:"attack",unit,tile})};
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){toggleLayers(false);if(order){order="";redraw()}}});
  el("close-production").onclick=closeProduction;
  el("production-modal").addEventListener("close",()=>{productionCity=null});
  el("production-modal").onclick=e=>{if(e.target===el("production-modal"))closeProduction()};
  el("production-options").onclick=e=>{const b=e.target.closest("[data-produce]");if(!b||b.disabled||!productionCity)return;const id=productionCity;closeProduction();Game.doAction({type:"produce",city:id,item:b.dataset.produce})};
  el("roster-units").onclick=()=>showRoster("units");el("roster-cities").onclick=()=>showRoster("cities");
  for(const [id,type] of [["units-summary","units"],["cities-summary","cities"]])el(id).onclick=()=>{showRoster(type);el("roster-panel").scrollIntoView({block:"nearest",behavior:"smooth"})};
  el("roster").onclick=e=>{const b=e.target.closest("[data-roster-id]");if(b)chooseRoster(b.dataset.rosterId)};
  el("next-unit").onclick=nextReady;
  Game.init({render:paint,toast}).catch(error=>{console.error(error);toast("The game could not load. Refresh to try again.")});
}
mount();
