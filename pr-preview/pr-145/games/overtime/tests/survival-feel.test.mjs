// Build 28: survival feel. The 2:00 to 4:30 stretch is eased (slower spawn ramp, rushes further apart, later
// health growth), no rush lands on a boss arrival, kits heal more and wait longer, boxes restock with each boss,
// a briefcase with nothing to evolve steers toward an evolution, every perk evolves something, a maxed build keeps
// growing, and the run shows live leaderboard moments.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Game,WEAPONS,PASSIVES,EVOLUTIONS,SURVIVAL} from '../dist/engine.mjs';
import {SURVIVAL_ID} from '../dist/stages.mjs';
import {rivalsFrom,passRivals} from '../dist/rivals.mjs';
import {tipsFor} from '../dist/tips.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const app=fs.readFileSync(path.join(root,'dist/app.mjs'),'utf8'),html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8'),css=fs.readFileSync(path.join(root,'dist/style.css'),'utf8');
const S=SURVIVAL,T=S.tierSeconds;
const rng=s0=>{let seed=s0>>>0;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};
const quiet=()=>{const g=new Game(()=>.5,{},0,'plunger',SURVIVAL_ID);g.spawnCd=1e9;g.raidAt=1e9;g.nextExecAt=1e9;g.cd.plunger=1e9;g.player.max=1e9;g.player.hp=1e9;return g;};
const gapAt=(g,t)=>{g.t=t;g.tier=Math.floor(t/T);return g.spawnGap();};

// 1. Spawn ramp: unchanged for the first two minutes, then eased so full pace arrives at rampDone, not 2:53.
{const g=quiet();
 for(const t of [10,60,119])assert.ok(Math.abs(gapAt(g,t)-(S.spawnStart-t*.0022))<1e-9,'unchanged at '+t+'s');
 const old=t=>Math.max(S.spawnMin,S.spawnFloor-Math.floor(t/T)*S.tierSpawn,S.spawnStart-t*.0022);
 for(const t of [150,180,210,240])assert.ok(gapAt(g,t)>old(t)*1.25,'slower than before at '+t+'s: '+gapAt(g,t).toFixed(3)+' vs '+old(t).toFixed(3));
 assert.ok(gapAt(g,180)>=.18,'under 6 spawns a second when the first boss arrives');
 let last=1;for(let t=5;t<=900;t+=5){const now=gapAt(g,t);assert.ok(now<=last+1e-9,'the gap never grows, at '+t);last=now;}
 assert.ok(Math.abs(gapAt(g,S.rampDone+1)-(S.spawnFloor-S.tierSpawn))<1e-9,'full pace from rampDone');
 assert.equal(gapAt(g,5000),S.spawnMin);}

// 2. Health: no extra growth until healthFrom (after the first boss), then tierHealth, then the gentler lateHealth.
{const g=quiet();assert.ok(S.healthFrom>T,'extra health waits until after the first boss');
 g.t=T;assert.equal(g.healthScale(),1);
 const at=t=>{g.t=t;return g.healthScale();};
 assert.ok(at(540)<2.3**((540-150)/180)*.7,'the 9:00 wall is lower than before');
 assert.ok(S.lateHealth<S.tierHealth&&S.lateHealth>1.5,'late growth is gentler but still climbs');
 assert.ok(at(1200)>40,'the run still ends: health keeps multiplying');}

