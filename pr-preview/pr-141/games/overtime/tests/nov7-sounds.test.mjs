// Nov 7 sounds (PRs #122 and #124): each weapon's hits, knockouts and new game moments raise the right sound event.
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.mjs';

// A quiet game: no spawns, no rushes, no weapons firing unless a test turns them on.
function quiet(){
  const g=new Game(()=>.5);
  g.spawnCd=999;g.raidAt=999;g.drops=[];g.supplies=[];
  g.weapons={plunger:0,tp:0,gas:0,flush:0,bomb:0};
  for(const k in g.cd)g.cd[k]=999;
  return g;
}
const types=g=>g.events.map(e=>e.type);
const take=g=>g.events.splice(0).map(e=>e.type);

// 1. A blow that doesn't knock out plays that weapon's hit sound.
for(const weapon of ['plunger','tp','gas','flush']){
  const g=quiet();const guard=g.spawn('guard',1000,900);
  g.hit(guard,1,weapon);
  assert.deepEqual(take(g),['hit-'+weapon],weapon+' hit sound');
}
// 2. Executives and bosses get the heavy hit, whatever the weapon.
{const g=quiet();const exec=g.spawn('exec',1000,900);g.hit(exec,1,'tp');assert.deepEqual(take(g),['hit-boss']);}
// 3. The final blow plays a knockout impact instead of the hit sound.
{const g=quiet();const worker=g.spawn('worker',1000,900);g.hit(worker,1e6,'plunger');const t=take(g);assert.ok(t.includes('ko'));assert.ok(!t.includes('hit-plunger'));}
// 4. Stink Bomb blows stay quiet (the blast sound covers them), but its knockouts still play.
{const g=quiet();const guard=g.spawn('guard',1000,900);g.hit(guard,1,'bomb');assert.deepEqual(take(g),[]);g.hit(guard,1e6,'bomb');assert.ok(take(g).includes('ko'));}
// 5. Hits with no weapon named (older callers, tests) stay silent; boss knockouts don't play the regular knockout.
{const g=quiet();const guard=g.spawn('guard',1000,900);g.hit(guard,1);assert.deepEqual(take(g),[]);}
{const g=quiet();g.t=180;g.step(.05);take(g);g.hit(g.boss,1e9,'plunger');assert.ok(!types(g).includes('ko'));}
// 6. Every weapon passes its name to hit() when it actually fires.
for(const [weapon,expected] of [['plunger','hit-plunger'],['tp','hit-tp'],['gas','hit-gas'],['flush','hit-flush']]){
  const g=quiet();g.weapons[weapon]=1;g.cd[weapon]=0;
  const guard=g.spawn('guard',g.player.x+(weapon==='tp'?66:40),g.player.y);guard.hp=1e6;guard.speed=0;
  const seen=new Set();for(let i=0;i<60;i++){g.step(.05);for(const t of take(g))seen.add(t);}
  assert.ok(seen.has(expected),weapon+' should raise '+expected+' (saw '+[...seen]+')');
}
// 7. New moments: plunger thrown, gas cloud dropped.
{const g=quiet();g.weapons.plunger=1;g.cd.plunger=0;g.spawn('guard',g.player.x+200,g.player.y).speed=0;g.step(.05);assert.ok(types(g).includes('throw'));}
{const g=quiet();g.weapons.gas=1;g.cd.gas=0;g.step(.05);assert.ok(types(g).includes('puff'));}
// 8. A runner winding up to charge raises the warning.
{const g=quiet();const r=g.spawn('runner',g.player.x+150,g.player.y);r.chargeCd=0;g.step(.05);assert.ok(r.windup>0);assert.ok(types(g).includes('charge'));}
// 9. The boss slam landing raises the slam sound.
{const g=quiet();g.t=180;g.step(.05);take(g);g.boss.attackCd=0;let seen=false;for(let i=0;i<120&&!seen;i++){g.step(.05);seen=take(g).includes('slam');}assert.ok(seen,'boss slam should raise slam');}
// 10. First aid and coffee pickups raise their own sounds; coffee keeps its CAFFEINE RUSH message.
{const g=quiet();g.player.hp=50;g.drops.push({x:g.player.x,y:g.player.y,heal:true,value:0});g.step(.05);assert.ok(types(g).includes('heal'));assert.equal(g.player.hp,66);}
{const g=quiet();g.drops.push({x:g.player.x,y:g.player.y,coffee:true,value:0});g.step(.05);const e=g.events.find(e=>e.type==='coffee');assert.ok(e);assert.match(e.text,/CAFFEINE RUSH/);assert.equal(g.caffeine,8);assert.ok(!types(g).includes('upgrade'));}
// 11. The Stink Bomb button no longer plays the drop sound itself: the engine raises 'deploy' exactly once per bomb.
{const g=quiet();g.weapons.bomb=1;g.cd.bomb=0;assert.equal(g.useBomb(),true);assert.equal(types(g).filter(t=>t==='deploy').length,1);}
console.log('PASS: per-weapon hit sounds, heavy boss hits, knockout impacts, quiet bomb hits, throw, gas puff, runner charge, boss slam, first aid, coffee, single bomb drop sound.');
