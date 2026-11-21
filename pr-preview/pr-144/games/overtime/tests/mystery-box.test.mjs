// Build 31: mystery boxes, Herman's pocket and the Company Credit Card. Plus the quieter Plungerang squeak and
// executive groan.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Game} from '../dist/engine.mjs';
import {SURVIVAL_ID} from '../dist/stages.mjs';
import {ITEMS,MYSTERY,BOX_SPOTS,rollItem,NOW_ITEMS} from '../dist/mystery.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const app=read('dist/app.mjs'),html=read('dist/index.html'),css=read('dist/style.css');
const rng=s0=>{let s=Math.imul(s0,2654435761)>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};
const quiet=(seed=1,stage=SURVIVAL_ID)=>{const g=new Game(rng(seed),{},0,'plunger',stage);g.spawnCd=1e9;g.raidAt=1e9;g.nextExecAt=1e9;g.nextBossAt=1e9;g.player.hp=g.player.max=100;
 for(const k in g.weapons)g.weapons[k]=0;g.drops=[];return g;};

// 1. The odds Johnny signed off on: the stronger the item, the rarer.
assert.deepEqual(Object.fromEntries(Object.entries(ITEMS).map(([k,v])=>[k,v.weight])),{sweep:20,coffee:18,wet:18,freeze:12,bomb:11,horn:10,bidet:6,health:4,card:1});
assert.equal(Object.values(ITEMS).reduce((n,v)=>n+v.weight,0),100);
{const r=rng(9),c={};for(let i=0;i<200000;i++){const k=rollItem(r);c[k]=(c[k]||0)+1;}
 for(const [k,v] of Object.entries(ITEMS))assert.ok(Math.abs(c[k]/2000-v.weight)<.5,k+' comes up about '+v.weight+'% ('+(c[k]/2000).toFixed(1)+')');}
assert.deepEqual(NOW_ITEMS,['sweep','coffee','wet','freeze','bidet']);
assert.deepEqual(Object.keys(ITEMS).filter(k=>ITEMS[k].use==='pocket'),['bomb','horn','health','card']);

// 2. Four boxes, in Survival and in both levels. A broken box comes back 90 seconds later.
for(const stage of [1,2,SURVIVAL_ID]){const g=quiet(1,stage);assert.equal(g.supplies.length,4);assert.ok(g.supplies.every(s=>s.reward==='mystery'));}
assert.equal(BOX_SPOTS.length,4);
{const g=quiet();const s=g.supplies[0];g.hit(s,999);assert.equal(s.hp<=0,true);assert.equal(s.refillAt,90);
 g.t=89.9;g.step(.05,{x:0,y:0});assert.ok(s.hp<=0,'still broken at 1:29.95');g.step(.05,{x:0,y:0});g.step(.05,{x:0,y:0});assert.equal(s.hp,s.max,'back at 1:30');assert.equal(s.refillAt,0);}

// 3. What a broken box leaves: Wet Floor right where the box was; everything else as a pickup with its name.
{const seen=new Set();for(let seed=1;seed<400&&seen.size<9;seed++){const g=quiet(seed);const s=g.supplies[1];g.hit(s,999);const ev=g.events.find(e=>e.type==='supply');
  const k=Object.keys(ITEMS).find(k=>ev.text==='MYSTERY BOX · '+ITEMS[k].name.toUpperCase());assert.ok(k,ev.text);seen.add(k);
  if(k==='wet'){assert.equal(g.puddles.length,1);assert.deepEqual([g.puddles[0].x,g.puddles[0].y],[s.x,s.y]);assert.equal(g.drops.length,0);}
  else{assert.equal(g.drops.length,1);const d=g.drops[0];assert.ok(k==='sweep'?d.magnet:k==='coffee'?d.coffee:d.item===k,k);}}
 assert.equal(seen.size,9,'every item can come out of a box');}

// 4. Picking items up: now-items happen at once; pocket items fill two slots; a full pocket swaps in a now-item.
{const g=quiet();g.drops.push({x:g.player.x,y:g.player.y,item:'horn',value:0});g.step(.05,{x:0,y:0});assert.deepEqual(g.pocket,['horn']);
 assert.ok(g.events.some(e=>e.text==='AIR HORN · IN YOUR POCKET'));
 g.gainItem('health');assert.deepEqual(g.pocket,['horn','health']);
 const swap=g.gainItem('card');assert.ok(NOW_ITEMS.includes(swap));assert.deepEqual(g.pocket,['horn','health'],'pocket untouched');
 assert.ok(g.events.some(e=>e.text==='POCKET FULL · '+ITEMS[swap].name.toUpperCase()+' INSTEAD'));
 const d={x:g.player.x+160,y:g.player.y,item:"bomb",value:0},m=g.magnetTime;g.magnetTime=5;g.drops=[d];g.step(.05,{x:0,y:0});assert.equal(d.x,g.player.x+160,"Cash Sweep does not drag items from across the floor");g.magnetTime=m;}
{const g=quiet();g.useNow('sweep');assert.equal(g.magnetTime,5);g.useNow('coffee');assert.equal(g.caffeine,8);g.useNow('bidet');assert.equal(g.bidet,5);
 g.useNow('wet');assert.deepEqual([g.puddles[0].x,g.puddles[0].y],[g.player.x,g.player.y],'a Wet Floor from the pocket swap lands under Herman');}

