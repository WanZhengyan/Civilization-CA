import {FIELD_STATIONS,fieldStationReport,nearestKnownStation,stationInstruction} from './field-stations.js';
import {hexDistance} from './rules.js';
import {previewMove,sameMove,reviewPointerMove} from './move-review.js';
import {mountDiplomacy,paintDiplomacy,publicContacts} from './diplomacy-ui.js';
import {chartedWaterSites,knownCrossings,mountWaterKey,waterKind} from './water-key.js';
import {getFreightManifest} from './rules.js';
import {freightPanel} from './harbor-ledger-ui.js';
import {fishingTask} from './maritime.js';
import {modeLabels} from './campaign-choices.js';
import {SCIENCE_PROJECT} from './victory-rules.js';
import {borderSummary} from './border-summary.js';
import {getCityExpansions} from './rules.js';
import {NATURAL_WONDERS,neighboringWonders} from './natural-wonders.js';
import {naturalWonderArt} from './natural-wonder-art.js';
import {mountMapWorkspace, compactMap, showMapPanel, closeMapPanel, displayMapOnMobile, inspectMapOnMobile, chartViewInsets} from './map-workspace.js';
import {illustration, illustrationPath} from './illustrations.js';
import {mountBattleReports} from './battle-history.js';
import {councilStages,stageHeading,renderCouncilPath,prerequisiteLine,projectQuote} from './council-path.js';
import {researchLinks,syncResearchLens} from './research-catalog.js';
import {getSightRadius} from './vision.js';
import {RESOURCES, canSeeDeposits, canSurvey, connectedDeposit} from './resources.js';
import {openCityHall,paintCityHall} from './city-hall.js';
import {populationSummary,openCitizenLedger,paintCitizenLedger} from "./city-planning.js";
import {getPopulationReport,getCitizenWorkforce} from "./rules.js";
import {wildAt,WILDS} from "./barbarians.js";
import {addPolicyPanel,updateCivicAgenda} from "./policy-panel.js";
import {draftOrder, orderButtons, orderReview, paintSiteBar, siteOrderAllowed} from './work-orders.js';
import {getDevelopmentPreview,getProjectSites} from './rules.js';
import {roomSeatTurn,teamTurnLabels} from './room-turn.js';
import {sameTeam,teamLabel} from './teams.js';
import {cityKind,developmentPanel,developmentReceipt,foundingLabel} from './district-command.js';
import {WONDERS, universitiesUnlockedBy, campusStatus} from './wonders.js';
import {captureOrderHint,cityAttackHint,forecastCounterLabel} from './attack-mode.js';
import {militaryTraining,trainingPanel} from './combat-training.js';
import {fieldPosition,fieldPositionPanel} from './field-position.js';
import {advancementPanel,recoveryPanel} from './unit-service-ui.js';
import {getUpgradePlans,getRecoveryForecast} from './rules.js';
import {mountSurveyControls, showSelectedFrontier} from './survey-controls.js';
import {createAtlas} from "./atlas.js";
import {drawUnitPortrait} from "./unit-art.js";
import {Game} from "./game.js";
import {FACTIONS,getMap,getCivicOptions,getEra,ERAS,MAX_ROUNDS,getRouteDetail,getSettlementAssessment,getResearchOptions,combatPreview,getActions,getStats,getCityYield,getProductionOptions,getUnitOptions,getWorkingCity,UNIT_TYPES,BUILDINGS,IMPROVEMENTS} from "./rules.js";

