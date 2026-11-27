// Fixed historical opening for tests of old saves, tightly staged battles and
// board-specific ports. Public games and the campaign playtest use createGame.
import {FACTIONS, getMap, validMapId, migrateGame, ACTIONS_PER_TURN} from '../docs/rules.js';
export function createClassicGame(players = FACTIONS.map((f,i)=>({name:i?f.name:'You',bot:i>0})), mapId = 'la') {
  if (!validMapId(mapId)) throw new Error('Unknown campaign map.');
  const map = getMap({mapId});
  const state = {mapId,round:1,turn:0,actionsLeft:ACTIONS_PER_TURN,phase:'playing',winners:[],
    board:Object.fromEntries(map.tiles.map(tile=>[tile.id,{owner:null,level:0}])),
    players:players.map((p,seat)=>({name:typeof p==='string'?p:p.name,bot:p.bot===true,
      faction:seat,color:FACTIONS[seat].color,capital:12,influence:6,score:0})),
    log:[{round:1,seat:0,type:'start',text:'The campaign has begun.'}]};
  state.players.forEach((p,i)=>map.starts[i].forEach(id=>{state.board[id].owner=i;}));
  return migrateGame(state);
}