// 5. Out of Order: every enemy freezes, 3 seconds (executives and bosses 1.5). Frozen enemies don't move or hurt.
{const g=quiet();const w=g.spawn('worker',g.player.x+30,g.player.y),x=g.spawn('exec',g.player.x+200,g.player.y,{hp:500,speed:60});g.useNow('freeze');
 assert.equal(w.frozen,3);assert.equal(x.frozen,1.5);const pos=[w.x,w.y],hp=g.player.hp;
 for(let i=0;i<20;i++)g.step(.05,{x:0,y:0});assert.deepEqual([w.x,w.y],pos,'frozen worker stays put');assert.equal(g.player.hp,hp,'and does not hurt');
 for(let i=0;i<50;i++)g.step(.05,{x:0,y:0});assert.equal(w.frozen,0);}

// 6. Wet Floor: 10 seconds; everyone in it slows; about 1 in 6 regular enemies slip and go down; executives never.
{let walked=0,slipped=0,execSlips=0;
 for(let seed=1;seed<=40;seed++){const g=quiet(seed);g.player.hp=g.player.max=1e9;for(let i=0;i<30;i++)g.spawn('worker',1150,700+i*13);const x=g.spawn('exec',1150,1100,{hp:1e6,speed:60});
  g.addPuddle(1030,900);g.puddles[0].life=99;g.addPuddle(1080,1060);g.puddles[1].life=99;
  for(let i=0;i<220;i++)g.step(.05,{x:0,y:0});walked+=g.puddles[0].seen.size;slipped+=g.kills;if(x.hp<=0)execSlips++;}
 assert.ok(walked>900,'enough walked through ('+walked+')');assert.ok(Math.abs(slipped/walked-1/6)<.04,'about 1 in 6 slip ('+(slipped/walked).toFixed(3)+')');assert.equal(execSlips,0);}
{const g=quiet();g.player.hp=g.player.max=1e9;g.addPuddle(g.player.x+200,g.player.y);const w=g.spawn('worker',g.player.x+200,g.player.y);g.random=()=>.99;g.step(.05,{x:0,y:0});assert.equal(w.slowT,MYSTERY.slowFor);
 for(let i=0;i<201;i++)g.step(.05,{x:0,y:0});assert.equal(g.puddles.length,0,'gone after 10 seconds');}
{const g=quiet();const w=g.spawn('worker',g.player.x+200,g.player.y);g.addPuddle(w.x,w.y);g.random=()=>0;g.step(.05,{x:0,y:0});assert.ok(w.hp<=0);assert.equal(g.kills,1,'a slip counts as a KO');
 assert.ok(g.numbers.some(n=>n.text==='SLIP!'));assert.ok(!g.numbers.some(n=>typeof n.text==='number'&&n.text>1000),'no giant damage number');}

// 7. Free Stink Bomb: drops a bomb without touching the recharging one, even with no Stink Bomb weapon.
{const g=quiet();g.cd.bomb=7;g.pocket=['bomb'];assert.equal(g.usePocket(0),true);assert.equal(g.bombs.length,1);assert.equal(g.cd.bomb,7);assert.deepEqual(g.pocket,[]);}

// 8. Air Horn: knocks nearby enemies back and stuns them; executives get a third of the push and no stun.
{const g=quiet();const p=g.player;g.player.hp=g.player.max=1e9;g.player.y=1300;const w=g.spawn('worker',p.x+60,p.y),edge=g.spawn('worker',p.x,p.y-500),x=g.spawn('exec',p.x-60,p.y,{hp:1e6,speed:0}),far=g.spawn('worker',p.x+560,p.y);far.speed=0;
 g.pocket=['horn'];g.usePocket(0);assert.equal(w.frozen,MYSTERY.hornStun);assert.ok(!x.frozen);for(let i=0;i<8;i++)g.step(.05,{x:0,y:0});
 assert.ok(w.x-p.x>350,'worker blown far back ('+(w.x-p.x).toFixed(0)+')');assert.ok(p.y-edge.y>800,'even at the edge of the blast ('+(p.y-edge.y).toFixed(0)+')');
 assert.ok(p.x-x.x>200&&p.x-x.x<320,'exec gets half ('+(p.x-x.x).toFixed(0)+')');assert.equal(far.x,p.x+560,'out of range');assert.ok(g.events.some(e=>e.type==='horn'));assert.equal(MYSTERY.hornR,520);}

// 9. Company Health Plan: full heal any time, but not when already full (it stays in the pocket).
{const g=quiet();g.pocket=['health'];assert.equal(g.usePocket(0),false);assert.deepEqual(g.pocket,['health']);assert.ok(g.events.some(e=>e.text==='ALREADY AT FULL HEALTH'));
 g.player.hp=12;assert.equal(g.usePocket(0),true);assert.equal(g.player.hp,100);assert.deepEqual(g.pocket,[]);}

