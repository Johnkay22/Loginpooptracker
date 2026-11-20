import assert from 'node:assert/strict';
import {Game} from '../dist/engine.mjs';
const quiet=(id=1)=>{const g=new Game(()=>.5,{},0,'plunger',id);g.spawnCd=999;g.cd.plunger=999;g.weapons.plunger=0;return g;};
const run=(g,s)=>{for(let i=0;i<Math.round(s/.05);i++)g.step(.05);};
// No free health at the start, no First Aid boxes, in both stages.
for(const id of [1,2]){const g=quiet(id);assert.equal(g.drops.filter(d=>d.heal).length,0);assert.equal(g.supplies.filter(s=>s.reward==='heal').length,0);assert.equal(g.supplies.length,4);}
// A rush drops one kit 6 s after the crowd arrives, a short run from Herman.
let g=quiet();g.t=45;g.step(.05);run(g,1.5);assert.equal(g.drops.filter(d=>d.heal).length,0);
for(const e of g.enemies)e.hp=0;g.enemies=[];run(g,6);
let kits=g.drops.filter(d=>d.heal);assert.equal(kits.length,1);const k=kits[0];
assert.ok(Math.abs(Math.hypot(k.x-g.player.x,k.y-g.player.y)-220)<5);
// At full health Herman ignores it: not pulled in, not used.
g.player.x=k.x;g.player.y=k.y;g.step(.05);assert.equal(g.drops.filter(d=>d.heal).length,1);assert.equal(g.player.hp,100);
// Hurt by at least 8, he grabs it for 16.
g.player.hp=70;g.step(.05);assert.equal(g.drops.filter(d=>d.heal).length,0);assert.equal(g.player.hp,86);
// Unused kits vanish after 20 s.
g=quiet();g.t=45;g.step(.05);run(g,1.5);g.enemies=[];run(g,6);assert.equal(g.drops.filter(d=>d.heal).length,1);g.raidAt=999;run(g,19.5);assert.equal(g.drops.filter(d=>d.heal).length,1);run(g,1);assert.equal(g.drops.filter(d=>d.heal).length,0);
// The last rush before the boss drops two.
g=quiet();g.t=177;g.raidAt=177;g.step(.05);run(g,1.5);g.enemies=[];g.player.hp=1e6;g.player.max=1e6;run(g,6);
assert.equal(g.drops.filter(d=>d.heal).length,2);
console.log('health tests passed');
