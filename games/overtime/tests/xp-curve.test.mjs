// Build 17: each promotion needs more coins. Pins the cost table and checks, with a bot that chases
// nearby coins like a real player, that promotions come about 3 a minute instead of hitting the 7-second floor.
import assert from 'node:assert/strict';
import {Game,promotionCost} from '../dist/engine.mjs';

assert.equal(new Game(()=>.5).need,5,'first promotion still costs 5 coins');
assert.deepEqual([1,2,3,4,5,6,8,10,15,20].map(promotionCost),[19,30,43,58,75,94,138,190,355,570]);
for(let l=1;l<60;l++)assert.ok(promotionCost(l+1)-promotionCost(l)>promotionCost(l)-promotionCost(l-1)||l===0,'each step costs more than the last');

// Leveling still works end to end with the new cost.
{const g=new Game(()=>.5);g.xp=5;g.levelCheck();assert.equal(g.state,'upgrade');assert.equal(g.level,2);assert.equal(g.need,30);assert.equal(g.xp,0);}

const pick=g=>{const own=g.choices.find(c=>g.weapons[c.key]>0);return (own||g.choices.find(c=>c.key in g.weapons)||g.choices[0]).key;};
const counts=[],perMinute=[0,0,0];
for(const s0 of [1,42,123,777]){
 let seed=s0;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const g=new Game(rnd);g.player.max=1e9;g.player.hp=1e9;let ang=0,n=0;
 for(let i=0;i<20*180&&g.state!=='won';i++){
  if(g.state==='upgrade'){n++;perMinute[Math.min(2,Math.floor(g.t/60))]++;g.choose(pick(g));}
  ang+=.012;let inp={x:Math.cos(ang),y:Math.sin(ang)};const P=g.player;let best=null,bd=1e9;
  for(const d of g.drops){if(!d.value)continue;const dd=Math.hypot(d.x-P.x,d.y-P.y);if(dd<bd){bd=dd;best=d;}}
  if(best&&bd>5&&bd<260)inp={x:(best.x-P.x)/bd,y:(best.y-P.y)/bd};
  g.step(.05,inp);
 }
 counts.push(n);
}
const avg=counts.reduce((a,b)=>a+b,0)/counts.length;
assert.ok(avg>=7&&avg<=13,'a coin-chasing player gets about 10 promotions before the boss, got '+avg);
assert.ok(perMinute[1]/counts.length<=4.5,'minute two no longer runs at the 7-second floor, got '+perMinute[1]/counts.length+' a minute');
console.log('PASS: costs 5, 19, 30, 43... and a coin-chasing player averages '+avg.toFixed(1)+' promotions in 3 minutes ('+perMinute.map(x=>(x/counts.length).toFixed(1)).join('/')+' per minute).');
