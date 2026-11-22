// Build 32: a fully built Herman can't stand still forever. Gas clouds refresh instead of stacking, Middle Managers
// push through the weapons' knockback, Wrap Sheet rings hit less often, and Extra Hot Sauce tapers off.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Game,SURVIVAL} from '../dist/engine.mjs';
import {SURVIVAL_ID} from '../dist/stages.mjs';
import {tipsFor} from '../dist/tips.mjs';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const app=fs.readFileSync(path.join(root,'dist/app.mjs'),'utf8');
const rng=s0=>{let s=Math.imul(s0,2654435761)>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};
const S=SURVIVAL;
const quiet=(stage=SURVIVAL_ID)=>{const g=new Game(rng(1),{},0,'plunger',stage);g.spawnCd=1e9;g.raidAt=1e9;g.nextExecAt=1e9;g.nextBossAt=1e9;g.player.hp=g.player.max=1e9;for(const k in g.weapons)g.weapons[k]=0;g.nextManagerAt=1e9;return g;};

// 1. Gas: standing still keeps one cloud; walking leaves a trail.
{const g=quiet();g.weapons.gas=6;for(let i=0;i<200;i++)g.step(.05,{x:0,y:0});assert.equal(g.clouds.length,1,'one cloud under a still Herman ('+g.clouds.length+')');
 const h=quiet();h.weapons.gas=6;for(let i=0;i<200;i++)h.step(.05,{x:i%80<40?1:-1,y:.3});assert.ok(h.clouds.length>=4,'a trail when moving ('+h.clouds.length+')');
 const s=quiet();s.weapons.gas=3;for(let i=0;i<120;i++)s.step(.05,{x:0,y:0});assert.equal(s.clouds.length,1);}

// 2. Extra Hot Sauce: +10%, then 12% less each time; tops out near +83%.
{const g=quiet();g.boosts=0;assert.equal(g.boostTotal(),0);g.boosts=1;assert.ok(Math.abs(g.boostTotal()-.1)<1e-9);g.boosts=2;assert.ok(Math.abs(g.boostTotal()-.188)<1e-9);
 g.boosts=200;assert.ok(g.boostTotal()<.834&&g.boostTotal()>.83,'ceiling '+g.boostTotal().toFixed(3));}

// 3. Middle Managers: Survival only, from 4:00, tough, slower than Herman, the first one announced.
assert.equal(S.managerFrom,240);
{const g=quiet();g.nextManagerAt=undefined;g.t=239;g.stepManagers();assert.equal(g.enemies.length,0,'none before 4:00');
 g.t=240;const m=g.stepManagers();assert.ok(m&&m.manager,'first one at 4:00');assert.equal(m.speed,S.managerSpeed);assert.ok(m.speed<g.movementSpeed(),'Herman can outwalk them');
 const guard=quiet();guard.t=240;const plain=guard.spawn('guard',100,100);assert.ok(Math.abs(m.max/plain.max-S.managerHP)<1e-6,'8x a guard');
 assert.ok(g.events.some(e=>e.type==='manager'));g.events.length=0;g.t=g.nextManagerAt;g.stepManagers();assert.ok(!g.events.some(e=>e.type==='manager'),'banner only once');}
{const g=new Game(rng(2),{},0,'plunger',1);g.t=600;g.stepManagers();assert.equal(g.enemies.filter(e=>e.manager).length,0,'not in the levels');}
// They come faster each tier and more are allowed, with no ceiling.
{const gap=t=>Math.max(S.managerGapMin,S.managerGap-t*S.managerGapTier);assert.deepEqual([1,2,3,5].map(gap),[12,10,8,4]);
 const g=quiet();g.nextManagerAt=undefined;g.t=240;g.tier=1;for(let i=0;i<40;i++){g.nextManagerAt=0;g.stepManagers();}assert.equal(g.enemies.filter(e=>e.manager).length,S.managerCap+S.managerCapTier,'cap 9 in tier 1');
 g.tier=4;for(let i=0;i<40;i++){g.nextManagerAt=0;g.stepManagers();}assert.equal(g.enemies.filter(e=>e.manager).length,S.managerCap+4*S.managerCapTier,'cap grows each tier');}

