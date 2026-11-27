import test from 'node:test';
import assert from 'node:assert/strict';
import {invitationCode,launchDestination} from '../docs/launch.js';

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
