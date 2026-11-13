import assert from 'node:assert/strict';
import {Game} from '../dist/engine.mjs';
import {bossPath,clearSegment} from '../dist/navigation.mjs';
import {furnitureFor,resolveFurniture} from '../dist/scene.mjs';
function quiet(stage=1){let g=new Game(()=>.5,{},0,'plunger',stage);g.spawnCd=999;g.raidAt=999;g.weapons.plunger=0;g.drops=[];return g;}
// Passing the old exit, including during boss combat, can never cause defeat.
let g=quiet();g.t=180;g.step(.01);g.spawnCd=999;g.boss.x=1700;g.boss.y=900;g.player.x=1500;g.player.y=900;let x=g.boss.x;g.step(.05);assert.equal(g.state,'playing');assert.ok(g.boss.x<x);assert.equal(g.boss.attracted,false);
// The targeted area stays fixed while the player moves, freezes on pause, and can be dodged.
g=quiet();g.t=180;g.step(.01);g.spawnCd=999;g.boss.x=900;g.boss.y=700;g.boss.attackCd=0;g.step(.05);let a=g.bossAttacks[0];assert.equal(a.x,900);assert.equal(a.y,900);assert.equal(g.player.hp,100);g.state='paused';g.step(.05);assert.equal(a.t,0);g.state='playing';g.player.x=1200;for(let i=0;i<23;i++)g.step(.05);assert.equal(g.player.hp,100);assert.equal(g.bossAttacks.length,0);
// Staying in the warning causes one hit. Shared invulnerability prevents stacked hits.
g.player.x=900;g.boss.attackCd=0;g.step(.05);for(let i=0;i<23;i++)g.step(.05);assert.equal(g.player.hp,78);assert.equal(g.hurtPlayer(22),false);assert.equal(g.player.hp,78);
// Reaching zero health is the loss condition, including during a boss attack.
g.player.inv=0;g.player.hp=10;g.hurtPlayer(22);assert.equal(g.state,'lost');assert.equal(g.player.hp,0);
// Boss resists bomb lure, but takes blast damage.
g=quiet();g.t=180;g.step(.01);g.spawnCd=999;g.boss.x=1000;g.boss.y=900;g.boss.attackCd=999;g.boss.speed=0;g.bombs.push({x:1000,y:900,t:2.99,fuse:3,lure:300,blast:115,damage:135});let hp=g.boss.hp;g.step(.05);assert.equal(g.boss.attracted,false);assert.equal(g.boss.hp,hp-135);
// No timer loss during the boss fight; a kill wins immediately, not after another countdown.
g.t=400;g.step(.01);assert.equal(g.state,'playing');g.hit(g.boss,1e9);g.step(.01);assert.equal(g.state,'won');assert.equal(g.bossDefeated,true);
// Navigation routes around furniture instead of walking through it or sticking to its face.
for(const stage of [1,2]){const obstacles=furnitureFor(stage);for(const o of obstacles){const start={x:o.x-65,y:o.y+o.h/2},goal={x:o.x+o.w+65,y:o.y+o.h/2},path=(resolveFurniture(start,33,obstacles),bossPath(start,goal,obstacles,30));assert.ok(path.length>=2);let prev=start;for(const next of path){assert.ok(clearSegment(prev,next,obstacles,30));prev=next;}}}
// A stationary player across a desk can be reached by the boss on either map.
for(const stage of [1,2]){g=quiet(stage);const o=g.furniture[0];g.player={...g.player,x:o.x+o.w+70,y:o.y+o.h/2};g.t=180;g.step(.01);g.spawnCd=999;Object.assign(g.boss,{x:o.x-70,y:o.y+o.h/2,attackCd:999,navCd:0});for(let i=0;i<300;i++){g.step(.05);let q={x:g.boss.x,y:g.boss.y};resolveFurniture(q,g.boss.r,g.furniture);assert.ok(Math.hypot(q.x-g.boss.x,q.y-g.boss.y)<.01);if(g.player.hp<100)break;}assert.ok(g.player.hp<100);}
console.log('PASS: no escape losses, pursuing boss, readable/dodgeable attacks, pause, damage cooldown, bomb interaction, unlimited boss phase, victory and navigation.');