// 4. Knockback: rings and flushes shove regular enemies but barely move a manager.
{const g=quiet();g.weapons.tp=6;g.t=300;const p=g.player,m=g.spawn('guard',p.x+75,p.y);Object.assign(m,{manager:true,speed:0,hp:1e9,max:1e9});const w=g.spawn('guard',p.x-75,p.y);w.speed=0;w.hp=w.max=1e9;
 const m0=m.x,w0=w.x;for(let i=0;i<40;i++)g.step(.05,{x:0,y:0});assert.ok(Math.abs(m.x-m0)<2,'manager not pushed by the rings');assert.ok(Math.abs(w.x-w0)>5,'a guard is');}
{const g=quiet();g.weapons.flush=6;g.t=300;const p=g.player,m=g.spawn('guard',p.x+90,p.y);Object.assign(m,{manager:true,speed:0,hp:1e9,max:1e9});const w=g.spawn('guard',p.x-90,p.y);w.speed=0;w.hp=w.max=1e9;
 const m0=m.x,w0=w.x;for(let i=0;i<30;i++)g.step(.05,{x:0,y:0});assert.ok(w0-w.x>m.x-m0+20,'flush pushes a guard far more than a manager');}
// Items treat managers like executives.
{const g=quiet();const m=g.spawn('guard',g.player.x+60,g.player.y);m.manager=true;assert.equal(g.isBig(m),true);g.useNow('freeze');assert.equal(m.frozen,1.5);
 g.addPuddle(m.x,m.y);g.random=()=>0;g.step(.05,{x:0,y:0});assert.ok(m.hp>0,'no slip');g.face={x:1,y:0};g.useNow('bidet');g.step(.05,{x:0,y:0});assert.ok(m.hp>0,'no Bidet one-shot');}

// 5. Wrap Sheet rings: every 0.55s per enemy once evolved.
{const g=quiet();g.weapons.tp=6;const e=g.spawn('guard',g.player.x+75,g.player.y);e.speed=0;e.hp=e.max=1e9;e.manager=true;let hits=0,last=e.hp;for(let i=0;i<60;i++){g.step(.05,{x:0,y:0});if(e.hp<last)hits++;last=e.hp;}
 assert.ok(hits>=4&&hits<=8,'about 5 or 6 ring hits in 3 seconds ('+hits+')');}

// 6. The point of it all: a fully built Herman who stands still from 4:00 doesn't last long.
{const lasted=[];for(let seed=1;seed<=4;seed++){const g=new Game(rng(seed),{},0,'plunger',SURVIVAL_ID);const realMax=g.player.max;g.player.max=g.player.hp=1e9;let start=0;
  const order=['plunger','tp','gas','coffee','magnet','chili','flush','speed','bomb'],rank=k=>{const i=order.indexOf(k);return i<0?9:i;};
  for(let i=0;i<20000&&g.state!=='lost';i++){if(g.state==='upgrade'){g.choose((g.choices.find(c=>c.level===6)||g.choices.slice().sort((x,y)=>rank(x.key)-rank(y.key))[0]).key);continue;}
   if(g.state==='card'){g.buyItem(g.cardChoices[0]);continue;}if(g.state==='intro'){g.endIntro();continue;}
   if(!start&&g.t>=420){start=g.t;g.player.max=g.player.hp=realMax;}const a=g.t*.7;g.step(.05,start?{x:0,y:0}:{x:Math.cos(a),y:Math.sin(a)});g.events.length=0;if(start&&g.t>start+90)break;}
  lasted.push(g.state==='lost'?g.t-start:90);}
 assert.ok(lasted.every(t=>t<45),'standing still from 7:00 ends fast ('+lasted.map(t=>t.toFixed(0)).join(', ')+'s)');}

// 7. Players are told.
assert.ok(tipsFor({endless:true}).some(t=>t.id==='managers'));
assert.ok(app.includes("else if(event.type==='manager')banner('MIDDLE MANAGER',\"THEY DON'T BUDGE · KEEP MOVING\",'boss');"));
assert.ok(app.includes("sz=e.type==='exec'?(e.boss?125:88):e.manager?112:e.type==='guard'?82:65;"));
assert.ok(fs.existsSync(path.join(root,'dist/assets/enemies/middle-manager.webp'))&&fs.existsSync(path.join(root,'art-sources/enemies/middle-manager.png')),'Johnny\'s Middle Manager art');
assert.ok(app.includes("managerArt.src='assets/enemies/middle-manager.webp'")&&app.includes('if(e.manager&&managerArt.complete&&managerArt.naturalWidth)ctx.drawImage(managerArt,'));
assert.ok(fs.readFileSync(path.join(root,'tools/build-single-file.mjs'),'utf8').includes("enemies: { '.webp': 'image/webp' }"),'inlined in the built page');
console.log('PASS: gas clouds no longer stack, Middle Managers break up camping, Wrap Sheet and Extra Hot Sauce are reined in.');