const el=id=>document.getElementById(id);
const names=FACTIONS.map(f=>f.name);
const items=Object.fromEntries(Object.entries({...UNIT_TYPES,...BUILDINGS,...IMPROVEMENTS,[SCIENCE_PROJECT.id]:SCIENCE_PROJECT}).map(([key,v])=>[key,v.name]));
const terrain={ocean:"Open ocean",coast:"Coast",plains:"Lowlands",urban:"Urban",forest:"Woodland",hills:"Foothills",mountains:"Mountains"};
const unitRole={settler:"Civilian unit",builder:"Engineering unit",melee:"Melee unit",ranged:"Ranged unit"};
const isSeaUnit=item=>UNIT_TYPES[item]?.domain==="sea";
const portBuildings=new Set(["harbor","shipyard"]);
const eraName=id=>ERAS[id]?.name||id;
let updateWaterKey;
const councilGoals={research:"",civics:""};
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
  ironclad:'<path d="m2 15 19-2-4 7H6zM6 14l2-6h6l3 5M9 8V4h3v4m1 2h7"/>',
  destroyer:'<path d="m2 16 20-4-3 8H5zM6 15l2-5h6l2 3M9 10V6h2v4m3 0V3m0 2h4"/>',
  sappers:'<path d="m3 21 11-11m-2-2 4-4 5 5-4 4-5-5ZM3 5l3-2 14 16-2 2z"/>',
  signals:'<path d="M4 10h12v11H4zm2-1 8-7m4 5c3 2 3 6 0 8M7 14h5m-5 4h2"/>',
  pikes:'<path d="M4 21 14 3l-4 2m4-2v5M10 21 20 3l-4 2m4-2v5"/>',
  skirmisher:'<path d="M3 17 12 5l8 12-8-5zM7 20l5-7 5 7"/>',
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
  const picture=Object.hasOwn(IMPROVEMENTS,key) ? illustration(key) : icon(key==='choose-production'?'production':key);
  return '<button class="order-btn '+style+'" data-order="'+esc(key)+'" '+(disabled?'disabled':'')+(pressed?' aria-pressed="true"':'')+'>'+picture+'<b>'+esc(title)+'</b><small>'+esc(detail)+'</small></button>';
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
function mayOrder(){return roomSeatTurn(view.state,view.seat)==="active"&&!lobby()&&!view.busy}
let view,atlas,battleReports,selectedTile,selectedUnit,kind="tile",order="",matchKey="",activeRoster="units",timer,productionCity=null;
let moveBar,moveDraft=null;
let hoverId=null, battle=null, selectedOptions=null, feedbackTimer, previousEvent="";
const unavailableArt=new Set();
let surveyUnitId=null;
let survey=new Map(), explored=new Set(), visible=new Set();
function toast(message){
  const status=el("toast");
  if(Array.isArray(message)) status.innerHTML=message.map(part=>
    [part].flat().map(word=>'<span>'+esc(word)+'</span>').join(' ')
  ).join(' · ');
  else text("toast",message);
  status.hidden=false;clearTimeout(timer);timer=setTimeout(()=>status.hidden=true,3200);
}
function select(tile,unit=null,city=false){
  if(!mapRegion.byId[tile])return;
  moveDraft=null;order="";selectedTile=tile;
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
  displayMapOnMobile();
}
function onMapSelect(tileId,unitId,cityPlate=false,pointer="keyboard"){
  if(!view || !mapRegion.byId[tileId])return;
  if (parcelOrder) {
    if (parcelOptions.some(t=>t.id===tileId)) {parcelOrder.site=tileId;drawPlacement();updateMap();}
    else toast('Choose a highlighted construction tile.');
    return;
  }
  if (!explored.has(tileId) && moveDraft) {moveDraft=null;updateMap();}
  if(!explored.has(tileId)) {toast("Uncharted territory. Move closer to explore.");return}
  if(cityPlate && cityAt(tileId)){
    const inspecting=order==="inspect";
    select(tileId,null,true);if(inspecting)order="inspect";
    redraw();inspectMapOnMobile();return;
  }
  const unit=getUnit(), targetUnit=view.state.units.find(u=>sameId(u.id,unitId));
  const available=unit && unit.seat===view.seat && mayOrder() && order!=="inspect";
  if(available && targetUnit?.seat!==view.seat){
    const options=getUnitOptions(view.state,unit.id);
    if(options.attacks.includes(tileId)){moveDraft=null;openCombat(unit.id,tileId);return}
    if(options.moves.includes(tileId) && order!=="attack"){
      if(reviewPointerMove(pointer,compactMap())){
        moveDraft=previewMove(view.state,unit,tileId);
        openMapOnMobile();
        updateMap();
        return;
      }
      moveDraft=null;Game.doAction({type:"move",unit:unit.id,tile:tileId});return;
    }
  }
  const keepInspect=order==="inspect";select(tileId,unitId);if(keepInspect)order="inspect";redraw();inspectMapOnMobile();
}
function turnsText(value){return value===null?"Awaiting city income":value+" "+(value===1?"turn":"turns")}
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
      const prospects=data.naturalWonderProspects.map(prospect=>'<div class="survey-prospect"><strong>'+esc(prospect.name)+'</strong><small>'+prospect.districts+' nearby '+(prospect.districts===1?'district':'districts')+'</small><small>'+esc(prospect.effect)+'</small></div>').join('');
      html+='<div class="survey-option"><div><strong>'+esc(mapRegion.byId[id].name)+'</strong><small>'+esc(cost)+' · '+esc(terrain[mapRegion.byId[id].terrain])+'</small><small>'+esc(nearestCityText(data))+'</small>'+prospects+'</div><button class="modal-secondary" data-survey-site="'+esc(id)+'" '+(here && data.status!=="now"?"disabled":"")+'>'+label+'</button></div>';
    }
    html+='</div>';
  }
  el("survey-options").innerHTML=html;
}
function updateHint(id){
  hoverId=id;
  if(!view)return;
  if(parcelOrder) {text('map-hint',id && parcelOptions.some(s=>s.id===id) ? 'Select this construction tile.' : 'Choose a highlighted tile on the map.');return;}
  if(id && !explored.has(id)){text("map-hint","Uncharted territory. Move closer to explore.");return}
  const tile=mapRegion.byId[id],u=getUnit();
  const ready=Boolean(u && u.seat===view.seat && mayOrder() && order!=="inspect");
  let hint=order==="inspect"?"Inspection mode. Click a hex to inspect it without moving.":"Select a unit, city or district to inspect it.";
  if(ready && selectedOptions?.moves.length)hint="Click a highlighted hex to move your "+items[u.type]+".";
  if(ready && selectedOptions?.moves.length && (compactMap() || window.matchMedia("(hover:none)").matches))hint="Tap a highlighted hex to preview movement.";
  if(ready && order==="attack")hint="Click a red target to review the combat forecast.";
  if(tile){
    hint=tile.name+" · "+(waterKind(tile)||terrain[tile.terrain]);
    if(ready && selectedOptions?.attacks.includes(id))hint+=" · Click to preview attack";
    else if(ready && selectedOptions?.moves.includes(id) && order!=="attack"){
      const route=getRouteDetail(view.state,u.id,id);
      const left=u.moves-route.cost;
      hint+=" · Move costs "+route.cost+(route.cost===1?" point":" points")+" · "+left+(left===1?" point left":" points left");
      if(route.crossings.length)hint+=" · "+route.crossings.join(", ");
    }
  }
  if(surveyUnitId){
    const surveyInfo=tile ? (survey.get(id) || getSettlementAssessment(view.state,surveyUnitId,id)) : survey.get(selectedTile);
    if(tile && surveyInfo){
      const details=surveySummary(surveyInfo,id===selectedTile);
      hint=tile.name+" · "+(waterKind(tile)?waterKind(tile)+" · ":"")+(Number.isFinite(surveyInfo.moveCost) && id!==selectedTile?surveyInfo.moveCost+" movement · ":"")+details;
    }else if(!tile){
      const tests=[...survey.values()],now=tests.filter(v=>v.status==="now").length,later=tests.filter(v=>v.status==="next-turn").length;
      if(now)hint=now+" "+(now===1?"site is":"sites are")+" ready to settle this turn. Follow a gold flag or open View sites.";
      else if(later)hint=later+" "+(later===1?"site":"sites")+" within reach. Follow a blue flag to settle next turn.";
      else hint="No suitable sites are within the settler’s current movement range.";
    }
  }
  if(order==="inspect" && surveyUnitId)hint="Inspect mode · "+hint;
  if(tile && !visible.has(id))hint=tile.name+" · "+(waterKind(tile)||terrain[tile.terrain])+" · Outside current sight";
  const crossings=tile ? knownCrossings(mapRegion,tile.id,explored) : [];
  if(crossings.length)hint+=" · "+crossings.map(b=>b.name).join(", ");
  const nature=NATURAL_WONDERS[view.state.board[id]?.naturalWonder];
  const station=FIELD_STATIONS[view.state.board[id]?.fieldStation];
  if(station)hint+=' · '+station.name;
  if(nature)hint+=' · '+nature.name;
  const neutral=tile && wildAt(view.state,tile.id);
  if (neutral) hint+=" · "+WILDS[neutral.type].name;
  text("map-hint",hint);
}
function flash(message){
  text("map-feedback",message);el("map-feedback").hidden=false;clearTimeout(feedbackTimer);
  feedbackTimer=setTimeout(()=>el("map-feedback").hidden=true,3400);
}
function entityTabs(tile,selected,development){
  const units=view.state.units.filter(u=>u.tile===tile);
  const choices=units.map(u=>({id:'u'+u.id,label:items[u.type]||u.type,selected:kind==="unit"&&sameId(selected?.id,u.id)}));
  if(cityAt(tile))choices.push({id:'city',label:'City',selected:kind==="city"});
  if(choices.length)choices.push({id:"land",label:development?"District development":"District",selected:kind==="tile"});
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
  return '<div class="queue-info">'+illustration(q.item)+'<div class="queue-name"><strong><span>Producing</span> · <span>'+esc(items[q.item]||q.item)+'</span></strong><small>'+remaining+'</small>'+(q.site?'<small><span>Construction tile</span> · '+esc(mapRegion.byId[q.site]?.name||q.site)+' · '+esc(q.site)+'</small>':'')+'</div><div class="queue-progress"><i style="width:'+percentage(q.progress,q.required)+'%"></i></div></div>';
}
function depositStrip(id){
  return RESOURCES[id] ? '<div class="deposit-strip">'+illustration(id)+'<small>Resource</small><strong>'+esc(RESOURCES[id].name)+'</strong></div>' : '';
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
  const surface=waterKind(tile)||terrain[tile.terrain];
  const owner=activeUnit?.seat??activeCity?.seat??state.board[tile.id]?.owner;
  const gov=owner!=null?faction(owner):null,own=owner===view.seat && !lobby();
  text("hex-coord","HEX "+[tile.q,tile.r].map(v=>String(v).padStart(2,"0")).join(" / "));
  const image=el("district-img");
  const port=state.cities.find(c=>c.portTile===tile.id);
  const holding=state.board[tile.id];
  const depositId=canSeeDeposits(state,view.seat) ? holding?.resource : null;
  const deposit=RESOURCES[depositId];
  const campus=holding?.wonder,facility=holding?.facility;
  const construction=state.cities.find(c=>c.queue?.site===tile.id);
  const nature=NATURAL_WONDERS[holding?.naturalWonder];
  const locationArt='./'+artFor(tile,activeCity)+'.webp';
  const districtArt=campus || facility || (port ? 'harbor' : null) || holding?.improvement || depositId;
  const cityArt=activeCity?.buildings.includes('harbor') ? 'harbor' : null;
  const fallback=naturalWonderArt(holding?.naturalWonder) || illustrationPath(activeCity ? cityArt : districtArt) || locationArt;
  const unitArt=activeUnit ? illustrationPath(activeUnit.type) : null;
  const fullArt=unitArt&&!unavailableArt.has(unitArt);
  const art=fullArt?unitArt:fallback;
  const portrait=el("unit-portrait");
  portrait.hidden=!activeUnit||Boolean(fullArt);
  if(fullArt){
    image.onerror=()=>{unavailableArt.add(unitArt);image.onerror=null;image.src=fallback;portrait.hidden=false;drawUnitPortrait(portrait,activeUnit.type,gov.color)};
  }else{image.onerror=null;if(activeUnit)drawUnitPortrait(portrait,activeUnit.type,gov.color)}
  if(image.getAttribute("src")!==art)image.src=art;
  const allied=owner!==view.seat && sameTeam(state,owner,view.seat);
  text("entity-kind",activeUnit ? (own?"Your ":allied?"Allied ":"Rival ")+(UNIT_TYPES[activeUnit.type].role||unitRole[activeUnit.type]||"unit") : activeCity ? cityKind(activeCity,view.seat,state) : (nature?"Natural wonder":campus?"University wonder":facility?"Municipal building":construction?"Construction site":port?"Harbor district":tile.landmark?"Landmark":tile.waterway?"Waterway":"District"));
  el("entity-name").translate=!customCity(activeCity);
  text("entity-name",activeUnit ? (items[activeUnit.type]||activeUnit.type) : activeCity?.name||nature?.name||(campus?WONDERS[campus]?.name:facility?items[facility]:port?"Harbor":tile.name));
  if(activeCity && Number.isInteger(activeCity.originalSeat) && activeCity.originalSeat !== activeCity.seat) {
    el("entity-location").innerHTML='<span>Controlled by</span> <span>'+esc(gov.name)+'</span> · <span>Original capital of</span> <span>'+esc(faction(activeCity.originalSeat).name)+'</span>';
  } else text("entity-location",activeUnit ? tile.name : activeCity ? gov.name : port?.name||surface);
  const territory=visible.has(tile.id) ? getActions(state,view.seat,tile.id)[0] : null;
  const capped=visible.has(tile.id) && holding?.owner===view.seat && holding.level===3 && tile.terrain!=="ocean" && !nature && !campus && !port && !wildAt(state,tile.id);
  entityTabs(tile.id,activeUnit,territory?.type==="develop" || capped);
  const disabled=!mayOrder()||!own;
  let info="",actions="",explanation="",development="";
  selectedOptions=activeUnit?getUnitOptions(state,activeUnit.id):null;
  updateSurvey();
  if(activeUnit){
    const u=activeUnit,o=selectedOptions;
    info='<div class="entity-stats">'+stat("Health",u.hp,u.maxHp)+stat("Movement",u.moves,u.maxMoves)+(["builder","workboat"].includes(u.type)?stat("Charges",u.charges):(UNIT_TYPES[u.type].range?stat("Range",UNIT_TYPES[u.type].range):stat("Terrain",surface)))+'</div>'+healthBar(u.hp,u.maxHp);
    const position=fieldPosition(state,u,UNIT_TYPES[u.type],tile.terrain);
    info+=fieldPositionPanel(position,u,false,disabled);
    const training=militaryTraining(state,u,UNIT_TYPES[u.type]);
    if (training?.drill) info+=trainingPanel(training,own,disabled);
    const radius=getSightRadius();
    info+='<div class="unit-sight"><span>'+icon("inspect")+' <span>Sight radius</span></span><strong>'+radius+' <small>'+(radius===1?'hex':'hexes')+'</small></strong></div>';
    if(own){
      const moving=o.moves.length>0 && order!=="inspect" && order!=="attack";
      actions+=actionButton("move",moving?"Move unit":"Show moves",moving?o.moves.length+" hexes":u.moves?"Select":"Spent","green",disabled||!o.moves.length,moving);
      if(u.type==="settler"){
        actions+=actionButton("found",foundingLabel(state,view.seat),o.canFound?"Settle here":"Unavailable","gold",disabled||!o.canFound);
        const assessment=survey.get(u.tile);
        explanation=assessment?surveySummary(assessment,true):"Settle at least three hexes from every city, with movement remaining.";
        if(assessment?.nearestCity && !explanation.includes(assessment.nearestCity.name))explanation+=" "+nearestCityText(assessment);
      }else if(u.type==="builder"||u.type==="workboat"){
        const water=u.type==="workboat";
        const localSite=state.board[tile.id];
        const preferred=localSite?.resource && RESOURCES[localSite.resource]?.improvement;
        for(const item of water?["fishery"]:(preferred && preferred!=="fishery" ? [preferred] : ["farm","mine"])){
          const ok=o.improvements.includes(item);
          actions+=actionButton(item,'Build '+items[item].toLowerCase(),ok?'1 charge':'Unavailable',"gold",disabled||!ok);
        }
        if(water){
          const task=fishingTask(state,u,mapRegion.byId);
          actions+=freightPanel(getFreightManifest(state,u),esc,actionButton,disabled);
          if(u.fishCargo) info+='<div class="unit-sight"><span>Catch aboard</span><strong>1</strong></div>';
          if(task)actions+=actionButton(task.type,task.type==="landCatch"?"Land the catch":"Load a catch",task.type==="landCatch"?"1 stored fish and 3 city food":"Spends all remaining movement","gold",disabled||!u.moves);
        }
        explanation=water?(u.fishCargo?"Return to an owned harbor berth to land this catch.":"Load a catch at a fish shoal or fishery, or build a fishery on suitable water."):"Work an owned site connected to a city within two land steps.";
      }else{
        actions+=actionButton("attack","Preview attack",o.attacks.length+' '+(o.attacks.length===1?'target':'targets'),"red",disabled||!o.attacks.length,order==="attack");
        const definition=UNIT_TYPES[u.type];
        explanation=definition.description||itemDesc[u.type]||("Attack range · "+definition.range+" hexes.");
      }
      const visit=fieldStationReport(state,u);
      if(visit){
        info+=note(visit.name)+note(visit.visited?'Your expedition has visited this station.':'Each civilization can visit once. An exchange uses the scout’s remaining movement.');
        if(!visit.visited)for(const choice of visit.choices)actions+=actionButton('station:'+choice.key,choice.name,choice.label,'gold',disabled||!choice.enabled);
      }else if(u.type==='scout'){
        const nearest=nearestKnownStation(state,u,explored,hexDistance);
        if(nearest)actions+=actionButton('locate-station','Nearest known station',FIELD_STATIONS[state.board[nearest].fieldStation].name);
      }
      if(canSurvey(state,u)) actions+=actionButton('survey','Survey resources','1 movement','gold',disabled);
      const plans=getUpgradePlans(state,u.id,view.seat);
      if (!training?.drill) actions+=trainingPanel(training,true,disabled || !u.moves);
      if (!u.fortified) actions+=fieldPositionPanel(position,u,true,disabled);
      const previous=el("entity-commands").querySelector("[data-service-plans]");
      actions+=recoveryPanel(u,getRecoveryForecast(state,u.id,view.seat),disabled);
      actions+=advancementPanel(plans,previous?.open && previous.dataset.unit===String(u.id),disabled,u.id);
    }else explanation=allied?"Your teammate commands this unit.":"Select a friendly unit to give orders.";
  }else if(activeCity){
    const c=activeCity;
    if(!own) {
      info='<div class="entity-stats">'+stat("Population",c.population)+stat("City HP",c.hp,c.maxHp)+'</div>'+healthBar(c.hp,c.maxHp);
      const atCaptureThreshold=c.hp===1 && visible.has(c.tile) && !sameTeam(state,view.seat,c.seat);
      el("entity-info").innerHTML=info;el("entity-commands").innerHTML=note(atCaptureThreshold?captureOrderHint:"Only the city owner can inspect its economy.");return;
    }
    const y=getCityYield(state,c.id);
    info='<div class="entity-stats">'+stat("Population",c.population)+stat("Production","+"+y.production)+stat("City HP",c.hp,c.maxHp)+'</div>'+healthBar(c.hp,c.maxHp);
    const buildings=(c.buildings||[]).map(id=>'<span>'+illustration(id)+'<span>'+esc(items[id]||id)+'</span></span>');
    if(buildings.length)info+='<div class="built-gallery">'+buildings.join('')+'</div>';
    const expansion=expansionForecasts.get(c.id);
    info+=populationSummary(getPopulationReport(state,c.id))+borderSummary(expansion,mapRegion.byId[expansion?.tile],esc)+cityQueue(c);
    if(own && c.buildingSites) info+='<div class="works-sites">'+Object.entries(c.buildingSites).map(([item,id])=>
      '<small>'+esc(items[item]||item)+' · '+esc(mapRegion.byId[id]?.name||id)+' · '+esc(id)+'</small>').join('')+'</div>';
    if(own)actions=actionButton("choose-production",c.queue?"View production":"Choose production","City orders","gold",false)+actionButton("supplies","Supply ledger","Stored goods")+actionButton("citizens","Manage citizens","City planning","",false);
    if(own && state.campaignVariety===1) actions+=actionButton("city-hall","City hall","Municipal charter");
  }else{
    const station=FIELD_STATIONS[holding?.fieldStation];
    if(station){
      text("entity-kind","Field station");text("entity-name",station.name);text("entity-location",tile.name);
    }
    if(!visible.has(tile.id)){
      el("entity-info").innerHTML=stat("Terrain",surface)+depositStrip(depositId)+(station?note(stationInstruction):"")+(nature?note(nature.description)+note(nature.effect):"");
      el("entity-commands").innerHTML=note("Outside current sight");return;
    }
    info='<div class="province-meta"><i style="background:'+esc(gov?.color||"#98a1a6")+'"></i>'+esc(gov?.name||(tile.terrain==="ocean"?"Open water":"Unclaimed land"))+'</div><div class="entity-stats">'+stat("Terrain",surface)+stat("Improvement",items[holding?.improvement]||"None")+'</div>';
    if(station)info+=note(stationInstruction);
    if(nature){
      info+=note(nature.description)+note(nature.effect);
      explanation='This protected site cannot host a city, improvement or campus.';
    }else if(campus && WONDERS[campus]){
      explanation=WONDERS[campus].description;
      info+='<p class="built-list">'+esc(tile.name)+'</p>';
    }else if(facility || construction){
      if(facility) explanation=BUILDINGS[facility]?.description || itemDesc[facility] || items[facility];
      if(construction) info+=cityQueue(construction);
      const host=construction || state.cities.find(c=>c.id===holding.facilityCity);
      if (host?.seat===view.seat) actions=actionButton('works-host','City production',host.name,'gold');
    }else if(port){
      if(port.seat===view.seat)actions=actionButton("port-production","Port production",port.name,"gold");
      explanation="Ships launch here and repair in nearby water.";
    }else if(state.intel?.visibleBerths?.includes(tile.id)){
      text("entity-kind","Marked berth");explanation="A harbor occupies or has reserved this water tile.";
    }else if(territory?.type==="develop"){
      const preview=getDevelopmentPreview(state,view.seat,tile.id);
      if(preview) {
        development=developmentPanel(preview,getStats(state,view.seat));
        const cost=preview.cost.capital+" capital · "+preview.cost.orders+" district order";
        actions=actionButton("develop",territory.label,cost,"gold",!mayOrder()||!preview.enabled);
        explanation=preview.reason || (state.actionsLeft===1 ? '1 district order remains this turn.' : state.actionsLeft+' district orders remain this turn.');
      }
    }else if(capped){
      development=developmentPanel(null);
    }else if(territory){
      const cost=[territory.cost.capital && (territory.cost.capital+" capital"),territory.cost.influence && (territory.cost.influence+" influence")].filter(Boolean).join(" · ");
      actions=actionButton(territory.type,territory.label,cost,"gold",!mayOrder()||!territory.enabled);
      explanation=territory.reason || state.actionsLeft+" district orders remain this turn.";
    }else explanation=tile.waterway?"Ships spend one movement per water hex.":tile.terrain==="ocean"?"Land units cannot cross open water.":"Select a unit to give orders or a city to set production.";
  }
  const neutral=!activeUnit && !activeCity && wildAt(state,tile.id);
  if(neutral){
    text("entity-kind","Neutral forces");text("entity-name",WILDS[neutral.type].name);text("entity-location",tile.name);
    info='<div class="entity-stats">'+stat("Health",neutral.hp,neutral.maxHp)+'</div>'+healthBar(neutral.hp,neutral.maxHp);
    actions="";
    explanation=neutral.type==="camp"?"Send a close-combat unit to clear the camp for 12 capital.":neutral.type==="raider"?"Guard the city with a military unit or city walls to repel these raiders.":"This lookout belongs to a nearby barbarian camp.";
  }
  if(!activeUnit && !activeCity && !nature){
    for(const id of neighboringWonders(state.board,mapRegion,tile.id)){
      if(!['ocean','mountains'].includes(tile.terrain))info+=stat("Adjacent natural wonder",NATURAL_WONDERS[id].name)+note(NATURAL_WONDERS[id].effect);
    }
  }
  for(const bridge of knownCrossings(mapRegion,tile.id,explored))info+=stat("Crossing",bridge.name);
  info+=depositStrip(depositId);
  if(deposit){
    const site=state.board[tile.id], supplier=getWorkingCity(state,tile.id);
    const status=connectedDeposit(site) && supplier ? 'Supplying city' : 'Build to harvest';
    info+='<div class="site-detail"><span>'+status+'</span><strong'+(supplier && connectedDeposit(site)?cityNameAttrs(supplier):'')+'>'+esc(supplier && connectedDeposit(site)?supplier.name:items[deposit.improvement])+'</strong></div>';
  }
  if(order==="attack")explanation="Select an enemy outlined in red to review the combat forecast.";
  el("entity-info").innerHTML=info;
  el("entity-commands").innerHTML=development+'<div class="orders">'+actions+'</div>'+note(explanation);
}
function currentMove(){
  const unit=getUnit();
  if(!moveDraft || unit?.seat!==view.seat || !mayOrder())return null;
  if(order==="inspect" || order==="attack" || parcelOrder || battle)return null;
  return previewMove(view.state,unit,moveDraft.tile);
}
function paintMove(){
  if(!moveBar)return;
  if(moveDraft && !sameMove(moveDraft,currentMove())){
    moveDraft=null;
    toast("The route has changed. Choose a destination again.");
  }
  moveBar.hidden=!moveDraft;
  if(!moveDraft)return;
  const tile=mapRegion.byId[moveDraft.tile];
  text("move-place",tile.name);
  text("move-coord",tile.q+" / "+tile.r);
  text("move-cost",moveDraft.cost);
  text("move-left",moveDraft.left+" / "+getUnit().maxMoves);
}
function updateMap(){
  paintMove();
  drawPlacement();
  showSelectedFrontier(selectedTile,view.state.board,visible,mapRegion.byId,faction);
  const u=getUnit(),ready=u && u.seat===view.seat && mayOrder() && order!=="inspect";
  const settlementSites={now:[],nextTurn:[]};
  for(const [id,assessment] of survey){
    if(assessment.status==="now")settlementSites.now.push(id);
    else if(assessment.status==="next-turn")settlementSites.nextTurn.push(id);
  }
  atlas.update({reviewPath:moveDraft?.path,campaignKey:matchKey,borderForecasts:expansionForecasts,workSites:parcelOptions.map(t=>t.id),workSelection:parcelOrder?.site,showResources:canSeeDeposits(view.state,view.seat),cityLabelPicking:!parcelOrder && order!=="attack",settlementSites,state:view.state,selectedId:selectedTile,selectedUnitId:u?.id??null,moveTiles:ready && order!=="attack"?selectedOptions?.moves||[]:[],attackTiles:ready?selectedOptions?.attacks||[]:[],targetId:battle?.tile??null});
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
  const settler = cities.length === 0 && !lobby() && view.state.phase === "playing"
    ? ownUnits().find(unit => unit.type === "settler") : null;
  const heading = el("watch-title");
  if (heading?.lastChild?.nodeType === 3) {
    const title = settler ? "Founding expedition" : "City projects";
    if (heading.lastChild.textContent !== title) heading.lastChild.textContent = title;
  }
  const markup=settler ? '<div class="expedition-orders"><p>Choose a site for your first city. Surveying or founding can reveal local resources.</p><button type="button" data-founding-unit="'+esc(settler.id)+'">Locate settler</button></div>' : cities.map(city=>{
    const turns=projectTurns(city);
    const status=turns===null?"Choose production":turns===0?"Awaiting deployment":items[city.queue.item]||city.queue.item;
    return '<button class="watch-city" type="button" data-watch="'+esc(city.id)+'">'+illustration(city.queue?.item)+'<strong'+cityNameAttrs(city)+'>'+esc(city.name)+'</strong><span>'+esc(status)+'</span>'+(turns>0?'<small>'+esc(turnsText(turns))+'</small>':'')+'</button>';
  }).join("");
  if(markup!==lastProjectsMarkup){el("watch-cities").innerHTML=markup;lastProjectsMarkup=markup}
}
let productionDraft=null, parcelOrder=null, parcelOptions=[], parcelBar;
function endPlacement() {
  parcelOrder=null;parcelOptions=[];
  if (parcelBar) {parcelBar.hidden=true;delete parcelBar.dataset.rendered;}
}
function drawPlacement() {
  if(!parcelOrder || !parcelBar) return;
  const city=view.state.cities.find(c=>c.id===parcelOrder.city && c.seat===view.seat);
  const option=city && getProductionOptions(view.state,city.id,{replace:true}).find(o=>o.item===parcelOrder.item);
  if (!city || !option || !mayOrder() || (city.productionRevision||0)!==parcelOrder.expected ||
      (parcelOrder.type==='buyProduction' ? !option.buyEnabled || option.gold!==parcelOrder.gold : !option.enabled)) {
    endPlacement();return;
  }
  parcelOptions=getProjectSites(view.state,city.id,option.item);
  if (!parcelOptions.some(p=>p.id===parcelOrder.site)) delete parcelOrder.site;
  paintSiteBar(parcelBar,parcelOrder,city,option,parcelOptions,mayOrder());
}
function startPlacement(draft,city) {
  closeProduction();productionDraft=null;parcelOrder={...draft,university:Boolean(WONDERS[draft.item])};
  order='inspect';selectedUnit=null;kind='city';selectedTile=city.tile;
  closeMapPanel();atlas.focus(city.tile);redraw();el('atlas').querySelector('canvas')?.focus({preventScroll:true});
}

