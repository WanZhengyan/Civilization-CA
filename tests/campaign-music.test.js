import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {CampaignMusic,loadMusicPreference,themes} from '../docs/campaign-music.js';

const waitForAudio = ()=>new Promise(resolve=>setImmediate(resolve));
function fixture() {
  const stored = new Map();
  const storage = {getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)};
  const sources = [],loads=[];
  const gain = ()=>({gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}},connect(){},disconnect(){}});
  const ctx = {state:'suspended',currentTime:0,destination:{},createGain:gain,
    async resume(){this.state='running';},async suspend(){this.state='suspended';},
    async decodeAudioData(data){return data;},
    createBufferSource(){const source={connect(){},disconnect(){},start(){this.playing=true;},stop(){this.playing=false;}};sources.push(source);return source;}};
  const music = new CampaignMusic({storage,createContext:()=>ctx,readAudio:url=>new Promise(resolve=>loads.push({url,resolve}))});
  return {music,ctx,loads,sources,storage};
}

test('all three original soundtracks ship as distinct MPEG files',()=>{
  const audio=Object.values(themes).map(t=>readFileSync(new URL('../docs/music/'+t.file,import.meta.url)));
  for(const file of audio){assert.equal(file.subarray(0,3).toString(),'ID3');assert.ok(file.length>100000);}
  assert.ok(audio.every((file,i)=>audio.every((other,j)=>i===j || !file.equals(other))));
});

test('sound starts only in an active game after interaction and pauses when hidden',async()=>{
  const {music,ctx,loads,sources}=fixture();
  music.activate();await waitForAudio();assert.equal(loads.length,0);
  music.setScene('frontier');await waitForAudio();assert.equal(loads.length,1);
  loads[0].resolve({});await waitForAudio();
  assert.equal(music.status,'playing');assert.equal(sources[0].loop,true);
  music.setVisible(false);assert.equal(ctx.state,'suspended');
  music.setVisible(true);await waitForAudio();assert.equal(ctx.state,'running');assert.equal(loads.length,1);
  music.setScene(null);assert.equal(sources[0].playing,false);
});

test('late loads cannot replace a newer era, and a hidden load remains silent',async()=>{
  const {music,loads,sources}=fixture();
  music.setScene('frontier');assert.equal(loads.length,0);
  music.activate();await waitForAudio();music.setScene('industrial');
  loads[1].resolve({});await waitForAudio();loads[0].resolve({});await waitForAudio();
  assert.equal(sources.length,1);assert.equal(music.active.scene,'industrial');
  music.setScene('modern');music.setVisible(false);loads[2].resolve({});await waitForAudio();
  assert.equal(sources.length,1);
});

test('mute and volume survive a fresh session and zero volume does not play',async()=>{
  const {music,storage,loads}=fixture();
  music.setPreference({enabled:false,volume:22});
  assert.deepEqual(loadMusicPreference(storage),{enabled:false,volume:22});
  music.setScene('frontier');music.activate();await waitForAudio();assert.equal(loads.length,0);
  music.setPreference({enabled:true,volume:0});music.activate();await waitForAudio();assert.equal(loads.length,0);
});
