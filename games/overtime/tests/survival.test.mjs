// Build 19: survival mode ("Survival of the Shittest"). The run never ends, enemies step up every tier, a boss
// joins at every tier change, briefcase executives walk in between, weapons and perks are limited to a few
// slots, evolutions come from briefcases, and the longest run is saved as a personal best.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Game,WEAPONS,PASSIVES,EVOLUTIONS,SURVIVAL,survivalPromotionCost,promotionCost} from '../dist/engine.mjs';
import {STAGES,MODES,SURVIVAL_ID,SURVIVAL_STAGE,stageFor,canPlayStage} from '../dist/stages.mjs';
import {fresh,normalize,settle} from '../dist/progress.mjs';

const S=SURVIVAL,T=S.tierSeconds;
const rng=s0=>{let seed=s0>>>0;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};
// A survival run with the swarm, rushes and auto-attacks switched off, so one rule can be checked at a time.
const quiet=()=>{const g=new Game(()=>.5,{},0,'plunger',SURVIVAL_ID);g.spawnCd=1e9;g.raidAt=1e9;g.nextExecAt=1e9;g.cd.plunger=1e9;g.player.max=1e9;g.player.hp=1e9;return g;};
const bosses=g=>g.enemies.filter(e=>e.boss);

// 1. The mode: listed on the menu, open from the start, endless, and the two stages are untouched.
assert.equal(STAGES.length,2,'the two stages are unchanged');
assert.deepEqual(MODES.map(m=>m.id),[1,2,SURVIVAL_ID]);
assert.equal(stageFor(SURVIVAL_ID),SURVIVAL_STAGE);assert.equal(SURVIVAL_STAGE.name,'Survival of the Shittest');
assert.ok(canPlayStage(fresh(),SURVIVAL_ID),'survival is open from the first visit');
assert.equal(new Game(()=>.5,{},0,'plunger',1).endless,false);assert.equal(new Game(()=>.5,{},0,'plunger',SURVIVAL_ID).endless,true);

// 2. Tiers follow the clock, and every tier raises enemy health, speed and damage.
{const g=quiet();const at=t=>{g.t=t;g.stepSurvival();return g.spawn('worker',0,0);};g.nextBossAt=1e9;
 const a=at(10),b=at(T+10),c=at(2*T+10);
 assert.equal(g.tier,2);
 assert.ok(b.max>a.max*1.5&&c.max>b.max*1.5,'health climbs');assert.ok(b.speed>a.speed&&c.speed>b.speed,'speed climbs');assert.ok(b.damage>a.damage&&c.damage>b.damage,'damage climbs');
 const far=at(20*T);assert.ok(far.speed<=92*S.speedCap+1e-9,'speed is capped so nothing outruns Herman');
 g.t=S.healthFrom;assert.equal(g.healthScale(),1,'no extra health growth during the opening');g.t=S.healthFrom+T;assert.ok(Math.abs(g.healthScale()-S.tierHealth)<1e-9);
 g.t=30;g.tier=0;assert.equal(g.spawnGap(),S.spawnStart-30*.0022);g.t=2;assert.equal(g.spawnGap(),S.spawnStart*2-2*.0022*2,'half pace for the first few seconds');
 g.t=5000;g.tier=20;assert.equal(g.spawnGap(),S.spawnMin);}

// 3. Bosses recur. Beating one never ends the run; it drops a briefcase, cash and first aid.
{const g=quiet();g.t=T-.01;g.step(.05);assert.equal(bosses(g).length,1,'boss 1 arrives at the first tier change');assert.equal(g.phase,'survival');assert.equal(g.tier,1);
 const first=bosses(g)[0],hp1=first.max;assert.equal(g.boss,first);
 g.hit(first,1e12);g.step(.05);
 assert.equal(g.state,'playing','the run goes on');assert.equal(g.bossesBeaten,1);assert.equal(g.boss,null);
 assert.equal(g.drops.filter(d=>d.chest).length+g.pendingBriefcases,1,'one briefcase');assert.equal(g.drops.filter(d=>d.heal).length,S.bossKits);
 g.drops=[];g.pendingBriefcases=0;g.t=2*T-.01;g.step(.05);const second=bosses(g)[0];assert.ok(second&&second.max>hp1*2,'boss 2 is much tougher');
 // Not beating a boss before the next one arrives means two bosses, each with its own slam warning.
 g.t=3*T-.01;g.step(.05);assert.equal(bosses(g).length,2);
 for(const b of bosses(g)){b.slam={x:g.player.x+900,y:g.player.y,t:0,fuse:9,r:50};}g.step(.05);assert.equal(g.bossAttacks.length,2,'both slams are drawn');}

