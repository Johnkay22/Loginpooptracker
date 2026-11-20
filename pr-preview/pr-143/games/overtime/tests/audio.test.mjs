// Build 29: audio. Herman's voice lines and when he says them, separate Sound Effects and Music switches, a music
// player that is ready for tracks, warnings that sound different from each other, and a calmer runner sound.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {VOICE,VOICE_CLIPS,VOICE_GAP,createVoice} from '../dist/voice.mjs';
import {MUSIC,hasMusic,trackFor,createMusicPlayer} from '../dist/music.mjs';
import {Game} from '../dist/engine.mjs';
import {SURVIVAL_ID} from '../dist/stages.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const dist=path.join(root,'dist');
const read=f=>fs.readFileSync(path.join(dist,f),'utf8');
const app=read('app.mjs'),html=read('index.html'),css=read('style.css'),engine=read('engine.mjs');

// 1. The 13 lines Johnny picked: each has a clip, and every clip belongs to a moment.
assert.deepEqual(Object.keys(VOICE),['start','promotion','evolve','streak','bomb','low','rush','exec','lose']);
assert.equal(VOICE_CLIPS.length,13);assert.equal(VOICE_GAP,45);
const files=fs.readdirSync(path.join(dist,'assets/voice')).filter(f=>f.endsWith('.mp3')).map(f=>f.slice(0,-4)).sort();
assert.deepEqual(files,[...VOICE_CLIPS].sort(),'one clip file per line, no extras');
for(const f of files){const size=fs.statSync(path.join(dist,'assets/voice',f+'.mp3')).size;assert.ok(size>5000&&size<45000,f+' is a short clip ('+size+' bytes)');}

// 2. When Herman speaks.
{const v=createVoice({random:()=>0});
 assert.equal(v.pick('start',0),'business','a line at clock-in, always');
 assert.equal(v.pick('promotion',10),null,'quiet for 45 seconds after any line');
 assert.equal(v.pick('streak',44.9),null);assert.equal(v.pick('streak',45),'on-a-roll');
 assert.equal(v.pick('streak',89),null,'still 45 seconds apart');assert.equal(v.pick('streak',90),'wipe-em-out','the other clip for that moment');
 assert.equal(v.pick('streak',200),null,'each clip once per run');
 assert.equal(v.pick('promotion',200),'big-dump');assert.equal(v.pick('promotion',400),null);
 assert.equal(v.pick('lose',201),'pooped','the clocked-out line ignores the gap');assert.equal(v.pick('lose',202),'pooped');
 assert.equal(v.pick('nothing',999),null);
 v.reset();assert.equal(v.pick('start',0),'potty','never the same clock-in line twice in a row');
 assert.equal(v.pick('streak',50),'on-a-roll','a new run can use every clip again');
 v.reset();assert.equal(v.pick('start',0),'business');}
// A long run hears at most one line per 45 seconds, plus the bookends.
{const v=createVoice({random:Math.random});const said=[];const moments=['promotion','evolve','streak','bomb','low','rush','exec'];v.pick('start',0);
 for(let t=1;t<=900;t++)for(const m of moments){const c=v.pick(m,t);if(c)said.push([t,c]);}
 assert.equal(said.length,10,'all ten mid-run clips, once each');assert.equal(new Set(said.map(s=>s[1])).size,10);
 for(let i=1;i<said.length;i++)assert.ok(said[i][0]-said[i-1][0]>=VOICE_GAP);assert.ok(said[0][0]>=VOICE_GAP);}