// 3. Rushes: every rushGap until rushLateFrom, every rushGapLate after, and never within rushBossGap of a boss.
{const g=new Game(rng(5),{},0,'plunger',SURVIVAL_ID);g.player.max=1e9;g.player.hp=1e9;const rushes=[],bossAt=[];let seen=0;
 for(let i=0;i<40000&&g.t<660;i++){if(g.state==='upgrade')g.choose(g.choices[0].key);g.step(.05,{x:0,y:0});
  for(const e of g.events){if(e.type==='rush')rushes.push(g.t);if(e.type==='boss-arrive')bossAt.push(g.t);}g.events.length=0;}
 assert.ok(Math.abs(rushes[0]-S.firstRush)<.1);
 const gaps=rushes.slice(1).map((t,i)=>[rushes[i],t-rushes[i]]);
 for(const [from,gap] of gaps)assert.ok(Math.abs(gap-(from>=S.rushLateFrom?S.rushGapLate:S.rushGap))<9.1,'gap of '+gap.toFixed(1)+' after '+from.toFixed(0));
 assert.ok(gaps.filter(([from])=>from>=S.rushLateFrom).every(([,gap])=>gap>=S.rushGapLate-.1),'late rushes are at least rushGapLate apart');
 assert.equal(bossAt.length,3);
 for(const b of bossAt)for(const r of rushes)assert.ok(Math.abs(r-b)>=S.rushBossGap-.1,'rush at '+r.toFixed(1)+' is too close to the boss at '+b.toFixed(1));
 assert.ok(rushes.filter(t=>t>=150&&t<210).length<=2,'at most 2 rushes in the 2:30 to 3:30 minute (was 3)');
}
// The guard itself: a rush due right on a boss arrival moves to rushBossGap after it.
{const g=quiet();g.t=T-3;g.raidAt=T-3;assert.equal(g.rushHeldForBoss(),true);assert.equal(g.raidAt,T+S.rushBossGap);
 g.t=T+4;g.nextBossAt=2*T;g.raidAt=T+4;assert.equal(g.rushHeldForBoss(),true);assert.equal(g.raidAt,T+S.rushBossGap);
 g.t=T+40;g.raidAt=T+40;assert.equal(g.rushHeldForBoss(),false);
 const stage=new Game(()=>.5,{},0,'plunger',1);stage.t=176;assert.equal(stage.rushHeldForBoss(),false,'the two levels are unchanged');}
// The rush warning says what surviving it is worth.
assert.ok(fs.readFileSync(path.join(root,'dist/engine.mjs'),'utf8').includes("event('rush','CORPORATE RUSH · FIND THE GAP · SURVIVE FOR A FIRST AID KIT')"));

// 4. First aid kits: heal more, wait longer, in survival only.
{const g=quiet();assert.equal(g.kitHeal(),S.kitHeal);assert.ok(S.kitHeal>=25&&S.kitLife>=45);g.tier=20;assert.equal(g.kitHeal(),S.kitHealMax);assert.equal(g.kitLife(),S.kitLife);
 const stage=new Game(()=>.5,{},0,'plunger',1);assert.equal(stage.kitHeal(),16);assert.equal(stage.kitLife(),20);
 const run=new Game(rng(2),{},0,'plunger',SURVIVAL_ID);run.player.max=1e9;run.player.hp=1e9;let kit=null;
 for(let i=0;i<3000&&run.t<45&&!kit;i++){if(run.state==='upgrade')run.choose(run.choices[0].key);run.step(.05,{x:0,y:0});kit=run.drops.find(d=>d.heal);}
 assert.ok(kit&&Math.abs(kit.life-S.kitLife)<.1,'a rush kit starts with the full wait');}

// 5. Supply boxes restock when a boss arrives.
{const g=quiet();for(const s of g.supplies)s.hp=0;g.t=T;g.stepSurvival();
 assert.ok(g.supplies.length>=4&&g.supplies.every(s=>s.hp===s.max),'every box is back');
 const e=g.events.find(e=>e.type==='boss-arrive');assert.ok(e&&/SUPPLY BOXES RESTOCKED/.test(e.text));
 assert.ok(!g.events.some(e=>e.type==='alert'&&/IS HERE/.test(e.text)),'the boss arrival has its own event');}

