import test from 'node:test';
import assert from 'node:assert/strict';
import {invitationCode,launchDestination} from '../docs/launch.js';
import {newSolo,restoreSolo,soloSlotKey} from '../docs/solo-saves.js';
import {getMap} from '../docs/rules.js';

const home='https://wanzhengyan.github.io/Civilization-CA/';
test('reading the title never starts solo or connects to an earlier private room',()=>{
  assert.deepEqual(launchDestination(home,false,{}),{screen:'home'});
  assert.deepEqual(launchDestination(home,true,{ABC123:'saved-seat'}),{screen:'home'});
});
test('explicit campaign and room bookmarks restore the right mode',()=>{
  assert.deepEqual(launchDestination(home+'#campaign',true,{}),{screen:'solo'});
  assert.deepEqual(launchDestination(home+'#campaign',false,{}),{screen:'home'});
  assert.deepEqual(launchDestination(home+'?room=abc123#campaign',true,{}),{screen:'join',code:'ABC123'});
  assert.deepEqual(launchDestination(home+'?room=abc123',false,{ABC123:'saved-seat'}),{screen:'reconnect',code:'ABC123'});
  assert.deepEqual(launchDestination(home+'?room=broken-code',true,{}),{screen:'join',code:''});
});
test('the Join Room form accepts a code or an invitation and rejects unrelated links',()=>{
  assert.equal(invitationCode(' abC123 '),'ABC123');
  assert.equal(invitationCode(home+'?room=abc123#anything'),'ABC123');
  assert.equal(invitationCode(home),'');
  assert.equal(invitationCode('ABC1234'),'');
  assert.equal(invitationCode('https://example.invalid/?room=%3Cbad%3E'),'');
});

test('official site invitations open the selected setup without replacing a saved game or room bookmark',()=>{
  assert.deepEqual(launchDestination(home+'game.html?setup=solo&region=sf',true,{}),{screen:'setup',mode:'solo',region:'sf'});
  assert.deepEqual(launchDestination(home+'game.html?setup=host&region=xx',false,{}),{screen:'setup',mode:'create',region:null});
  assert.deepEqual(launchDestination(home+'game.html?setup=host&room=ABC123',false,{}),{screen:'join',code:'ABC123'});
  assert.deepEqual(launchDestination(home+'game.html?setup=solo#campaign',true,{}),{screen:'solo'});
});

test('solo setups retain the previous standard save keys and resume every supported rival count',()=>{
  for(const region of ['la','sf','sd']) {
    assert.equal(soloSlotKey(region), 'angel-basin.solo.v1.'+region);
    assert.equal(soloSlotKey(region),soloSlotKey(region,'standard'));
    assert.notEqual(soloSlotKey(region),soloSlotKey(region,'large'));
    for(const size of ['standard','large']) for(const rivals of [1,2,3]) {
      const game = newSolo(region,size,rivals);
      const loaded = restoreSolo(JSON.parse(JSON.stringify(game)));
      assert.equal(Object.keys(loaded.board).length,getMap(region,size).tiles.length);
      assert.equal(loaded.players.filter(seat=>seat.bot).length,rivals);
      assert.equal(loaded.players.length,rivals+1);
    }
  }
});