// 4. Briefcase executives walk in at set times each tier and drop a briefcase.
{const g=quiet();g.nextExecAt=S.execTimes[0];const seen=[];
 for(g.t=0;g.t<T+S.execTimes[0]+1;){g.step(.05);for(const e of g.enemies.filter(e=>e.type==='exec'&&!e.boss&&!e.seen)){e.seen=true;seen.push(Math.round(g.t));}g.events.length=0;}
 assert.deepEqual(seen,[...S.execTimes,T+S.execTimes[0]]);
 const exec=g.enemies.find(e=>e.type==='exec'&&!e.boss);assert.ok(exec.speed<180,'slower than Herman');g.hit(exec,1e12);assert.equal(g.drops.filter(d=>d.chest).length,1);}

// 5. Slots: a run holds at most 4 weapons (Stink Bomb counts) and 3 perks.
{const g=quiet();g.random=rng(5);Object.assign(g.weapons,{plunger:2,tp:1,gas:1,flush:0,bomb:1});Object.assign(g.passives,{coffee:1,magnet:1,chili:1,speed:0});
 for(let i=0;i<200;i++)for(const c of g.options('promotion')){assert.notEqual(c.key,'flush','no fifth weapon');assert.notEqual(c.key,'speed','no fourth perk');}
 g.weapons.gas=0;g.passives.chili=0;let keys=new Set();for(let i=0;i<300;i++)for(const c of g.options('promotion'))keys.add(c.key);
 assert.ok(keys.has('gas')&&keys.has('flush')&&keys.has('speed')&&keys.has('chili'),'open slots can take anything');}

// 6. Evolutions only come from briefcases. A promotion never offers one; a briefcase evolves a ready weapon.
{const g=quiet();g.random=rng(9);g.t=200;Object.assign(g.weapons,{plunger:5,tp:3,gas:0,flush:0,bomb:5});Object.assign(g.passives,{coffee:1,magnet:0,chili:1,speed:0});
 assert.deepEqual(g.readyToEvolve().sort(),['bomb','plunger']);
 for(let i=0;i<200;i++)assert.ok(g.options('promotion').every(c=>c.level<=5&&c.key!=='plunger'&&c.key!=='bomb'),'promotion never offers an evolution or a maxed weapon');
 g.pendingBriefcases=1;g.levelCheck();assert.equal(g.state,'upgrade');assert.equal(g.upgradeKind,'briefcase');
 assert.deepEqual(g.choices.map(c=>[c.key,c.level]).sort(),[['bomb',6],['plunger',6]]);
 assert.ok(g.choose('plunger'));assert.equal(g.weapons.plunger,6);assert.ok(g.events.some(e=>e.type==='evolve'));
 // No weapon ready: the briefcase is a free upgrade instead.
 const h=quiet();h.random=rng(3);h.pendingBriefcases=1;h.levelCheck();assert.equal(h.upgradeKind,'briefcase');assert.ok(h.choices.length>=1&&h.choices.every(c=>c.level<6));}

// 7. Everything maxed: a promotion offers a Petty Cash bonus or a heal, never an empty screen.
{const g=quiet();Object.assign(g.weapons,{plunger:6,tp:6,gas:6,flush:0,bomb:6});Object.assign(g.passives,{coffee:3,magnet:3,chili:3,speed:0});
 g.xp=g.need;g.levelCheck();assert.deepEqual(g.choices.map(c=>c.key),['cash','heal']);
 const before=g.tokens;assert.ok(g.choose('cash'));assert.equal(g.tokens,before+S.cashBonus);
 // Level 5 weapons waiting for a briefcase count as maxed for promotions too.
 const h=quiet();Object.assign(h.weapons,{plunger:5,tp:5,gas:5,flush:0,bomb:5});Object.assign(h.passives,{coffee:3,magnet:3,chili:3,speed:0});assert.deepEqual(h.options('promotion').map(c=>c.key),['cash','heal']);}

// 8. Promotion cost: survival has its own, steeper curve; stage mode keeps its own.
assert.equal(new Game(()=>.5,{},0,'plunger',SURVIVAL_ID).need,S.firstCost);
for(let l=2;l<40;l++){assert.ok(survivalPromotionCost(l)>promotionCost(l),'steeper than stage mode at level '+l);assert.ok(survivalPromotionCost(l+1)>survivalPromotionCost(l));}
{const g=quiet();g.xp=g.need;g.levelCheck();assert.equal(g.need,survivalPromotionCost(2));}

// 9. First aid: kits heal more in later tiers, and later rushes drop two.
{const g=quiet();assert.equal(g.kitHeal(),S.kitHeal);g.tier=3;assert.equal(g.kitHeal(),S.kitHeal+3*S.kitHealPerTier);g.tier=99;assert.equal(g.kitHeal(),S.kitHealMax);
 assert.equal(new Game(()=>.5,{},0,'plunger',1).kitHeal(),16,'stage mode kits are unchanged');}

// 10. What ended the run is remembered.
{const g=quiet();g.player.max=100;g.player.hp=5;const e=g.spawn('guard',g.player.x+5,g.player.y);g.step(.05);assert.equal(g.state,'lost');assert.deepEqual(g.killedBy,{type:'guard',boss:false,slam:false});
 const h=quiet();h.t=T-.01;h.step(.05);const boss=bosses(h)[0];boss.x=h.player.x+600;boss.slam={x:h.player.x,y:h.player.y,t:0,fuse:.01,r:100};h.player.max=100;h.player.hp=5;h.step(.05);assert.equal(h.state,'lost');assert.deepEqual(h.killedBy,{type:'exec',boss:true,slam:true});}

