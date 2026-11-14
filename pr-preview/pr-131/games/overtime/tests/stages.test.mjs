import assert from 'node:assert/strict';
import {Game} from '../dist/engine.mjs';
import {fresh,normalize,settle} from '../dist/progress.mjs';
import {STAGES,canPlayStage,resultTitle} from '../dist/stages.mjs';
import {furnitureFor,resolveFurniture} from '../dist/scene.mjs';
const quiet=id=>{const g=new Game(()=>.5,{},0,'plunger',id);g.spawnCd=999;g.raidAt=999;g.cd.plunger=999;return g;};
let p=fresh();assert.equal(canPlayStage(p,2),false);
let g=quiet(1);g.state='lost';g.tokens=18;settle(p,g);assert.equal(canPlayStage(p,2),false);assert.equal(p.credits,18);
g=quiet(1);g.state='won';g.tokens=31;settle(p,g);assert.equal(canPlayStage(p,2),true);assert.deepEqual(p.clearedStages,[1]);settle(p,g);assert.equal(p.credits,49);assert.equal(p.wins,1);
let restored=normalize(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored,p);assert.ok(canPlayStage(restored,2));
assert.equal(canPlayStage(normalize({version:2,wins:1,credits:512}),2),true);assert.equal(normalize({version:2,wins:1,credits:512}).credits,512);
assert.equal(normalize({version:3,credits:512}).credits,512);assert.equal(canPlayStage(p,3),false);
// Each stage warns six seconds before a single boss arrives; no early executive waves.
for(const stage of STAGES){
 g=quiet(stage.id);g.t=stage.survival-6;g.step(.01);assert.equal(g.bossWarning,true);assert.equal(g.enemies.length,0);
 g.t=stage.survival;g.step(.01);assert.equal(g.phase,'boss');assert.equal(g.enemies.filter(e=>e.boss).length,1);assert.equal(g.boss.max,stage.bossHP);
 assert.equal(g.dispatchWarning,undefined);g.step(.01);assert.equal(g.enemies.filter(e=>e.boss).length,1);
}
// Lobby is a different collision layout, and all dispatch corridors remain open.
assert.notDeepEqual(furnitureFor(1),furnitureFor(2));
for(const stage of STAGES)for(const y of [400,900,1400])for(let x=200;x<=1680;x+=20){const body={x,y};resolveFurniture(body,23,furnitureFor(stage.id));assert.deepEqual(body,{x,y});}
const lobbyDesk=furnitureFor(2)[0];let body={x:lobbyDesk.x+40,y:lobbyDesk.y+40};resolveFurniture(body,18,furnitureFor(2));assert.ok(body.x<lobbyDesk.x||body.y<lobbyDesk.y||body.x>lobbyDesk.x+lobbyDesk.w||body.y>lobbyDesk.y+lobbyDesk.h);
// Damage breaks the current chain while preserving the record.
g=quiet(1);g.combo=15;g.bestCombo=20;g.comboTime=2.5;g.spawn('worker',g.player.x,g.player.y);g.step(.01);assert.equal(g.combo,0);assert.equal(g.bestCombo,20);assert.equal(g.player.hp,87);
assert.equal(resultTitle({state:'lost',escaped:0}),'Herman was overwhelmed.');assert.equal(resultTitle({state:'lost',escaped:1}),'Herman was overwhelmed.');
// Both stage victories require the mission objective; stage two doesn't imply a nonexistent stage three.
for(const stage of STAGES){g=quiet(stage.id);g.t=180;g.step(.01);assert.equal(g.state,'playing');g.hit(g.boss,1e9);g.step(.01);assert.equal(g.state,'won');assert.ok(g.events.some(e=>e.type==='end'&&e.text===stage.clear));}
g=quiet(2);g.state='won';settle(p,g);assert.deepEqual(p.clearedStages,[1,2]);assert.equal(canPlayStage(p,3),false);
console.log('PASS: stage locking, victory unlock, save migration, boss warnings, single boss spawn, lobby collision, clear routes, damage streak reset and truthful endings.');

for(const drop of quiet(2).drops){let q={x:drop.x,y:drop.y};resolveFurniture(q,18,furnitureFor(2));assert.deepEqual(q,{x:drop.x,y:drop.y});}