// 3. The game raises the moments, and the lines follow the Sound Effects switch.
assert.match(app,/function say\(moment,delay=0\)\{if\(muted\|\|!g\)return;const clip=voice\.pick\(moment,g\.t\);/);
for(const [when,moment] of [["event.type==='upgrade'&&g.upgradeKind==='promotion'","promotion"],["event.type==='evolve'","evolve"],["event.type==='combo'","streak"],["event.type==='boom'&&event.text","bomb"],["event.text.startsWith('RUSH SURVIVED')","rush"],["event.type==='exec-in'","exec"],["g.player.hp<g.player.max*.25)say","low"]])
 assert.ok(app.includes(when)&&app.includes("say('"+moment+"'"),'trigger for '+moment);
assert.match(app,/voice\.reset\(\);fetchVoice\(\);say\('start',\.35\);/);assert.match(app,/if\(!won\)say\('lose',/);
assert.ok(engine.includes("'RUSH SURVIVED · FIRST AID KIT DROPPED'")&&engine.includes("this.event('combo'"),'the engine still raises what the lines listen for');
// No speech bubble: the lines are audio only.
assert.ok(!/speech|bubble/i.test(html));

// 4. Warnings have their own events, and each has its own sound setting (one siren clip at different pitches for now).
{const g=new Game(()=>.5,{},0,'plunger',SURVIVAL_ID);g.player.max=1e9;g.player.hp=1e9;const seen=new Set();
 for(let i=0;i<4000&&g.t<185;i++){if(g.state==='upgrade')g.choose(g.choices[0].key);g.step(.05,{x:0,y:0});for(const e of g.events)seen.add(e.type);g.events.length=0;}
 for(const t of ['rush','exec-in','boss-warn','boss-arrive'])assert.ok(seen.has(t),'engine raised '+t);assert.ok(!seen.has('alert'),'no shared alert left');}
const mix=app.slice(app.indexOf('const SFX_MIX={'),app.indexOf('let sfxBuffers'));
const rate=k=>{const m=mix.match(new RegExp("'?"+k+"'?:\\{[^}]*\\}"));assert.ok(m,'mix for '+k);const r=m[0].match(/rates:\[([^\]]*)\]/);return r?r[1]:'1';};
assert.equal(new Set(['rush','exec-in','boss-warn','boss-arrive'].map(rate)).size,4,'four different pitches');
for(const t of ['rush','exec-in','boss-warn','boss-arrive'])assert.ok(new RegExp("'?"+t+"'?:\\['siren'\\]").test(app),t+' never falls back to a beep');
// The runner's huff: quieter, at most once every 2.5 seconds, rotating three pitches.
{const m=mix.match(/charge:\{([^}]*)\}/)[1];assert.match(m,/gap:2\.5/);assert.match(m,/rates:\[1,\.85,1\.18\]/);assert.ok(Number(m.match(/vol:([.\d]+)/)[1])<=.45);}
assert.match(app,/if\(mix\.rates\)\{rateTurn\[type\]=\(rateTurn\[type\]\|\|0\)\+1;src\.playbackRate\.value\*=mix\.rates\[rateTurn\[type\]%mix\.rates\.length\];\}/);