// 6. Every perk evolves something, and each weapon names a real perk.
{const partners=Object.values(EVOLUTIONS).map(e=>e.requires);
 for(const k of Object.keys(PASSIVES))assert.ok(partners.includes(k),PASSIVES[k].name+' evolves a weapon');
 assert.equal(EVOLUTIONS.flush.requires,'speed');assert.equal(EVOLUTIONS.plunger.requires,'coffee');
 for(const k of Object.keys(PASSIVES)){const names=Object.keys(WEAPONS).filter(w=>EVOLUTIONS[w].requires===k);assert.ok(/Evolves /.test(PASSIVES[k].desc),k+' says what it evolves');
  for(const w of Object.keys(WEAPONS))if(PASSIVES[k].desc.includes(WEAPONS[w].name))assert.ok(names.includes(w),PASSIVES[k].name+' wrongly claims '+WEAPONS[w].name);}
 assert.ok(!/XP/.test(JSON.stringify(PASSIVES))&&!/XP/.test(app.slice(app.indexOf('const PASSIVE_CARD'),app.indexOf('const UPGRADE_TAP_GUARD_MS'))),'no "XP" wording');}

// 7. Briefcase with nothing ready: the missing partner perk first, then the weapon closest to level 5.
// (Build 32: only once gold has unlocked; before that a briefcase is an ordinary free pick.)
{const g=quiet();g.t=SURVIVAL.goldAt[0];Object.assign(g.weapons,{plunger:4,tp:2,gas:0,flush:0,bomb:1});Object.assign(g.passives,{coffee:0,magnet:1,chili:0,speed:0});
 assert.deepEqual(g.options('briefcase').map(c=>[c.key,c.level]),[['coffee',1],['plunger',5],['tp',3]]);
 assert.deepEqual(g.options('briefcase'),g.options('briefcase'),'no luck involved');
 // Perk slots full: a weapon whose partner cannot be taken is not a route, but the briefcase is never empty.
 Object.assign(g.passives,{coffee:0,magnet:1,chili:1,speed:1});const picks=g.options('briefcase').map(c=>c.key);
 assert.ok(!picks.includes('coffee')&&picks[0]==='tp'&&picks.length>=1&&picks.length<=3);
 // A ready weapon still evolves.
 g.t=S.goldAt[0];Object.assign(g.weapons,{plunger:5});Object.assign(g.passives,{coffee:1,magnet:1,chili:1,speed:0});assert.deepEqual(g.options('briefcase').map(c=>[c.key,c.level]),[['plunger',6]]);
 // Every choice is a legal upgrade.
 for(let seed=1;seed<=40;seed++){const h=new Game(rng(seed),{},0,'plunger',SURVIVAL_ID);h.player.max=1e9;h.player.hp=1e9;let n=0;
  while(h.t<200&&n<400){n++;if(h.state==='upgrade'){for(const c of h.choices){if(c.key in WEAPONS)assert.ok(c.level<=6&&c.level===h.weapons[c.key]+1);else if(c.key in PASSIVES)assert.ok(c.level<=3&&c.level===h.passives[c.key]+1);}h.choose(h.choices[h.choices.length-1].key);assert.ok(h.ownedCount(h.weapons)<=S.weaponSlots&&h.ownedCount(h.passives)<=S.perkSlots,'slots hold');}h.pendingBriefcases=h.t>20&&h.state==='playing'&&n%37===0?1:h.pendingBriefcases;h.step(.5,{x:0,y:0});}}}

// 8. Maxed build: Extra Hot Sauce is offered, stacks without limit, and adds damage.
{const g=quiet();Object.assign(g.weapons,{plunger:6,tp:6,gas:6,flush:0,bomb:6});Object.assign(g.passives,{coffee:3,magnet:3,chili:3,speed:0});
 const dmg=()=>{const e=g.spawn('guard',0,0);e.max=e.hp=1e6;g.hit(e,100);return 1e6-e.hp;};const base=dmg();
 for(let i=1;i<=3;i++){g.state='playing';g.nextUpgradeAt=0;g.xp=g.need;g.levelCheck();assert.deepEqual(g.choices.map(c=>[c.key,c.level]),[['boost',i],['cash',1],['heal',1]]);assert.ok(g.choose('boost'));assert.equal(g.boosts,i);}
 assert.ok(Math.abs(dmg()-base-100*S.boost*(1+S.boostTaper+S.boostTaper**2))<1e-6,'three stacks add 10% + 8.8% + 7.7% (Build 32 taper)');
 assert.ok(app.includes("name:'Extra Hot Sauce'")&&app.includes("c.key==='boost'?'chili':c.key"),'the cabinet shows it');}

