import assert from 'node:assert/strict';
import test from 'node:test';
import {changeRoomSetup,difficultyField,difficultyNotes,roomPreset,roomSetupFields,validRoomTeams} from '../docs/room-setup.js';
import {newSolo,restoreSolo} from '../docs/solo-saves.js';
import {translate} from '../docs/i18n.js';

test('room presets reserve the first human for the host and every custom seat retains its public team',()=>{
  assert.deepEqual(roomPreset('open').seats,[]);
  assert.deepEqual(roomPreset('duel').seats,[{kind:'human',team:0},{kind:'bot',team:1,difficulty:'normal'}]);
  const coop=roomPreset('coop');
  assert.deepEqual(coop.seats.map(s=>s.kind),['human','bot','human','bot']);
  assert.deepEqual(coop.seats.map(s=>s.team),[0,1,0,1]);
  assert.deepEqual(roomPreset('free').seats.map(s=>s.team),[0,1,2,3]);
  assert.equal(changeRoomSetup(coop,'seat-kind-0','bot'),null);
  let custom=changeRoomSetup(coop,'seat-difficulty-3','hard');
  assert.equal(custom.preset,'custom');
  assert.equal(custom.seats[3].difficulty,'hard');
  assert.equal(coop.seats[3].difficulty,'normal');
  custom=changeRoomSetup(custom,'seat-kind-3','human');
  assert.deepEqual(custom.seats[3],{kind:'human',team:1});
  custom=changeRoomSetup(custom,'roomSeatCount','2');
  custom=changeRoomSetup(custom,'seat-team-1','0');
  assert.equal(validRoomTeams(custom),false);
  assert.match(roomSetupFields(custom),/role="alert"/);
  custom=changeRoomSetup(custom,'seat-team-1','1');
  assert.equal(validRoomTeams(custom),true);
  assert.match(roomSetupFields(custom),/name="seat-team-1"/);
});

test('fixed rosters show uneven teams, editable difficulty, and bilingual strategy explanations',()=>{
  let config=roomPreset('coop');
  assert.match(roomSetupFields(config),/Compare civilization traits/);
  assert.match(roomSetupFields(roomPreset('duel')), /seat-civilization-1/);
  assert.doesNotMatch(roomSetupFields(config),/Teams are uneven/);
  config=changeRoomSetup(config,'seat-team-2','1');
  assert.match(roomSetupFields(config),/Teams are uneven/);
  assert.doesNotMatch(roomSetupFields(config),/Team civic target|name="seat-civilization-2"/);
  const original=roomSetupFields(config);
  assert.match(original,/name="seat-difficulty-3"/);
  assert.doesNotMatch(original,/name="seat-difficulty-0"/);
  for(const [difficulty,note] of Object.entries(difficultyNotes)){
    assert.ok(original.includes(note));
    assert.ok(difficultyField(difficulty).includes(note));
    assert.notEqual(translate(note,'zh-CN'),note);
  }
  for(const title of ['Room setup','Team A','Computer','Allied city','Team standings','Shared victory','Hard']) {
    assert.notEqual(translate(title,'zh-CN'),title);
  }
});

test('solo opponents retain their difficulty across a save, with normal legacy games and no difficulty bonus in practice',()=>{
  for(const difficulty of ['easy','normal','hard']){
    const game=newSolo('sd','standard',1,100,difficulty);
    const loaded=restoreSolo(JSON.parse(JSON.stringify(game)));
    assert.equal(loaded.difficulty || 'normal',difficulty);
    assert.equal(loaded.players[0].capital,12);
    assert.equal(loaded.players[1].capital,12);
  }
  assert.equal(newSolo('la','standard',0,125,'hard').difficulty,undefined);
});
