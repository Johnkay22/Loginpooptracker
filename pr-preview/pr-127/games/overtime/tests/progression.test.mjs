import assert from 'node:assert/strict';
import {Game,EVOLUTIONS} from '../dist/engine.mjs';
import {fresh,normalize,buy,settle} from '../dist/progress.mjs';
import {resolveFurniture,DESKS} from '../dist/scene.mjs';
function recover(g){while(g.state==='countdown')g.step(.05);}
function quiet(){let g=new Game(()=>.5);g.spawnCd=999;g.raidAt=999;g.deployed=3;g.cd.plunger=999;g.drops=[];return g;}
let g=quiet();assert.equal(g.weapons.bomb,1);for(let i=0;i<60;i++)g.step(.05);assert.equal(g.bombs.length,0);assert.equal(g.useBomb(),true);assert.equal(g.useBomb(),false);assert.equal(g.bombs.length,1);let cd=g.cd.bomb;g.state='paused';g.step(.05);assert.equal(g.cd.bomb,cd);assert.equal(g.useBomb(),false);g.state='playing';for(let i=0;i<250;i++)g.step(.05);assert.equal(g.useBomb(),true);
for(let k of Object.keys(EVOLUTIONS)){g=quiet();g.t=50;g.weapons[k]=5;assert.ok(!g.options().some(c=>c.key===k));g.passives[EVOLUTIONS[k].requires]=1;g.openUpgrade();assert.equal(g.choices[0].key,k);assert.equal(g.choices[0].level,6);assert.equal(g.choose(k),true);recover(g);assert.equal(g.weapons[k],6);g.cd[k]=0;if(k==='bomb')g.useBomb();g.step(.05);if(k==='plunger')assert.equal(g.shots.length,6);if(k==='tp')assert.equal(g.orbits.length,12);if(k==='gas')assert.ok(g.clouds[0].slow);if(k==='flush')assert.equal(g.waves.length,2);if(k==='bomb')assert.equal(g.bombs[0].blast,245);}
g=quiet();let e=g.spawn('exec',900,900);g.hit(e,1e6);assert.equal(g.stopped,1);assert.equal(g.drops.filter(d=>d.chest).length,1);g.step(.05);assert.equal(g.state,'upgrade');assert.equal(g.upgradeKind,'briefcase');assert.equal(g.tokens,14);
let p=fresh();assert.equal(buy(p,'damage'),false);p.credits=2000;assert.equal(buy(p,'damage'),true);assert.equal(p.credits,1750);assert.equal(p.perks.damage,1);assert.equal(buy(p,'unknown'),false);p.perks.damage=3;assert.equal(buy(p,'damage'),false);
g=quiet();g.kills=80;g.tokens=12;g.state='lost';g.stopped=1;assert.equal(settle(p,g),12);let bank=p.credits;assert.equal(settle(p,g),0);assert.equal(p.credits,bank);assert.equal(p.runs,1);g=quiet();g.state='won';assert.equal(settle(p,g),0);assert.equal(p.wins,1);assert.deepEqual(normalize(JSON.parse(JSON.stringify(p))),p);assert.equal(normalize({credits:-9,perks:{health:90},start:'gas'}).start,'plunger');
let o=DESKS[0],body={x:o.x+20,y:o.y+20};resolveFurniture(body,18);assert.ok(body.x<o.x||body.y<o.y||body.x>o.x+o.w||body.y>o.y+o.h);
console.log('PASS: manual bomb, paused recharge, all five actual evolutions, briefcase reward, persistent perks, duplicate reward prevention and solid desks.');

// Currency is awarded for pickups, not kills; XP passives never multiply spendable tokens.
g=quiet();let foe=g.spawn('worker',1200,900);g.hit(foe,1e6);assert.equal(g.tokens,0);g.passives.magnet=3;g.player.x=1200;g.step(.05);assert.equal(g.tokens,1);assert.equal(g.xp,1.3);g.step(.05);assert.equal(g.tokens,1);
// Legacy credits migrate once at the same ratio as shop prices.
let migrated=normalize({credits:7,perks:{health:1},runs:2,kills:220});assert.equal(migrated.credits,70);assert.equal(normalize(migrated).credits,70);assert.equal(migrated.perks.health,1);
// Consolidation preserves token value and special pickups.
g=quiet();g.drops.push({x:100,y:100,chest:true,value:0});for(let i=0;i<501;i++)g.drops.push({x:100,y:100,value:1});g.step(.05);assert.equal(g.drops.filter(d=>d.chest).length,1);assert.equal(g.drops.reduce((sum,d)=>sum+d.value,0),501);
console.log('PASS: collected-only Turd Tokens, XP multiplier separation, one-time balance migration, pickup conservation.');

// Collected XP cannot reopen promotions immediately; active play, not paused time, clears the gap.
g=quiet();g.xp=100;g.levelCheck();assert.equal(g.state,'upgrade');assert.ok(g.choices.some(c=>c.key==='speed'));g.choose('speed');recover(g);let bankedXP=g.xp;for(let i=0;i<20;i++)g.step(.05);assert.equal(g.state,'playing');assert.equal(g.xp,bankedXP);g.state='paused';for(let i=0;i<200;i++)g.step(.05);assert.equal(g.t,1.0000000000000002);g.state='playing';g.drops.push({x:g.player.x,y:g.player.y,chest:true,value:0},{x:g.player.x,y:g.player.y,chest:true,value:0});g.step(.05);assert.equal(g.state,'playing');assert.equal(g.pendingBriefcases,2);while(g.t<6.99)g.step(.05);if(g.state==='playing')g.step(.05);assert.equal(g.state,'upgrade');assert.equal(g.upgradeKind,'briefcase');assert.equal(g.pendingBriefcases,1);assert.equal(g.xp,bankedXP);g.choose(g.choices[0].key);recover(g);g.step(.05);assert.equal(g.state,'playing');
// Speed is real movement, capped at rank three; animation measures displacement, including collisions.
for(let rank=0;rank<=3;rank++){g=quiet();g.passives.speed=rank;let x=g.player.x;for(let i=0;i<20;i++)g.step(.05,{x:1,y:0});assert.ok(Math.abs(g.player.x-x-180*(1+rank*.1))<.001);assert.ok(Math.abs(g.walkDistance-(g.player.x-x))<.001);assert.equal(g.moving,true);g.step(.05);assert.equal(g.moving,false);}
g=quiet();g.passives.speed=3;assert.ok(!g.options().some(c=>c.key==='speed'));g.player.x=1735;g.step(.05,{x:1,y:0});assert.equal(g.moving,false);assert.equal(g.walkDistance,0);
console.log('PASS: promotion spacing, paused cooldown, retained XP and queued briefcases, speed ranks and movement-driven animation.');
