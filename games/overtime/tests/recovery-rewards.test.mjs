import assert from 'node:assert/strict';
import {Game} from '../dist/engine.mjs';
import {resolveFurniture} from '../dist/scene.mjs';
function quiet(){const g=new Game(()=>.5);g.spawnCd=999;g.raidAt=999;g.cd.plunger=999;g.drops=[];return g;}
let g=quiet();g.dropBomb();g.spawn('runner',1030,900);g.caffeine=8;g.xp=100;g.levelCheck();g.choose('speed');assert.equal(g.state,'countdown');assert.equal(g.resumeLeft,2);const snapshot=()=>JSON.stringify({t:g.t,p:g.player,bombs:g.bombs,enemies:g.enemies,cd:g.cd,boost:g.caffeine,xp:g.xp});let before=snapshot();for(let i=0;i<12;i++)g.step(.05,{x:1,y:0});assert.equal(snapshot(),before);assert.ok(Math.abs(g.resumeLeft-1.4)<1e-9);assert.equal(g.useBomb(),false);let left=g.resumeLeft;g.state='paused';for(let i=0;i<80;i++)g.step(.05);assert.equal(g.resumeLeft,left);assert.equal(snapshot(),before);g.state='countdown';for(let i=0;i<27;i++)g.step(.05,{x:1,y:0});assert.equal(g.state,'countdown');assert.ok(Math.abs(g.resumeLeft-.05)<1e-9);g.step(.05,{x:1,y:0});assert.equal(g.state,'playing');assert.equal(snapshot(),before);assert.equal(g.resumeLeft,0);g.step(.05,{x:1,y:0});assert.ok(g.t>0);assert.ok(g.player.x>900);assert.equal(g.state,'playing');assert.ok(g.nextUpgradeAt>=7);
// Stations grant one reward only, with no KO/chain inflation or health penalty.
// Build 31: a box is a mystery box. Breaking one rolls one item, with no KO or combo, and only once until it refills.
for(const s0 of quiet().supplies){g=quiet();let s=g.supplies.find(b=>b.id===s0.id);assert.equal(s.reward,'mystery');g.hit(s,60);assert.equal(g.kills,0);assert.equal(g.combo,0);let n=g.drops.length+g.puddles.length;assert.equal(n,1,'one item');g.hit(s,100);assert.equal(g.drops.length+g.puddles.length,n);assert.equal(s.refillAt,g.t+90);}
// Each actual attack path can break a station; it does not move when flushed.
for(const weapon of ['plunger','tp','gas','flush','bomb']){g=quiet();g.weapons={plunger:0,tp:0,gas:0,flush:0,bomb:0};g.weapons[weapon]=5;g.cd[weapon]=0;let s=g.supplies[0];s.hp=20;g.supplies=[s];g.player.x=s.x-(weapon==='tp'?86:40);g.player.y=s.y;const pos={x:s.x,y:s.y};if(weapon==='bomb')g.useBomb();for(let i=0;i<80&&s.hp>0;i++)g.step(.05);assert.ok(s.hp<=0,weapon+' should break station');assert.deepEqual({x:s.x,y:s.y},pos);}
// Caffeine expires in active time and stacks with the existing speed passive.
g=quiet();g.caffeine=1;g.passives.speed=3;assert.equal(g.movementSpeed(),292.5);g.state='paused';g.step(.05);assert.equal(g.caffeine,1);g.state='playing';for(let i=0;i<21;i++)g.step(.05);assert.equal(g.caffeine,0);assert.equal(g.movementSpeed(),234);
for(let id of [1,2]){g=new Game(()=>.5,{},0,'plunger',id);for(const s of g.supplies){let p={x:s.x,y:s.y};resolveFurniture(p,35,g.furniture);assert.deepEqual(p,{x:s.x,y:s.y});}}
console.log('PASS: countdown freezes all combat and timers, pause preserves countdown, clean resume, one-time station rewards, all five weapon interactions, coffee expiry and clear station placement.');

// Recovery uses elapsed time even when frames are slow; combat still uses capped steps.
g=quiet();g.openUpgrade();g.choose(g.choices[0].key);g.step(1.25,{x:1,y:0});assert.equal(g.state,'countdown');assert.equal(g.resumeLeft,.75);assert.equal(g.t,0);g.step(.75,{x:1,y:0});assert.equal(g.state,'playing');assert.equal(g.t,0);assert.equal(g.player.x,900);
