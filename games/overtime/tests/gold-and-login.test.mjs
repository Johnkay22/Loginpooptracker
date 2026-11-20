// Build 30: gold (evolved) weapons come on a clock in Survival, early briefcases are saved for it, and the game
// tells a logged-out player before a Survival run instead of after it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Game,SURVIVAL} from '../dist/engine.mjs';
import {SURVIVAL_ID} from '../dist/stages.mjs';
import {tipsFor} from '../dist/tips.mjs';
import {slidesFor} from '../dist/howto.mjs';
import {stageFor} from '../dist/stages.mjs';
import {createBoard,SESSION_KEY} from '../dist/leaderboard.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const app=read('dist/app.mjs'),html=read('dist/index.html'),auth=fs.readFileSync(path.join(root,'../../auth.html'),'utf8');
const S=SURVIVAL;
const rng=s0=>{let s=s0>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};
const ready=()=>{const g=new Game(()=>.5,{},0,'plunger',SURVIVAL_ID);g.spawnCd=1e9;g.raidAt=1e9;g.nextExecAt=1e9;g.nextBossAt=1e9;g.player.hp=g.player.max=1e9;
 Object.assign(g.weapons,{plunger:5,tp:5});Object.assign(g.passives,{coffee:1,magnet:1});return g;};
const tick=(g,to)=>{let n=0;while(g.t<to&&n++<1e5){if(g.state==='upgrade')break;g.step(.05,{x:0,y:0});}};

// 1. The schedule: 3:00, 4:00, then 5:00 for every gold after that.
assert.deepEqual(S.goldAt,[180,240,300]);
{const g=ready();
 assert.equal(g.goldOpensAt(),180);assert.equal(g.goldLocked(),true);
 assert.ok(g.options('briefcase').every(c=>c.level<6),'no gold on offer before 3:00');
 g.t=180;assert.equal(g.goldLocked(),false);assert.deepEqual(g.options('briefcase').map(c=>c.level),[6,6]);
 g.weapons.plunger=6;assert.equal(g.goldOpensAt(),240);assert.equal(g.goldLocked(),true,'2nd gold waits for 4:00');
 g.t=240;assert.equal(g.goldLocked(),false);g.weapons.tp=6;assert.equal(g.goldOpensAt(),300);
 g.weapons.gas=6;assert.equal(g.goldOpensAt(),300,'3rd and later: 5:00');}

// 2. A briefcase grabbed early, with a weapon ready, is saved and opens itself at 3:00 as a gold choice.
{const g=ready();g.t=100;g.pendingBriefcases=1;g.step(.05,{x:0,y:0});
 assert.equal(g.state,'playing','the run keeps going');assert.equal(g.savedBriefcases,1);
 assert.ok(g.events.some(e=>e.type==='gold-saved'&&e.text==='GOLD BRIEFCASE SAVED · OPENS AT 3:00'));
 g.events.length=0;tick(g,181);
 assert.equal(g.state,'upgrade');assert.equal(g.upgradeKind,'briefcase');assert.ok(g.t>=180&&g.t<181,'opens right at 3:00');
 assert.ok(g.choices.every(c=>c.level===6));assert.ok(g.events.some(e=>e.text==='GOLD UNLOCKED · CHOOSE YOUR EVOLUTION'));
 g.choose('plunger');assert.equal(g.weapons.plunger,6);assert.equal(g.savedBriefcases,0);}

// 3. Two saved: the 2nd waits for 4:00. A saved briefcase with nothing left to turn gold opens as a normal one.
{const g=ready();g.t=100;g.pendingBriefcases=2;g.step(.05,{x:0,y:0});g.step(.05,{x:0,y:0});assert.equal(g.savedBriefcases,2);
 tick(g,181);g.choose('plunger');tick(g,230);assert.equal(g.state,'playing','nothing at 3:50');assert.equal(g.savedBriefcases,1);
 tick(g,241);assert.equal(g.state,'upgrade');assert.deepEqual(g.choices.map(c=>[c.key,c.level]),[['tp',6]]);}
{const g=ready();g.t=100;g.pendingBriefcases=1;g.step(.05,{x:0,y:0});g.passives.coffee=0;g.passives.magnet=0;g.events.length=0;
 g.step(.05,{x:0,y:0});assert.equal(g.state,'upgrade','not ready any more: open it now');assert.ok(g.choices.every(c=>c.level<6));}

// 4. No weapon ready: briefcases open straight away, as before. Unlock with a weapon ready and no saved
// briefcase: one "gold unlocked" notice.
{const g=ready();g.weapons.tp=3;g.passives.magnet=0;g.weapons.plunger=4;g.t=60;g.pendingBriefcases=1;g.step(.05,{x:0,y:0});
 assert.equal(g.state,'upgrade');assert.equal(g.savedBriefcases,0);}
{const g=ready();g.t=179;tick(g,182);assert.equal(g.events.filter(e=>e.type==='gold-open').length,1);}