// 11. Personal best is saved, only beaten by a longer run, and old saves upgrade safely.
{const p=fresh();assert.equal(p.version,4);assert.equal(p.bestSurvival,0);
 let g=quiet();g.state='lost';g.t=254.37;g.tokens=40;assert.equal(settle(p,g),40);assert.equal(p.bestSurvival,254.4);assert.equal(g.newBest,true);assert.equal(g.previousBest,0);assert.equal(p.runs,1);assert.equal(p.wins,0);assert.deepEqual(p.clearedStages,[]);
 g=quiet();g.state='lost';g.t=100;settle(p,g);assert.equal(p.bestSurvival,254.4,'a shorter run does not overwrite it');assert.equal(g.newBest,false);assert.equal(g.previousBest,254.4);
 g=new Game(()=>.5,{},0,'plunger',1);g.state='lost';g.t=999;settle(p,g);assert.equal(p.bestSurvival,254.4,'stage runs never count');
 assert.deepEqual(normalize(JSON.parse(JSON.stringify(p))),p,'saves round-trip');
 const old=normalize({version:3,credits:512,wins:1,kills:300,clearedStages:[1],perks:{health:2}});assert.equal(old.version,4);assert.equal(old.bestSurvival,0);assert.equal(old.credits,512,'credits are not rescaled');assert.equal(old.perks.health,2);assert.deepEqual(old.clearedStages,[1]);
 assert.equal(normalize({version:4,bestSurvival:-5}).bestSurvival,0);assert.equal(normalize({version:4,bestSurvival:'x'}).bestSurvival,0);}

// 12. Deterministic: the same seed and the same inputs give the same run, to the last number.
const play=(seed,seconds)=>{const g=new Game(rng(seed),{},0,'plunger',SURVIVAL_ID);g.player.max=1e9;g.player.hp=1e9;let a=0,picks=0;
 while(g.t<seconds){if(g.state==='upgrade'){g.choose(g.choices[picks++%g.choices.length].key);}a+=.013;if(g.cd.bomb<=0&&Math.floor(g.t)%9===0)g.useBomb();g.step(.05,{x:Math.cos(a),y:Math.sin(a*1.7)});g.events.length=0;}
 return JSON.stringify([g.t,g.kills,g.tokens,g.xp,g.level,g.player.x,g.player.y,1e9-g.player.hp,g.weapons,g.passives,g.enemies.length,g.enemies.slice(0,25).map(e=>[e.type,e.x,e.y,e.hp]),g.drops.length,g.bossesBeaten]);};
assert.equal(play(77,240),play(77,240));assert.notEqual(play(77,60),play(78,60));
// The rules file reads the clock or true randomness nowhere: only the injected random function.
const engine=fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname),'../dist/engine.mjs'),'utf8');
assert.equal((engine.match(/Math\.random/g)||[]).length,1,'Math.random appears only as the default argument');
assert.ok(!/Date\.now|new Date|performance\.now/.test(engine));

// 13. Pace and pressure, with seeded bots (a rough guide, pinned so tuning changes are deliberate).
{// Standing still is punished fast.
 const hits=[3,11,29,57].map(seed=>{const g=new Game(rng(seed),{},0,'plunger',SURVIVAL_ID),hp=g.player.hp;while(g.player.hp===hp&&g.t<60){g.step(.05);g.events.length=0;}return g.t;});
 assert.ok(Math.max(...hits)<20,'standing still gets hit within 20 seconds, got '+hits.map(t=>t.toFixed(0)));
 // A coin-chasing player sees about 3 to 5 promotions a minute over the first 3 minutes.
 const promos=[3,11,29].map(seed=>{const g=new Game(rng(seed),{},0,'plunger',SURVIVAL_ID);g.player.max=1e9;g.player.hp=1e9;let a=0,n=0;
  while(g.t<180){if(g.state==='upgrade'){if(g.upgradeKind!=='briefcase')n++;g.choose(g.choices[0].key);}a+=.012;let inp={x:Math.cos(a),y:Math.sin(a)};const P=g.player;let best=null,bd=1e9;
   for(const d of g.drops){if(!d.value)continue;const dd=Math.hypot(d.x-P.x,d.y-P.y);if(dd<bd){bd=dd;best=d;}}if(best&&bd>5&&bd<260)inp={x:(best.x-P.x)/bd,y:(best.y-P.y)/bd};g.step(.05,inp);g.events.length=0;}
  return n;});
 const avg=promos.reduce((a,b)=>a+b,0)/promos.length;assert.ok(avg>=8&&avg<=15,'about 3 to 5 promotions a minute, got '+promos);}

console.log('PASS: survival is endless, tiers and bosses recur, executives drop briefcases, slots and briefcase evolutions hold, the maxed-out bonus works, personal best saves and migrates, and runs are deterministic.');