// 5. Two switches. Sound Effects keeps its saved setting; Music has its own and starts out matching it.
for(const id of ['sound','music','soundPause','musicPause','soundPauseIcon','musicPauseIcon'])assert.ok(html.includes(`id="${id}"`),'#'+id);
assert.ok(html.includes('<span class="pz-sound-label">Sound effects</span>')&&html.includes('<span class="pz-sound-label">Music</span>'));
assert.ok(html.indexOf('id="soundPause"')<html.indexOf('id="musicPause"'));
assert.match(html,/id="music"[^>]*hidden/);assert.match(html,/id="musicPause"[^>]*hidden/);
assert.match(app,/localStorage\.getItem\('pp-overtime-sound'\)==='off'/);assert.match(app,/const saved=localStorage\.getItem\('pp-overtime-music'\);musicOn=saved\?saved==='on':!muted;/);
assert.match(app,/for\(const id of \['music','musicPause'\]\)\$\(id\)\.hidden=!music;/,'the Music switches only show when there is music');
assert.match(app,/const music=hasMusic\(\)\?createMusicPlayer\(/);
assert.ok(css.includes('#music.sv2-icon[hidden],.pz-sound[hidden]{display:none}'));

// 6. Music: nothing listed yet, so no player; the rules for which loop plays are ready.
assert.deepEqual(Object.keys(MUSIC),['menu','levels','survival','boss','win','lose']);
for(const [k,f] of Object.entries(MUSIC))if(f)assert.ok(fs.existsSync(path.join(dist,'assets/music',f)),'listed track '+k+' exists: '+f);
assert.equal(hasMusic(),Object.values(MUSIC).some(Boolean));assert.equal(hasMusic({menu:''}),false);assert.equal(hasMusic({menu:'m.mp3'}),true);
{const all={menu:'a',levels:'b',survival:'c',boss:'d',win:'e',lose:'f'};
 assert.equal(trackFor({screen:'menu'},all),'menu');assert.equal(trackFor({screen:'play',endless:false,boss:false},all),'levels');
 assert.equal(trackFor({screen:'play',endless:true,boss:false},all),'survival');assert.equal(trackFor({screen:'play',endless:true,boss:true},all),'boss');
 assert.equal(trackFor({screen:'end'},all),null);
 const three={menu:'a',levels:'b',boss:'d'};assert.equal(trackFor({screen:'play',endless:true},three),'levels','survival borrows the levels loop');
 assert.equal(trackFor({screen:'play',endless:false,boss:true},{menu:'a',levels:'b'}),'levels','no boss track: the mode loop carries on');
 assert.equal(trackFor({screen:'menu'},{levels:'b'}),null);assert.equal(trackFor({screen:'play',endless:true,boss:true},{}),null);}
// The player, with stand-in audio objects: one loop at a time, stings play once, off means silence.
{const made=[];const param=()=>({value:0,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(t){this.value=t;}});
 const node=()=>({gain:param(),frequency:param(),connect(){},type:''});const ctx={currentTime:0,destination:{},createGain:node,createBiquadFilter:node,createMediaElementSource:()=>({connect(){}})};
 const makeAudio=src=>{const a={src,loop:false,paused:true,currentTime:0,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};made.push(a);return a;};
 const tracks={menu:'menu.mp3',survival:'surv.mp3',boss:'boss.mp3',lose:'lose.mp3',levels:'',win:''};
 const p=createMusicPlayer({url:f=>'assets/music/'+f,getCtx:()=>ctx,makeAudio,fade:0,tracks});
 p.set('menu');assert.equal(p.current,'menu');assert.equal(made[0].src,'assets/music/menu.mp3');assert.ok(made[0].loop&&!made[0].paused);
 p.set('menu');assert.equal(made.length,1,'asking again does nothing');
 p.set('survival');assert.equal(p.current,'survival');assert.ok(!made[1].paused);
 p.set('levels');assert.equal(p.current,null,'a track that is not listed is silence');
 p.sting('win');assert.equal(p.current,null,'a missing sting does nothing');
 p.set('boss');p.sting('lose');assert.equal(p.current,'lose');assert.equal(made.find(a=>a.src.endsWith('lose.mp3')).loop,false,'stings do not loop');
 p.enable(false);assert.equal(p.current,null);p.set('menu');assert.equal(p.current,null,'off means off');
 p.enable(true);p.set('menu');assert.equal(p.current,'menu');p.muffle(true);p.muffle(false);
 await new Promise(r=>setTimeout(r,120));assert.ok(made[1].paused,'the old loop stops after its fade');}
assert.match(app,/music\.muffle\(s==='paused'\|\|s==='upgrade'\);/,'muffled on the pause and promotion screens');

// 7. Build: sound effects stay inside the page; voice and music stay outside it and are pointed at this folder.
const out=path.join(root,'tools','tmp','test-build-audio.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
execFileSync('node',[path.join(root,'tools/build-single-file.mjs'),dist,out,'--plain'],{stdio:'ignore'});
const built=fs.readFileSync(out,'utf8');fs.rmSync(out);
assert.ok(built.includes('games/overtime/dist/assets/voice/')&&built.includes('games/overtime/dist/assets/music/'),'audio paths point back into the repo');
assert.ok(!/["'`]assets\/(voice|music)\//.test(built),'no path left that only works from the dist folder');
assert.ok(!built.includes(fs.readFileSync(path.join(dist,'assets/voice/business.mp3')).toString('base64').slice(0,200)),'voice clips are not packed into the page');
assert.ok(built.includes(fs.readFileSync(path.join(dist,'assets/sfx/siren.mp3')).toString('base64').slice(0,200)),'sound effects still are');
console.log('PASS: Herman has 13 lines with a 45-second gap and bookends, warnings and the runner have their own sound settings, Sound Effects and Music are separate switches, and the music player is ready for tracks.');