// 9. Live leaderboard moments.
{const rows=[{place:1,username:'Top',best_seconds:600,is_me:false},{place:2,username:'Me',best_seconds:400,is_me:true},{place:3,username:'Mid',best_seconds:'300.5',is_me:false},{place:4,username:'Low',best_seconds:120,is_me:false},{place:5,username:null,best_seconds:50},null];
 const r=rivalsFrom(rows);assert.deepEqual(r.map(x=>x.name),['Low','Mid','Top'],'own row and bad rows are skipped, shortest first');assert.equal(r[1].seconds,300.5);
 assert.deepEqual(rivalsFrom(rows,200).map(x=>x.name),['Mid','Top'],'times already behind the run are dropped');assert.deepEqual(rivalsFrom(null),[]);
 let p=passRivals(r,100);assert.equal(p.passed,null);assert.equal(p.rest,r);
 p=passRivals(r,121);assert.equal(p.passed.name,'Low');assert.deepEqual(p.rest.map(x=>x.name),['Mid','Top']);
 p=passRivals(r,700);assert.equal(p.passed.name,'Top','passing several at once reports the best placed');assert.deepEqual(p.rest,[]);
 assert.match(app,/board\.top\(10\)\.then\(rows=>\{if\(g===run\)rivals=rivalsFrom\(rows,run\.t\);\}\)\.catch\(\(\)=>\{\}\)/,'the board is read when a survival run starts, quietly');
 assert.match(app,/banner\('NEW PERSONAL BEST'/);assert.match(app,/banner\('YOU PASSED #'\+r\.passed\.place,r\.passed\.name\+' · '\+format\(r\.passed\.seconds\),'best'\)/);
 assert.match(app,/el\.firstChild\.textContent=b\.title;el\.lastChild\.textContent=b\.sub;/,'usernames go in as text, never as HTML');}

// 10. Boss clarity: countdown in the status row, a banner on arrival, and arrows for bosses, briefcases and kits.
assert.ok(html.includes('<div id="banner" role="status" hidden><b></b><small></small></div>'));
assert.match(app,/bossSoon=bossIn>0&&bossIn<=30/);assert.match(app,/'BOSS IN 0:'\+String\(Math\.ceil\(bossIn\)\)\.padStart\(2,'0'\)/);
assert.match(app,/if\(event\.type==='boss-arrive'\)banner\(g\.stage\.bossName,event\.text,'boss'\)/);
assert.match(app,/edge\(e\.x,e\.y,e\.boss\?'BOSS':'EXEC'/);assert.match(app,/if\(d\.chest\)edge\(d\.x,d\.y,'CASE'/);assert.match(app,/else if\(d\.heal&&p\.hp<=p\.max-8\)edge\(d\.x,d\.y,'KIT'/);
assert.ok(css.includes('#banner[hidden]{display:none}')&&css.includes('#mission.boss-soon{'));
assert.ok(app.includes("'boss-arrive':['siren']"),'the boss arrival is never a fallback beep');

// 11. Rules changed, so leaderboard times are tagged with the new build number, and the tips keep up.
assert.match(app,/const BUILD=32;/);
{const tips=tipsFor({endless:true}).map(t=>t.id);for(const id of ['restock','kit-wait','boost'])assert.ok(tips.includes(id),'tip '+id);
 assert.ok(tipsFor({endless:true}).find(t=>t.id==='kit-wait').text.includes(S.kitLife+' seconds'));assert.ok(!tipsFor({endless:false}).some(t=>t.id==='restock'||t.id==='boost'));}
console.log('PASS: survival eases the 2:00 to 4:30 stretch, keeps rushes off boss arrivals, heals and restocks more, steers briefcases to evolutions, lets a maxed build keep growing, and shows live leaderboard moments.');