function productDescription(item) {
  const def=item===SCIENCE_PROJECT.id ? SCIENCE_PROJECT : UNIT_TYPES[item] || BUILDINGS[item];
  return def?.description || itemDesc[item] || '';
}
function productionOptions(){
  const c=view.state.cities.find(c=>sameId(c.id,productionCity));
  if(!c||c.seat!==view.seat){closeProduction();return}
  el("production-city").translate=!customCity(c);
  text("production-city",c.name);
  const list=getProductionOptions(view.state,c.id,{replace:true});
  if (productionDraft) {
    const o=list.find(o=>o.item===productionDraft.item);
    if (o && (productionDraft.type==='buyProduction' ? o.buyEnabled : o.enabled) &&
        productionDraft.expected===(c.productionRevision||0) && (productionDraft.gold==null || productionDraft.gold===o.gold)) {
      const needsSite=o.kind==='building' && c.queue?.item!==o.item;
      const sites=needsSite?getProjectSites(view.state,c.id,o.item):[];
      if (!productionDraft.site && sites.length) productionDraft.site=sites[0].id;
      el('production-options').innerHTML=orderReview(productionDraft,c,o,sites,key=>items[key]||key,productDescription(o.item));
      return;
    }
    productionDraft=null;
  }
  const groups=[
    ["Victory project",list.filter(x=>x.kind==="project")],
    ["Train a unit",list.filter(x=>x.kind==="unit"&&!isSeaUnit(x.item))],
    ["Construct a building",list.filter(x=>x.kind==="building"&&!portBuildings.has(x.item)&&!WONDERS[x.item])],
    ["University wonders",list.filter(x=>WONDERS[x.item])],
    ["Port and fleet",list.filter(x=>isSeaUnit(x.item)||portBuildings.has(x.item))]
  ];
  const html=groups.filter(([,opts])=>opts.length).map(([heading,opts])=>{
    return '<h3 class="production-group">'+heading+'</h3><div class="production-grid">'+opts.map(o=>{
      const def=o.kind==="project"?SCIENCE_PROJECT:UNIT_TYPES[o.item]||BUILDINGS[o.item];
      const desc=productDescription(o.item);
      const race=WONDERS[o.item] ? '<small><span>Charter fee</span> · <span>'+def.grant+' capital</span> · <span>'+({open:'Available worldwide.',commissioned:'Under construction',complete:'Already opened'})[campusStatus(view.state,o.item)]+'</span></small>' : '';
      return '<article class="production-item work-card">'+illustration(o.item)+'<span><strong>'+esc(items[o.item]||o.label)+'</strong><small>'+esc(desc)+'</small>'+race+'<small>'+(def.era?esc(eraName(def.era))+' · ':'')+esc(turnsText(o.turns))+' · '+esc(o.required)+' production</small>'+orderButtons(o,mayOrder())+'</span></article>';
    }).join('')+'</div>'});
  el("production-options").innerHTML=(c.queue?cityQueue(c)+'<p class="work-rules">Changing projects saves invested production in this city. A paused university releases its land and refunds the charter fee.</p>':'')+
    '<p class="work-rules">Buy with treasury gold to finish immediately. One remaining production costs three gold.</p>'+html.join('');
}
function openProduction(){const c=cityAt(selectedTile);if(!c||c.seat!==view.seat)return;productionDraft=null;productionCity=c.id;productionOptions();el("production-modal").showModal()}
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
    const council=el('research-options');
    const oldPolicyPanel=council.previousElementSibling;
    if(id==='civics') addPolicyPanel(council,state,seat,mayOrder(),action=>{el('research-modal').close();Game.doAction(action)});
    else if(oldPolicyPanel?.classList.contains('civic-government')) oldPolicyPanel.remove();
    const byId=new Map(c.options.map(o=>[o.item,o]));
    const goal=byId.has(councilGoals[id])?councilGoals[id]:"";
    const tiers=["frontier","industrial","modern"].filter(tier=>c.options.some(o=>o.era===tier));
    const eraGroups=goal?[]:tiers.map(tier=>{
      const stages=councilStages(c.options.filter(o=>o.era===tier));
      const groups=stages.map(([stage,options])=>{
        const cards=options.map(o=>{
          const label=o.completed?"Complete":o.locked?"Locked":o.turns===null?turnsText(null):o.active?o.turns+(o.turns===1?" turn left":" turns left"):o.turns===0?"Ready":turnsText(o.turns);
          const prereq=prerequisiteLine(o,byId);
          const buildingNotes=Object.entries(BUILDINGS).filter(([item,def])=>!WONDERS[item] && (def.tech||def.civic)===o.item)
            .map(([,def])=>'<span class="project-prereqs"><span>Unlocks building</span> · <span>'+esc(def.name)+'</span></span>').join('');
          let researchNotes='';
          const links=researchLinks(o.item,c.options,id==='research'?UNIT_TYPES:{});
          for (const [label,items] of [['Trains',links.formations],[id==='research'?'Leads to':'Leads to civics',links.discoveries]]) {
            if (items.length) researchNotes+='<span class="research-links"><span>'+esc(label)+'</span> · <span>'+items.map(name=>'<span>'+esc(name)+'</span>').join(', ')+'</span></span>';
          }
          return '<button class="project-option" data-project="'+esc(o.item)+'" '+(o.locked?'data-plan-item="'+esc(o.item)+'" ':'')+'data-status="'+(o.completed?'complete':o.active?'active':o.locked?'locked':'available')+'" ' +(!o.locked && (!o.enabled||!mayOrder())?'disabled':'')+'><span class="project-name">'+esc(o.label)+'</span><span class="project-description">'+esc(o.description)+'</span>'+universitiesUnlockedBy(o.item).map(name=>'<span class="project-prereqs"><span>Unlocks university</span> · <span>'+esc(name)+'</span></span>').join('')+buildingNotes+prereq+researchNotes+'<span class="project-meta"><span translate="no">'+projectQuote(o,c.resource)+'</span><b>'+esc(o.locked?"View prerequisites":label)+'</b></span></button>';
        }).join("");
        return '<div class="council-stage-group">'+stageHeading(stage)+'<div class="project-grid">'+cards+'</div></div>';
      }).join("");
      return '<section class="council-tier" data-era="'+esc(tier)+'"><h3>'+esc(eraName(tier))+'</h3>'+groups+'</section>';
    });
    const bankNote=active ? '<p class="modal-muted">'+(id==='research'
      ? 'Changing research keeps your banked science.' : 'Changing debates keeps your banked culture.')+'</p>' : '';
    const markup='<div class="council-summary"><strong>'+esc(c.balance+" "+c.resource+" banked")+'</strong><span>'+esc("+"+c.rate+" per turn")+'</span><span>'+c.completed+' / '+c.options.length+' complete</span></div>'+bankNote+renderCouncilPath(c,goal,mayOrder())+eraGroups.join("");
    if(markup!==lastCouncilMarkup){el("research-options").innerHTML=markup;lastCouncilMarkup=markup}
    updateCivicAgenda(council,id==='civics' && !goal,UNIT_TYPES);
    syncResearchLens(id,el("research-options"),Boolean(goal));
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
function showCouncilGoal(item,focusTitle=true){
  councilGoals[councilKind]=item;paintResearch();
  const panel=el('research-options');
  const focus=item && focusTitle ? panel.querySelector('[data-path-title]') : panel.querySelector('[data-council-goal]');
  focus?.focus({preventScroll:true});
  el('research-modal').querySelector('.council-scroll').scrollTop=0;
}
function forecastRow(role,label,before,after,max,damage,color){
  const percent=percentage(before,max), remaining=percentage(after,max);
  return '<div class="forecast-side"><div class="forecast-role">'+esc(role)+'</div><h3>'+esc(label)+'</h3><div class="forecast-hp"><b>'+before+' → '+after+'</b> HP</div><div class="forecast-bar"><i style="width:'+percent+'%;background:#75483d"></i><i style="width:'+remaining+'%;background:'+esc(color)+'"></i></div><small>'+esc(damage)+'</small></div>';
}
function drawCombat(){
  if(!battle)return false;
  const u=view.state.units.find(u=>sameId(u.id,battle.unit)), forecast=u&&combatPreview(view.state,u.id,battle.tile);
  if(!mayOrder()||!forecast){closeCombat();return false}
  if(battle.defenderId!=null && battle.defenderId!==forecast.defenderId){
    closeCombat();toast('The defender changed. Select the target again to review the new forecast.');return false;
  }
  battle.defenderId=forecast.defenderId;
  const defender=forecast.defenderType==="wild"?wildAt(view.state,battle.tile):forecast.defenderType==="city"?view.state.cities.find(c=>sameId(c.id,forecast.defenderId)):view.state.units.find(u=>sameId(u.id,forecast.defenderId));
  if(!defender){closeCombat();return false}
  text("combat-where",mapRegion.byId[battle.tile].name);
  const enemy=forecast.defenderType==="wild"?WILDS[defender.type].name:defender.type?items[defender.type]:defender.name;
  const attack=forecastRow("Attacker",items[u.type],forecast.attackerHpBefore,forecast.attackerHpAfter,u.maxHp,forecastCounterLabel(forecast),faction(u.seat).color);
  const defend=forecastRow("Defender",enemy,forecast.defenderHpBefore,forecast.defenderHpAfterHit??forecast.defenderHpAfter,defender.maxHp,forecast.damage+" incoming damage",forecast.defenderType==="wild"?"#c38566":faction(defender.seat).color);
  const cityHint=cityAttackHint(forecast,UNIT_TYPES[u.type],cityAt(battle.tile));
  const notes=[...(forecast.roleNotes||[]),...(cityHint?[cityHint]:[])].map(note=>'<li>'+esc(note)+'</li>').join('');
  const modifiers=notes?'<ul class="formation-notes">'+notes+'</ul>':'';
  const outcome=forecast.defenderType==="wild" && defender.type==="camp" && forecast.defeated?"Clearing the camp adds 12 capital to your treasury.":forecast.capture?"Your unit will capture this city.":forecast.attackerDefeated&&forecast.defeated?"Both units will fall.":forecast.attackerDefeated?"Your unit will fall in this attack.":forecast.defeated?"The defending unit will fall.":forecast.defenderType==="city" && !UNIT_TYPES[u.type].captures?captureOrderHint:"Both sides will hold their positions.";
  el("combat-preview").innerHTML='<div class="forecast-grid">'+attack+defend+'</div>'+modifiers+'<p class="forecast-outcome">'+esc(outcome)+'</p>';
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
let expansionForecasts = new Map();
function paint(next){
  expansionForecasts=getCityExpansions(next.state,next.seat);
  const previousKey=matchKey,previousState=view?.state;view=next;const {state,seat,mode,room}=next;
  mapRegion=getMap(state);
  visible=new Set(state.intel?.visible??Object.keys(state.board));explored=new Set(state.intel?.explored??Object.keys(state.board));
  const regionKey=mapRegion.id+'-'+mapRegion.mapSize;
  const key=regionKey+':'+mode+':'+(room?.code||next.session||'')+':'+seat;
  const focusOpening=key!==matchKey||!selectedTile||(state.round===1&&!explored.has(selectedTile));
  if(key!==matchKey){councilGoals.research="";councilGoals.civics="";}
  if(focusOpening){endPlacement();matchKey=key;activeRoster="units";selectOpening()}
  if(kind==="unit"){
    const u=getUnit();if(u)selectedTile=u.tile;else select(selectedTile,null,Boolean(cityAt(selectedTile)));
  }
  if(kind==="city"&&!cityAt(selectedTile))select(selectedTile);
  if(!mayOrder())order="";
  const player=state.players[seat],stats=getStats(state,seat),f=faction(seat);
  paintDiplomacy(next,stats);
  text("brand-region",mapRegion.shortName);text("campaign-title",mapRegion.name);
  text("chart-coordinate",mapRegion.coordinates);text("footer-region",mapRegion.shortName);
  document.querySelector(".map-panel").setAttribute("aria-label","Tactical map · "+mapRegion.shortName);
  text("faction-name",f.name);document.querySelector(".faction-icon").style.color=f.color;
  el("change-region").hidden=mode!=="solo";
  text("mode-name",mode==="solo"?"Solo campaign":"Online · "+room.code);document.querySelector(".multiplayer span").textContent=mode==="online"?"Room "+room.code:"Multiplayer";
  text("gold",player.capital);text("gold-rate","+"+stats.capitalIncome);
  text("influence",player.influence);text("influence-rate","+"+stats.influenceIncome);text("unit-count",ownUnits().length);text("city-count",ownCities().length);
  const finished=state.phase==="finished",myTurn=roomSeatTurn(state,seat)==="active",waiting=lobby();
  const teamStatus=teamTurnLabels(state,seat);
  const contacts=publicContacts(next),activeContact=contacts.find(c=>c.seat===state.turn);
  text("turn-owner",waiting?"Room lobby":finished?"Campaign over":teamStatus?teamStatus.owner:myTurn?"Your turn":activeContact?names[activeContact.faction]:document.documentElement.lang==="zh-CN"?"未知文明":"Unmet civilization");
  text("turn-number",'Turn '+String(state.round).padStart(2,'0'));
  el("turn-number").title=state.victoryMode?modeLabels[state.victoryMode]:'Up to '+MAX_ROUNDS+' turns';
  const trophy=el('score').closest('button');
  trophy.title=state.victoryMode?'Victory progress':'View faction standings';
  trophy.querySelector('.resource-label').textContent=state.victoryMode?'Victory':'Score';
  text('score',state.victoryMode ? (state.practice?'Space race':({standard:'Two paths',conquest:'Conquest',science:'Space race'})[state.victoryMode]) : stats.score);
  text("end-label",view.roomStatus || (waiting?"Open room":finished?"Standings":teamStatus?teamStatus.button:myTurn?"End turn":mode==="solo"?"Rivals playing…":state.players[state.turn]?.bot?"Computer playing…":"Waiting…"));
  el("end-turn").disabled=!waiting&&!finished&&(!myTurn||view.busy);
  const event=state.log.at(-1);text("event-turn","TURN "+String(event?.round||1).padStart(2,"0"));text("event-text",event?Game.eventText(event):"");
  el("legend").innerHTML=contacts.map(p=>'<span class="legend-item"><i class="swatch" style="--swatch:'+FACTIONS[p.faction].color+'"></i><span>'+esc(names[p.faction])+'</span>'+(state.teams?' · <span>'+teamLabel(state.teams[p.seat])+'</span>':'')+'</span>').join('');
  const eventKey=event?JSON.stringify(event):"";
  const receipt=previousKey===key ? developmentReceipt(previousState,state,seat,mapRegion) : null;
  if(receipt) toast(receipt);
  else if(previousKey===key && previousEvent && eventKey!==previousEvent && event?.seat===seat && !["start","end","develop"].includes(event.type))flash(Game.eventText(event));
  previousEvent=eventKey;
  updateWaterKey?.(mapRegion,explored);
  redraw();if(focusOpening && selectedTile && state.intel)atlas.focus(selectedTile,true);paintResearch();showCampusOpening(state,seat,key);populationLedger();
  if(el("production-modal").open)productionOptions();
  if(el("combat-modal").open)drawCombat();
  battleReports.update(next,key,mapRegion);
}
let campusNoticeKey='',hiddenCampusNotice='';
function showCampusOpening(state,seat,key){
  const recent=[...state.log].reverse().find(e=>e.type==="complete" && WONDERS[e.item] && e.seat===seat && state.round-e.round<=1);
  const id=recent?key+"|"+recent.round+"|"+recent.city+"|"+recent.item:"";
  const old=document.getElementById("campus-opening");
  if(!recent || hiddenCampusNotice===id){old?.remove();campusNoticeKey="";return}
  if(id===campusNoticeKey && old)return;
  const host=el("roster-panel");
  if(!host?.parentNode)return;
  const banner=document.createElement("aside");
  banner.id="campus-opening";banner.className="campus-banner";banner.setAttribute("aria-live","polite");
  banner.innerHTML='<img alt="" src="./art/'+recent.item+'.webp"><div><small>University opened</small><strong>'+esc(WONDERS[recent.item].name)+'</strong><small>'+esc(WONDERS[recent.item].description)+'</small></div><button type="button" aria-label="Dismiss campus notice">×</button>';
  banner.querySelector("button").onclick=()=>{hiddenCampusNotice=id;banner.remove()};
  old?.remove();host.before(banner);campusNoticeKey=id;
}
function populationLedger() {
  paintCityHall(view.state,view.seat,mayOrder());
  paintCitizenLedger(view.state,view.seat,mayOrder(),city=>({
    population:getPopulationReport(view.state,city.id),workforce:getCitizenWorkforce(view.state,city.id),projects:getProductionOptions(view.state,city.id)
  }));
}
function chooseOrder(key){
  if(moveDraft){moveDraft=null;updateMap();}
  if(key==="city-hall"){
    const c=cityAt(selectedTile);
    if(c?.seat===view.seat){openCityHall(c.id,action=>Game.doAction(action));paintCityHall(view.state,view.seat,mayOrder());}
    return;
  }
  if(key==="citizens"){
    const c=cityAt(selectedTile);
    if(c?.seat===view.seat){openCitizenLedger(c.id,(city,item)=>Game.doAction({type:"focus",city,item}),(city,item)=>Game.doAction({type:"produce",city,item}));populationLedger()}
    return;
  }
  if(key==="works-host"){
    const host=view.state.cities.find(c=>c.queue?.site===selectedTile || c.id===view.state.board[selectedTile]?.facilityCity);
    if(host?.seat===view.seat){select(host.tile,null,true);redraw();openProduction();}
    return;
  }
  if(key==="port-production"){
    const port=ownCities().find(c=>c.portTile===selectedTile);
    if(port){select(port.tile,null,true);redraw();openProduction()}
    return;
  }
  if(key==="supplies"){Game.open("supplies");return}
  if(key==="choose-production"){openProduction();return}
  if(["develop","claim","contest"].includes(key)&&mayOrder()){
    const tile=selectedTile,commands=el("entity-commands");
    const restoreFocus=key==="develop" && commands.contains(document.activeElement);
    const result=Game.doAction({type:key,tile});
    if(restoreFocus) Promise.resolve(result).then(()=>{
      if(tile!==selectedTile || kind!=="tile" || document.activeElement!==document.body)return;
      const next=commands.querySelector('[data-order="develop"]:enabled') || commands.querySelector('.district-development');
      next?.focus({preventScroll:true});
    });
    return;
  }
  const u=getUnit();if(!u||u.seat!==view.seat)return;
  if(key==="locate-station"){
    const station=nearestKnownStation(view.state,u,explored,hexDistance);
    if(station){atlas.focus(station);openMapOnMobile()}
    return;
  }
  if(mayOrder() && key.startsWith('station:')){Game.doAction({type:'visitStation',unit:u.id,item:key.slice(8)});return}
  if(key==="locate-care"){
    const station=getRecoveryForecast(view.state,u.id,view.seat)?.nearest;
    if(station){atlas.focus(station.tile);openMapOnMobile()}
    return;
  }
  if(!mayOrder())return;
  if(key.startsWith("train:")){order="";Game.doAction({type:"train",unit:u.id,item:key.slice(6)});return}
  if(key==="fortify"){order="";Game.doAction({type:"fortify",unit:u.id});return}
  if(["loadFreight","landFreight","returnFreight","landCatch","haulFish"].includes(key)){order="";Game.doAction({type:key,unit:u.id});return}
  if(key==="recover"){order="";Game.doAction({type:"recover",unit:u.id});return}
  if(key==="move"){
    order="";redraw();openMapOnMobile();return;
  }
  if(key==="attack"){
    const targets=getUnitOptions(view.state,u.id).attacks;
    if(targets.length===1){openCombat(u.id,targets[0]);return}
    order=order==="attack"?"":"attack";redraw();if(order)openMapOnMobile();return;
  }
  if(key==="survey"){Game.doAction({type:"survey",unit:u.id});return}
  if(key.startsWith("upgrade:")){order="";Game.doAction({type:"upgrade",unit:u.id,item:key.slice(8)});return}
  if(key==="found"){order="";Game.doAction({type:"found",unit:u.id});return}
  if(Object.hasOwn(IMPROVEMENTS,key)){order="";Game.doAction({type:"improve",unit:u.id,item:key})}
}
function chooseRoster(id){
  const units=activeRoster==="units",item=(units?ownUnits():ownCities()).find(o=>sameId(o.id,id));
  if(!item)return;closeMapPanel();select(item.tile,units?item.id:null,!units);atlas.focus(item.tile);redraw();openMapOnMobile();
}
function nextReady(){
  const ready=ownUnits().filter(u=>u.moves>0);if(!ready.length)return;
  const i=ready.findIndex(u=>sameId(u.id,selectedUnit));activeRoster="units";chooseRoster(ready[(i+1)%ready.length].id);
}
function showRoster(type){activeRoster=type;roster()}
function toggleLayers(open){el("layers-menu").hidden=!open;el("layers").setAttribute("aria-expanded",String(open))}
function mount(){
  atlas=createAtlas(el("atlas"),{viewInsets:chartViewInsets,onSelect:onMapSelect,onHover:updateHint,onZoom:percent=>text("map-zoom",Math.round(percent)+"%")});
  battleReports=mountBattleReports(atlas);
  parcelBar=document.createElement('section');parcelBar.className='work-sitebar';parcelBar.hidden=true;
  parcelBar.setAttribute('aria-label','Construction site selection');
  el('map-hint').before(parcelBar);
  parcelBar.onchange=e=>{
    if (!parcelOrder || !e.target.matches('[data-site-list]')) return;
    const site=parcelOptions.find(p=>p.id===e.target.value);
    if(site){parcelOrder.site=site.id;atlas.focus(site.id);}
    else delete parcelOrder.site;
    drawPlacement();updateMap();parcelBar.querySelector('[data-site-list]')?.focus({preventScroll:true});
  };
  parcelBar.onclick=e=>{
    if (!parcelOrder) return;
    if (e.target.closest('[data-site-cancel]')) {endPlacement();redraw();return;}
    if (!e.target.closest('[data-site-confirm]')) return;
    const city=view.state.cities.find(c=>c.id===parcelOrder.city && c.seat===view.seat);
    const option=city && getProductionOptions(view.state,city.id,{replace:true}).find(o=>o.item===parcelOrder.item);
    if (siteOrderAllowed(parcelOrder,city,option,parcelOptions,mayOrder())) {
      const {university,...action}=parcelOrder;endPlacement();redraw();Game.doAction(action);
    }
  };
  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>Game.open(b.dataset.open));
  el("board-nav").onclick=()=>{closeMapPanel();el("atlas").querySelector("canvas")?.focus({preventScroll:true})};
  el("end-turn").onclick=()=>{if(lobby())Game.open("multiplayer");else if(view.state.phase==="finished")Game.open("standings");else{moveDraft=null;order="";Game.endTurn()}};
  el("zoom-out").onclick=()=>atlas.zoomBy(.8);el("zoom-in").onclick=()=>atlas.zoomBy(1.25);el("recenter").onclick=()=>atlas.reset();
  el("inspect-map").onclick=()=>{order=order==="inspect"?"":"inspect";hoverId=null;redraw()};
  el("layers").onclick=()=>toggleLayers(el("layers-menu").hidden);
  mountSurveyControls(atlas);
  updateWaterKey=mountWaterKey(el('layers-menu'),id=>{
    if(!explored.has(id) || !chartedWaterSites(mapRegion,explored).some(site=>site.id===id))return;
    select(id);kind='tile';selectedUnit=null;order='inspect';toggleLayers(false);
    atlas.focus(id,true);redraw();updateHint(id);inspectMapOnMobile();
  });
  mountMapWorkspace();
  moveBar=document.createElement("section");
  moveBar.className="move-review";moveBar.hidden=true;moveBar.setAttribute("aria-label","Movement preview");
  moveBar.innerHTML=`<div class="move-place"><strong id="move-place"></strong> <small id="move-coord"></small></div>
    <div class="move-budget" aria-live="polite"><span>Move cost</span> <b id="move-cost"></b>
    <span>Remaining movement</span> <b id="move-left"></b></div>
    <div class="move-controls"><button data-move-cancel type="button">Cancel</button>
    <button data-move-confirm type="button">Confirm move</button></div>`;
  document.querySelector(".map-messages").prepend(moveBar);
  moveBar.onclick=e=>{
    const commit=e.target.closest("[data-move-confirm]");
    if(!commit && !e.target.closest("[data-move-cancel]"))return;
    const draft=moveDraft;
    const valid=commit && sameMove(draft,currentMove());
    moveDraft=null;updateMap();
    el("atlas").querySelector("canvas")?.focus({preventScroll:true});
    if(valid)Game.doAction({type:"move",unit:draft.unit,tile:draft.tile});
    else if(commit)toast("The route has changed. Choose a destination again.");
  };
  mountDiplomacy(action=>Game.doAction(action));
  document.querySelector('.map-messages')?.prepend(parcelBar);
  el("map-labels").onchange=e=>atlas.setLabels(e.currentTarget.checked);
  el("territory-lines").onchange=e=>atlas.setTerritories(e.currentTarget.checked);
  document.addEventListener("click",e=>{if(!e.target.closest(".layers-wrap"))toggleLayers(false)});
  el("entity-info").onclick=e=>{
    const target=e.target.closest("[data-frontier-tile]")?.dataset.frontierTile;
    const city=cityAt(selectedTile);
    if(!target || !city || expansionForecasts.get(city.id)?.tile!==target || !visible.has(target))return;
    select(target);redraw();openMapOnMobile();atlas.focus(target,true);
  };
  el("entity-commands").onclick=e=>{const b=e.target.closest("[data-order]");if(b&&!b.disabled)chooseOrder(b.dataset.order)};
  el("entity-tabs").onclick=e=>{
    const key=e.target.closest("[data-entity]")?.dataset.entity;
    if(!key)return;
    if(key==="land"){kind="tile";selectedUnit=null;order=""}
    else select(selectedTile,key.startsWith("u")?key.slice(1):null,key==="city");
    redraw();
    el("entity-tabs").querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
  };
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
    const founder=e.target.closest("[data-founding-unit]");
    if(founder){
      const unit=ownUnits().find(u=>sameId(u.id,founder.dataset.foundingUnit));
      if(unit){select(unit.tile,unit.id);atlas.focus(unit.tile);redraw();openMapOnMobile()}
      return;
    }
    const id=e.target.closest("[data-watch]")?.dataset.watch;
    const city=id && ownCities().find(c=>c.id===id);if(!city)return;
    select(city.tile,null,true);atlas.focus(city.tile);redraw();openProduction();
  };
  el("close-research").onclick=()=>el("research-modal").close();
  el("research-modal").onclick=e=>{if(e.target===el("research-modal"))el("research-modal").close()};
  const councilPanel=el("research-options");
  councilPanel.onchange=e=>{if(e.target.matches("[data-council-goal]"))showCouncilGoal(e.target.value,false)};
  councilPanel.onclick=e=>{
    const plan=e.target.closest("[data-plan-item],[data-path-back]");
    if(plan){showCouncilGoal(plan.dataset.planItem || "");return;}
    const b=e.target.closest("[data-project],[data-route-order]");
    if(!b || b.disabled || !mayOrder())return;
    const item=b.dataset.routeOrder || b.dataset.project;
    if(!councilTypes[councilKind].options(view.state,view.seat).some(o=>o.item===item && o.enabled))return;
    el("research-modal").close();Game.doAction({type:councilTypes[councilKind].action,item});
  };
  document.addEventListener('civitas-plan-research',e=>{
    const item=e.detail?.item;
    if(!view || !getResearchOptions(view.state,view.seat).some(o=>o.item===item))return;
    openCouncil('research');showCouncilGoal(item);
  });
  document.addEventListener('civitas-language',()=>{if(view && el('research-modal').open)paintResearch()});
  el("close-combat").onclick=closeCombat;el("cancel-combat").onclick=closeCombat;
  el("combat-modal").addEventListener("close",()=>{battle=null;updateMap()});
  el("combat-modal").onclick=e=>{if(e.target===el("combat-modal"))closeCombat()};
  el("confirm-combat").onclick=()=>{if(!battle||!drawCombat())return;const {unit,tile}=battle;closeCombat();order="";Game.doAction({type:"attack",unit,tile})};
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(moveDraft){moveDraft=null;updateMap();el("atlas").querySelector("canvas")?.focus({preventScroll:true});return;}if(parcelOrder){endPlacement();redraw();el("atlas").querySelector("canvas")?.focus({preventScroll:true});return;}if(el("layers-menu").contains(document.activeElement))el("layers").focus();toggleLayers(false);if(order){order="";redraw()}}});
  el("close-production").onclick=closeProduction;
  el("production-modal").addEventListener("close",()=>{productionCity=null});
  el("production-modal").onclick=e=>{if(e.target===el("production-modal"))closeProduction()};
  el('production-options').onchange=e=>{if (productionDraft && e.target.matches('[data-work-site]')) productionDraft.site=e.target.value;};
  el("production-options").onclick=e=>{
    const b=e.target.closest("button");
    if(!b||b.disabled||!productionCity)return;
    if (b.hasAttribute('data-work-back')) {productionDraft=null;productionOptions();return;}
    if (b.hasAttribute('data-work-confirm')) {
      if (!productionDraft || !mayOrder()) return;
      const action=productionDraft;
      productionDraft=null;closeProduction();Game.doAction(action);return;
    }
    const item=b.dataset.produce||b.dataset.buy, city=view.state.cities.find(c=>sameId(c.id,productionCity));
    if (!city || !item || !mayOrder()) return;
    const option=getProductionOptions(view.state,city.id,{replace:true}).find(o=>o.item===item);
    if (!option || (b.dataset.buy ? !option.buyEnabled : !option.enabled)) return;
    productionDraft=draftOrder(city,option,Boolean(b.dataset.buy));
    if (option.kind==='building' && city.queue?.item!==item) {startPlacement(productionDraft,city);return;}
    productionOptions();el('production-options').querySelector('[data-work-confirm]')?.focus();
  };
  el("roster-units").onclick=()=>showRoster("units");el("roster-cities").onclick=()=>showRoster("cities");
  for(const [id,type] of [["units-summary","units"],["cities-summary","cities"]])el(id).onclick=()=>{showRoster(type);showMapPanel("roster")};
  el("roster").onclick=e=>{const b=e.target.closest("[data-roster-id]");if(b)chooseRoster(b.dataset.rosterId)};
  el("next-unit").onclick=nextReady;
  function locateDistrict(tile){
    if(!explored.has(tile))return;
    select(tile,null,true);
    atlas.focus(tile);
    redraw();
    openMapOnMobile();
    el("atlas").querySelector("canvas")?.focus({preventScroll:true});
  }
  Game.init({render:paint,locate:locateDistrict,toast}).catch(error=>{console.error(error);toast("The game could not load. Refresh to try again.")});
}
mount();
