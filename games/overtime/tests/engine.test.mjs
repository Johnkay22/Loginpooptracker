import assert from 'node:assert/strict';
import {Game} from '../dist/engine.mjs';
function advance(g,seconds,input={x:0,y:0}){for(let i=0;i<seconds*20;i++)g.step(.05,input);}
// Lure redirects normal enemies, protects executives from trivial distraction, and detonates on schedule.
let g=new Game(()=>.5);g.spawnCd=999;g.weapons.plunger=0;g.cd.plunger=999;g.weapons.bomb=1;g.cd.bomb=999;g.dropBomb();let b=g.bombs[0];let e=g.spawn('worker',b.x+100,b.y),exec=g.spawn('exec',b.x+100,b.y+80);g.player.x=1300;let x=e.x;advance(g,1);assert.ok(e.x<x);assert.equal(e.attracted,true);assert.equal(exec.attracted,false);assert.equal(g.bombs.length,1);advance(g,2.1);assert.equal(g.bombs.length,0);assert.ok(g.kills>=1);
// Upgrade screen freezes simulation and rejects options not actually offered.
g=new Game(()=>.5);g.xp=g.need;g.levelCheck();assert.equal(g.state,'upgrade');let t=g.t;g.step(.05,{x:1,y:0});assert.equal(g.t,t);assert.equal(g.weapons.bomb,1);assert.equal(g.choose('not-a-weapon'),false);let chosen=g.choices[0].key;assert.equal(g.choose(chosen),true);
// Boundary, HP, pause and loss conditions.
g=new Game();g.state='paused';advance(g,1);assert.equal(g.t,0);g.state='playing';g.spawnCd=999;g.player.x=1730;advance(g,1,{x:1,y:0});assert.equal(g.player.x,1735);let crossing=g.spawn('exec',1685,100);g.step(.05);assert.equal(g.state,'playing');assert.ok(crossing.y>100);
// Surviving the timer begins the boss fight; defeating the boss clears the stage.
g=new Game();g.spawnCd=999;g.t=180;g.step(.05);assert.equal(g.state,'playing');assert.equal(g.phase,'boss');assert.ok(g.boss.hp>0);g.hit(g.boss,1e9);g.step(.05);assert.equal(g.state,'won');
// All five weapons run together without NaN state under load.
g=new Game(()=>.6);g.weapons={plunger:5,tp:5,gas:5,flush:5,bomb:5};g.player.max=100000;g.player.hp=100000;for(let i=0;i<3600;i++){if(g.state==='upgrade')g.choose(g.choices[0].key);if(g.state==='countdown'){g.step(.05);continue;}if(g.state!=='playing')break;g.step(.05,{x:Math.cos(i*.008),y:Math.sin(i*.008)});assert.ok(Number.isFinite(g.player.x));assert.ok(g.enemies.every(e=>Number.isFinite(e.hp)&&Number.isFinite(e.x)));}assert.ok(g.kills>10);console.log('PASS: lure, detonation, executive resistance, upgrades, pause, bounds, no escape loss, boss victory and combined weapon simulation.');
// Runner commits to a readable direction; a bomb interrupts windup/dash.
g=new Game(()=>.5);g.spawnCd=999;g.cd.plunger=999;g.raidAt=999;let runner=g.spawn('runner',1050,900);runner.chargeCd=0;g.step(.05);assert.ok(runner.windup>0);let aim={...runner.aim},rx=runner.x;g.player.y=1100;advance(g,.4);assert.equal(runner.x,rx);assert.deepEqual(runner.aim,aim);advance(g,.4);assert.ok(runner.dash>0);assert.equal(runner.y,900);g.bombs.push({x:runner.x+50,y:runner.y,t:0,fuse:3,lure:200,blast:115,damage:135});g.step(.05);assert.equal(runner.attracted,true);assert.equal(runner.dash,0);assert.equal(runner.windup,0);
// A rush announces before spawning and leaves a safe gap.
g=new Game(()=>.5);g.spawnCd=999;g.cd.plunger=999;g.t=45;g.step(.05);assert.equal(g.raids.length,1);assert.equal(g.enemies.length,0);advance(g,1.4);assert.equal(g.raids.length,0);assert.equal(g.enemies.length,12+Math.floor(g.t/20));assert.ok(g.enemies.every(e=>Math.hypot(e.x-900,e.y-900)>300));
// No executive hunt interrupts the survival phase.
g=new Game(()=>.5);g.spawnCd=999;g.raidAt=999;g.cd.plunger=999;g.t=32;g.step(.05);assert.equal(g.enemies.length,0);assert.equal(g.phase,'survival');
// Passive standing cannot survive; aggressive movement remains covered by simulation.
let seed=42;g=new Game(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;});for(let i=0;i<1500&&g.state!=='lost';i++){if(g.state==='upgrade')g.choose(g.choices[0].key);g.step(.05);}assert.equal(g.state,'lost');assert.ok(g.t<35);
console.log('PASS: telegraphed charge, fixed aim, bomb interruption, rush warning, survival phase and passive-play pressure.');
