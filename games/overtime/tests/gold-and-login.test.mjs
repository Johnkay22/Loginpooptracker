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

// Build 32 replaced the gold clock: only bosses drop briefcases, and executives drop a mystery item and a
// first-aid kit instead. Bosses come at 3:00, 6:00 and so on, so gold can't come before 3:00 (2nd before 6:00).
assert.deepEqual(S.goldAt,[0,0,0],'the clock is off');
{const g=ready();g.t=100;assert.equal(g.goldLocked(),false);assert.deepEqual(g.options('briefcase').map(c=>c.level),[6,6],'a briefcase can always evolve a ready weapon');}
// An executive drops a mystery item and a first-aid kit, not a briefcase; a boss drops the briefcase.
{const g=ready();const x=g.spawn('exec',1000,900,{hp:10,speed:0});g.hit(x,1e9);assert.equal(g.drops.filter(d=>d.chest).length,0,'no briefcase');
 assert.equal(g.drops.filter(d=>d.heal).length,1,'one first-aid kit');assert.equal(g.drops.filter(d=>d.item||d.magnet||d.coffee).length+g.puddles.length,1,'one mystery item');
 assert.ok(g.events.some(e=>e.text==='EXECUTIVE DEFEATED · MYSTERY ITEM + FIRST AID'));assert.ok(g.events.some(e=>e.type==='supply'&&e.text.startsWith('EXECUTIVE DROPPED · ')));}
{const g=ready();g.addBoss(10);const b=g.enemies.find(e=>e.boss);g.hit(b,1e9);assert.equal(g.drops.filter(d=>d.chest).length,1,'the boss drops the briefcase');}
{const g=new Game(()=>.5,{},0,'plunger',1);const x=g.spawn('exec',1000,900,{hp:10,speed:0});g.hit(x,1e9);assert.equal(g.drops.filter(d=>d.chest).length,1,'the levels keep executive briefcases');}
// In real runs (bot always chasing Plungerang, TP Tornado and their perks), gold never comes before a boss.
{const firsts=[],seconds=[];
 for(let seed=1;seed<=16;seed++){const g=new Game(rng(seed),{},0,'plunger',SURVIVAL_ID);g.player.max=g.player.hp=1e9;const golds=[];
  for(let i=0;i<16000&&g.t<480;i++){if(g.state==='upgrade'){const order=['plunger','tp','coffee','magnet'],rank=k=>{const i=order.indexOf(k);return i<0?9:i;};
    const c=g.choices.find(c=>c.level===6)||g.choices.slice().sort((x,y)=>rank(x.key)-rank(y.key))[0];const before=g.goldCount();g.choose(c.key);if(g.goldCount()>before)golds.push(g.t);continue;}
   if(g.state==='card'){g.buyItem(g.cardChoices[0]);continue;}if(g.state==='intro'){g.endIntro();continue;}
   const a=g.t*.7;g.step(.05,{x:Math.cos(a),y:Math.sin(a)});g.events.length=0;}
  if(golds[0])firsts.push(golds[0]);if(golds[1])seconds.push(golds[1]);}
 assert.ok(firsts.length>=10&&firsts.every(t=>t>=180),'1st gold never before the 3:00 boss ('+Math.min(...firsts).toFixed(0)+'s)');
 assert.ok(seconds.every(t=>t>=360),'2nd gold never before the 6:00 boss ('+(seconds.length?Math.min(...seconds).toFixed(0):'-')+'s)');}

// 7. Players are told.
assert.ok(tipsFor({endless:true}).some(t=>t.text==='Only bosses drop briefcases. Max weapon + partner perk + boss briefcase = evolution.'));
assert.ok(tipsFor({endless:true}).some(t=>t.text==='Executives walk in twice before each boss. Each drops a mystery item and first aid.'));
assert.ok(slidesFor(stageFor(SURVIVAL_ID)).find(s=>s.id==='evolve').text.includes('beat a boss for its briefcase'));

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
assert.ok(app.includes("if(!stillOnMenu(ticket,stage))return;if(r.signedIn||nudged)return go();"),'a start is dropped if the player left the menu during the check');
assert.ok(app.includes("ticket===startTicket&&selectedStage===stage&&!$('start').hidden&&$('workshop').hidden&&$('how').hidden"));
assert.ok(app.includes("function selectMode(id){startTicket++;"),'changing mode cancels a pending start');
assert.ok(app.includes("label('NOT POSTED · LOG IN BEFORE YOUR NEXT RUN')")&&!app.includes('SIGN IN TO POST YOUR TIME'),'the end screen no longer promises to post this run');
assert.ok(app.includes("showToast('COULD NOT REACH THE LEADERBOARD · THIS RUN WON\\'T POST',4)"));
assert.ok(html.includes('href="auth.html?next=overtime" hidden>LOG IN TO POST YOUR TIMES</a>'));
// The sign-in page sends game players back to the game, and only to the game.
assert.ok(auth.includes('return next === "overtime" ? new URL("overtime", window.location.href).href : appRedirectUrl();'));
assert.ok(auth.includes('window.location.replace(afterSignInUrl());'));
assert.ok(auth.includes('emailRedirectTo: appRedirectUrl()'),'email links still go to the app');

console.log('PASS: in Survival only bosses drop briefcases (executives drop a mystery item and first aid), and logged-out players hear it before the run.');