// 10. Company Credit Card: pauses on every common and uncommon item plus one rare, taking turns; never another card.
{const g=quiet();g.pocket=['card','horn'];g.usePocket(0);assert.equal(g.state,'card');assert.deepEqual(g.pocket,['horn']);
 assert.deepEqual(g.cardChoices,['sweep','coffee','wet','freeze','bomb','horn','bidet']);const t=g.t;g.step(.5,{x:1,y:0});assert.equal(g.t,t,'paused while choosing');
 assert.equal(g.buyItem('card'),false);assert.equal(g.buyItem('health'),false,'not offered this time');
 assert.equal(g.buyItem('bomb'),true);assert.deepEqual(g.pocket,['horn','bomb']);assert.equal(g.state,'countdown');
 g.state='playing';g.pocket=['card'];g.usePocket(0);assert.equal(g.cardChoices.at(-1),'health','the rare takes turns');g.buyItem('coffee');assert.equal(g.caffeine,8);assert.equal(g.state,'countdown');
 g.state='playing';g.pocket=['card'];g.usePocket(0);assert.equal(g.cardChoices.at(-1),'bidet');}
{const g=quiet();g.state='paused';g.pocket=['horn'];assert.equal(g.usePocket(0),false,'not while paused');}

// 11. Executive Bidet: 5 seconds of spray in the way Herman faces; hurts what is in front, not behind.
{const g=quiet();g.face={x:1,y:0};const p=g.player,front=g.spawn('guard',p.x+90,p.y),back=g.spawn('guard',p.x-90,p.y),side=g.spawn('guard',p.x,p.y+120);
 [front,back,side].forEach(e=>e.speed=0);const h=[front.hp,back.hp,side.hp];g.useNow('bidet');for(let i=0;i<20;i++)g.step(.05,{x:0,y:0});
 assert.ok(front.hp<h[0]-50,'front soaked');assert.equal(back.hp,h[1]);assert.equal(side.hp,h[2]);assert.ok(front.x>p.x+90,'pushed back');
 for(let i=0;i<90;i++)g.step(.05,{x:0,y:0});assert.equal(g.bidet,0,'over after 5 seconds');assert.ok(!g.events.some(e=>e.type==='hit-bidet'),'the spray has its own sound, not a hit sound per tick');}

// 12. The screen: icons, pocket buttons above the Stink Bomb, Credit Card menu, keys 1 and 2, sounds.
for(const f of ['wet','freeze','horn','bidet','healthplan','card']){assert.ok(fs.existsSync(path.join(root,'dist/assets/icons/'+f+'.webp')),f);assert.ok(fs.existsSync(path.join(root,'art-sources/mystery/'+f+'.png')));assert.ok(app.includes(`${f}:'assets/icons/${f}.webp'`));}
assert.ok(app.includes("const ITEM_ICON={sweep:'sweep',coffee:'coffee',wet:'wet',freeze:'freeze',bomb:'bomb',horn:'horn',bidet:'bidet',health:'healthplan',card:'card'};"));
assert.ok(html.includes('<div id="pocket" hidden><button class="pk" type="button" hidden></button><button class="pk" type="button" hidden></button></div>'));
assert.ok(html.includes('<section id="cardMenu" class="overlay cardv" hidden>'));
assert.ok(css.includes('#pocket{position:absolute;right:23px;bottom:calc(max(24px,env(safe-area-inset-bottom)) + 94px)'),'stacked above the Stink Bomb');
assert.ok(css.includes('.cm-item.rare{grid-column:1/-1;'),'the rare pick gets a full-width row');
assert.ok(app.includes("if((e.key==='1'||e.key==='2')&&!e.repeat)usePocket(+e.key-1);"));
assert.ok(app.includes("if(event.type==='card')showCard();"));
assert.ok(app.includes("function supply(s){")&&app.includes("text('MYSTERY',x,y-44,9,'#ffe08a');"),'boxes drawn as mystery boxes');
for(const k of ['horn','freeze','wet','bidet'])assert.ok(new RegExp('\\b'+k+'\\(\\)\\{').test(app),'made-in-code sound for '+k);
// The Plungerang squeak and the executive groan, much less often and quieter.
assert.ok(app.includes("'hit-plunger':{vol:.3,gap:.45,jitter:.1}"));
assert.ok(app.includes("'hit-boss':{vol:.45,gap:1.1,jitter:.05}"));
{const g=quiet();const w=g.spawn('guard',1000,900),x=g.spawn('exec',1050,900,{hp:999,speed:0});g.hit(w,1,'plunger');g.hit(x,1,'tp');g.hit(x,1,'plunger');assert.ok(!g.events.some(e=>e.type==='hit-plunger'||e.type==='hit-boss'),'squeak and groan are gone');}

console.log('PASS: mystery boxes roll the agreed odds, refill after 90 seconds, fill a two-slot pocket, and every item works; the squeak and groan are gone.');
