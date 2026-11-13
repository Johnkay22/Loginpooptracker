import assert from 'node:assert/strict';
import {PRACTICE_DESKS} from '../dist/tutorial-scene.mjs';
import {Practice} from '../dist/tutorial-model.mjs';
const move=new Practice();move.move(1,1,.5);assert.ok(Math.abs(move.distance-72.5)<.01,'diagonal movement is normalized');assert.ok(move.complete);move.move(-1,-1,100);assert.equal(move.x,28);assert.equal(move.y,24);
const cash=new Practice(1);assert.equal(cash.choose('speed'),false,'no promotion before collecting XP');for(const c of [...cash.coins]){cash.x=c.x;cash.y=c.y;cash.move(0,0,0);}assert.equal(cash.cash,5);assert.equal(cash.coins.length,0);assert.equal(cash.choose('bogus'),false);assert.equal(cash.choose('speed'),true);assert.equal(cash.choose('plunger'),false,'one choice per promotion');assert.ok(cash.complete);
const bomb=new Practice(2);assert.ok(bomb.deploy());assert.equal(bomb.bomb.x,bomb.x-25);assert.equal(bomb.deploy(),false);bomb.tick(2.9);assert.equal(bomb.complete,false);bomb.tick(.11);assert.equal(bomb.bomb,null);assert.ok(bomb.complete);assert.equal(bomb.deploy(),false);bomb.tick(9);assert.ok(bomb.deploy(),'12-second recharge starts on deployment');
const hp=new Practice(3);hp.heal('coffee');assert.equal(hp.hp,60);assert.equal(hp.complete,false);hp.heal('kit');assert.equal(hp.hp,76);hp.heal('kit');assert.equal(hp.hp,76,'practice cannot farm health');
const boss=new Practice(4);boss.attack();boss.tick(1);assert.ok(boss.warning);boss.tick(.11);assert.equal(boss.result,'hit');assert.equal(boss.hp,60,'practice never deals damage');boss.attack();const center=boss.warning.x;boss.move(1,0,.6);assert.equal(boss.warning.x,center,'warning stays fixed while player moves');boss.tick(1.11);assert.equal(boss.result,'dodged');assert.ok(boss.complete);
const reset=new Practice(2);assert.equal(reset.bomb,null);assert.equal(reset.cooldown,0);assert.equal(reset.complete,false,'replay resets all practice state');
console.log('Practice: movement, rewards, bomb timing, healing, dodge and replay passed.');

// The visible office desks use the game’s furniture collision, not just decoration.
const desk=PRACTICE_DESKS[0],walker=new Practice(0);walker.x=desk.x+desk.w/2;walker.y=desk.y+desk.h+30;
for(let i=0;i<60;i++)walker.move(0,-1,1/60);
assert.ok(walker.y>=desk.y+desk.h+11.9,'Herman stops at the desk edge');
