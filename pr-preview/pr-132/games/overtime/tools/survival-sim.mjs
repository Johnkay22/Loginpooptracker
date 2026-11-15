// Survival tuning report (Build 19). Run from games/overtime:  node tools/survival-sim.mjs
// It plays seeded bot runs and prints how long they last, the promotion pace and when evolutions land.
// Rough guide only: real players dodge better or worse than any of these bots. Takes about a minute.
import {Game,WEAPONS,PASSIVES,EVOLUTIONS,SURVIVAL} from '../dist/engine.mjs';
import {SURVIVAL_ID} from '../dist/stages.mjs';
export const rng=s0=>{let seed=s0>>>0;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};
// upgrade pickers
export const pickSmart=g=>{const c=g.choices;if(c.some(x=>x.key==='cash'))return g.player.hp<g.player.max*.6?'heal':'cash';
 const evo=c.find(x=>x.level===6);if(evo)return evo.key;
 const partner=k=>EVOLUTIONS[k]?.requires;
 const owned=c.filter(x=>g.weapons[x.key]>0).sort((a,b)=>b.level-a.level);
 const need=c.find(x=>x.key in PASSIVES&&g.passives[x.key]===0&&Object.keys(WEAPONS).some(k=>g.weapons[k]>0&&partner(k)===x.key));
 return (need||owned[0]||c.find(x=>x.key in g.weapons)||c[0]).key;};
export const pickRandom=g=>g.choices[Math.floor(g.random()*g.choices.length)].key;
// movers
export const still=()=>({x:0,y:0});
export const circler=(g,st)=>{st.a=(st.a||0)+.012;return{x:Math.cos(st.a),y:Math.sin(st.a)};};
// Kiter: backs away from nearby enemies and marked slams, drifts to kits when hurt, briefcases and coins, avoids walls.
export const kiter=(g,st,skill=1)=>{const p=g.player;let x=0,y=0;
 for(const e of g.enemies){const d=Math.hypot(e.x-p.x,e.y-p.y);const reach=e.type==='runner'?210:150;if(d<reach*skill&&d>0){const w=(reach*skill-d)/(reach*skill)/d*(e.type==='exec'?2.2:1);x-=(e.x-p.x)*w;y-=(e.y-p.y)*w;}}
 for(const a of g.bossAttacks){const d=Math.hypot(a.x-p.x,a.y-p.y);if(d<a.r+40){x+=(p.x-a.x||1)/Math.max(1,d)*4;y+=(p.y-a.y)/Math.max(1,d)*4;}}
 let goal=null,gd=1e9,gw=0;
 for(const d of g.drops){const dd=Math.hypot(d.x-p.x,d.y-p.y);let w=d.chest?1.2:d.heal?(p.hp<p.max-8?(p.hp<p.max*.5?1.6:.9):0):d.coffee||d.magnet?.5:dd<240?.35:0;if(!w)continue;const score=dd/w;if(score<gd){gd=score;goal=d;gw=w;}}
 if(goal){const dd=Math.max(1,Math.hypot(goal.x-p.x,goal.y-p.y));x+=(goal.x-p.x)/dd*gw;y+=(goal.y-p.y)/dd*gw;}
 const cx=900-p.x,cy=900-p.y,cd=Math.hypot(cx,cy);if(cd>520){x+=cx/cd*(cd-520)/200;y+=cy/cd*(cd-520)/200;}
 if(Math.hypot(x,y)<.05){st.a=(st.a||0)+.02;x=Math.cos(st.a)*.6;y=Math.sin(st.a)*.6;}
 const n=Math.hypot(x,y);return{x:x/n,y:y/n};};
export function run({seed=1,mover=kiter,pick=pickSmart,max=1800,immortal=false,skill=1,bomb=true,start='plunger',perks={},stage=SURVIVAL_ID}){
 const g=new Game(rng(seed),perks,0,start,stage);if(immortal){g.player.max=1e9;g.player.hp=1e9;}
 const st={},r={opens:[],brief:[],evo:[],firstHit:null,execKills:[],bossKills:[],maxEnemies:0,dmg:[],alive:[]};let hp=g.player.hp,stopped=0,bb=0;
 let hp180=null;while(g.t<max&&g.state!=='lost'&&g.state!=='won'){if(hp180===null&&g.t>=179.9)hp180=g.player.hp;
  if(g.state==='upgrade'){(g.upgradeKind==='briefcase'?r.brief:r.opens).push(g.t);const before=Object.values(g.weapons).filter(l=>l===6).length;g.choose(pick(g));if(Object.values(g.weapons).filter(l=>l===6).length>before)r.evo.push(g.t);}
  if(bomb&&g.cd.bomb<=0&&g.enemies.filter(e=>Math.hypot(e.x-g.player.x,e.y-g.player.y)<200).length>=6)g.useBomb();
  g.step(.05,mover(g,st,skill));g.events.length=0;{const m=Math.floor(g.t/60);r.dmg[m]=(r.dmg[m]||0)+Math.max(0,hp-g.player.hp);r.alive[m]=(r.alive[m]||0)+g.enemies.length/1200;}
  if(g.player.hp<hp&&r.firstHit===null)r.firstHit=g.t;hp=g.player.hp;
  if(g.bossesBeaten>bb){bb=g.bossesBeaten;r.bossKills.push(g.t);}
  if(g.enemies.length>r.maxEnemies)r.maxEnemies=g.enemies.length;
 }
 return {...r,hp180,won:g.state==='won',t:g.t,level:g.level,tier:g.tier,killedBy:g.killedBy,weapons:{...g.weapons},passives:{...g.passives},kills:g.kills,tokens:g.tokens,bosses:g.bossesBeaten,lost:g.state==='lost'};
}
export const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
export const fmt=s=>isNaN(s)?'  -  ':String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');

// ---- report
const still_=still,seeds=[1,7,42,99,123,555,777,2024,31,64,900,4242],med=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
const mortal=(label,cfg)=>{const ts=seeds.map(seed=>run({seed,max:1500,...cfg}).t);console.log(label.padEnd(34),'past 3:00 '+ts.filter(t=>t>=180).length+'/12 · median '+fmt(med(ts))+' · best '+fmt(Math.max(...ts))+'  ['+ts.map(fmt).join(' ')+']');};
const st=seeds.slice(0,6).map(seed=>run({seed,mover:still_,bomb:false,max:120}));
console.log('Stand still'.padEnd(34),'first hit '+avg(st.map(r=>r.firstHit)).toFixed(0)+'s · out at '+fmt(avg(st.map(r=>r.t))));
mortal('Dodging bot, picks for evolutions',{pick:pickSmart});
mortal('Dodging bot, random picks',{pick:pickRandom});
const im=seeds.slice(0,3).map(seed=>run({seed,immortal:true,max:720}));
const row=(name,f)=>console.log(name.padEnd(34),Array.from({length:12},(_,m)=>String(Math.round(avg(im.map(r=>f(r,m))))).padStart(4)).join(''));
console.log('\nUnlimited-health bot, minute by minute:');row('minute',(r,m)=>m+1);row('promotions',(r,m)=>r.opens.filter(t=>t>=m*60&&t<m*60+60).length);row('enemies alive (average)',(r,m)=>r.alive[m]||0);row('damage it would have taken',(r,m)=>r.dmg[m]||0);
console.log('evolutions at'.padEnd(34),im.map(r=>r.evo.map(fmt).join(' ')).join('  |  '));
console.log('bosses beaten at'.padEnd(34),im.map(r=>r.bossKills.map(fmt).join(' ')).join('  |  '));