// 5. The two levels are unchanged.
{const g=new Game(()=>.5,{},0,'plunger',1);assert.equal(g.goldLocked(),false);assert.equal(g.goldOpensAt(),0);}

// 6. In real runs (bot always chasing Plungerang, TP Tornado and their perks), gold never comes early.
{const firsts=[],seconds=[];
 for(let seed=1;seed<=24;seed++){const g=new Game(rng(seed),{},0,'plunger',SURVIVAL_ID);g.player.max=g.player.hp=1e9;const golds=[];
  for(let i=0;i<14000&&g.t<420;i++){if(g.state==='upgrade'){const order=['plunger','tp','coffee','magnet'],rank=k=>{const i=order.indexOf(k);return i<0?9:i;};
    const c=g.choices.find(c=>c.level===6)||g.choices.slice().sort((x,y)=>rank(x.key)-rank(y.key))[0];const before=g.goldCount();g.choose(c.key);if(g.goldCount()>before)golds.push(g.t);}
   const a=g.t*.7;g.step(.05,{x:Math.cos(a),y:Math.sin(a)});g.events.length=0;}
  if(golds[0])firsts.push(golds[0]);if(golds[1])seconds.push(golds[1]);}
 assert.ok(firsts.length>=20&&firsts.every(t=>t>=180),'1st gold never before 3:00 ('+Math.min(...firsts).toFixed(0)+'s)');
 assert.ok(seconds.length>=15&&seconds.every(t=>t>=240),'2nd gold never before 4:00 ('+Math.min(...seconds).toFixed(0)+'s)');}

// 7. Players are told: a pause tip and the How to Play card.
assert.ok(tipsFor({endless:true}).some(t=>t.text==='Gold unlocks at 3:00, a 2nd at 4:00, more at 5:00. Early briefcases wait.'));
assert.ok(slidesFor(stageFor(SURVIVAL_ID)).find(s=>s.id==='evolve').text.includes('Gold unlocks at 3:00'));

// 8. Login: who() checks the login for real and reads the name; logged out is told before the run.
{const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const fake=(session,name)=>()=>Promise.resolve({auth:{getSession:()=>Promise.resolve({data:{session}})},
  from:()=>({select:()=>({eq:()=>({maybeSingle:()=>Promise.resolve({data:name?{username:name}:null})})})})});
 let r=await createBoard({storage,client:fake(null)}).who();assert.deepEqual(r,{signedIn:false,name:null},'guest');
 store.set(SESSION_KEY,JSON.stringify({access_token:'x',user:{id:'u1'}}));
 r=await createBoard({storage,client:fake({user:{id:'u1'}},'Herman_Bowels')}).who();assert.deepEqual(r,{signedIn:true,name:'Herman_Bowels'});
 r=await createBoard({storage,client:fake(null)}).who();assert.equal(r.signedIn,false,'a saved login the server rejected counts as logged out');
 r=await createBoard({storage,client:()=>new Promise(()=>{})}).who(30);assert.equal(r.signedIn,true,'slow or offline never blocks a run');}
assert.ok(html.includes('id="loginNudge"')&&html.includes('id="nudgePlay"')&&html.includes('href="auth.html?next=overtime">LOG IN</a>'));
assert.ok(html.includes('<span id="whoami" class="sv3-who" hidden></span>'));
assert.ok(app.includes("if(r.signedIn||nudged)return go();nudged=true;$('loginNudge').hidden=false;"),'asks once per visit, only when logged out');
assert.ok(app.includes("if(selectedStage!==SURVIVAL_ID)return go();"),'the two levels start as before');
assert.ok(app.includes("label('NOT POSTED · LOG IN BEFORE YOUR NEXT RUN')")&&!app.includes('SIGN IN TO POST YOUR TIME'),'the end screen no longer promises to post this run');
assert.ok(app.includes("showToast('COULD NOT REACH THE LEADERBOARD · THIS RUN WON\\'T POST',4)"));
assert.ok(html.includes('href="auth.html?next=overtime" hidden>LOG IN TO POST YOUR TIMES</a>'));
// The sign-in page sends game players back to the game, and only to the game.
assert.ok(auth.includes('return next === "overtime" ? new URL("overtime", window.location.href).href : appRedirectUrl();'));
assert.ok(auth.includes('window.location.replace(afterSignInUrl());'));
assert.ok(auth.includes('emailRedirectTo: appRedirectUrl()'),'email links still go to the app');

console.log('PASS: gold unlocks at 3:00, 4:00 and 5:00 in Survival, early briefcases wait for it, and logged-out players hear it before the run.');
