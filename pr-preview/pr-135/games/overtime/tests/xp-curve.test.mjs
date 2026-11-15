// Build 17: each promotion needs a few more coins, so the promotion screen opens a little less often.
// Pins the cost table and checks, with a bot that chases nearby coins and plays for an evolution,
// that promotions are fewer than before while most runs still reach an evolution before the boss.
import assert from 'node:assert/strict';
import {Game,WEAPONS,EVOLUTIONS,promotionCost,FIRST_PROMOTION_COST} from '../dist/engine.mjs';

const oldCost=l=>Math.floor(5+l*2.8+l*l*.12);
assert.equal(FIRST_PROMOTION_COST,12);assert.equal(new Game(()=>.5).need,12,'first promotion costs 12 coins');assert.ok(promotionCost(2)>FIRST_PROMOTION_COST,'second costs more than the first');
assert.deepEqual([2,3,4,5,6,7,8,10,15].map(promotionCost),[16,22,29,37,45,54,64,86,152]);
for(let l=2;l<60;l++){assert.ok(promotionCost(l)>oldCost(l),'level '+l+' costs more than before');assert.ok(promotionCost(l+1)>promotionCost(l),'cost keeps rising');}

// Leveling still works end to end with the new cost.
{const g=new Game(()=>.5);g.xp=11;g.levelCheck();assert.equal(g.state,'playing','11 coins is not enough');g.xp=12;g.levelCheck();assert.equal(g.state,'upgrade');assert.equal(g.level,2);assert.equal(g.need,16);assert.equal(g.xp,0);}

function play(seed0,cost){
 let seed=seed0;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const g=new Game(rnd);g.player.max=1e9;g.player.hp=1e9;let ang=0,n=0,first=0;const perMinute=[0,0,0];
 const main=Object.keys(WEAPONS).find(k=>k!=='bomb'&&g.weapons[k]>0)||'bomb',perk=EVOLUTIONS[main].requires;
 if(cost)g.levelCheck=function(){if(this.state!=='playing'||this.t<this.nextUpgradeAt)return;if(this.xp>=this.need){this.xp-=this.need;this.level++;this.need=cost(this.level);this.openUpgrade();}};
 for(let i=0;i<20*180&&g.phase!=='boss'&&g.state!=='won';i++){
  if(g.state==='upgrade'){if(!n)first=g.t;n++;perMinute[Math.min(2,Math.floor(g.t/60))]++;const c=g.choices;
   g.choose((c.find(x=>x.level===6&&x.key in g.weapons)||c.find(x=>x.key===main)||c.find(x=>x.key===perk&&g.passives[perk]===0)||c.find(x=>g.weapons[x.key]>0)||c.find(x=>x.key in g.weapons)||c[0]).key);}
  ang+=.012;let inp={x:Math.cos(ang),y:Math.sin(ang)};const P=g.player;let best=null,bd=1e9;
  for(const d of g.drops){if(!d.value)continue;const dd=Math.hypot(d.x-P.x,d.y-P.y);if(dd<bd){bd=dd;best=d;}}
  if(best&&bd>5&&bd<260)inp={x:(best.x-P.x)/bd,y:(best.y-P.y)/bd};
  g.step(.05,inp);
 }
 return {n,perMinute,first,evolved:Object.values(g.weapons).some(l=>l===6)};
}
const seeds=[7,138,269,400,531,662,793,924],avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
const now=seeds.map(s=>play(s)),before=seeds.map(s=>play(s,oldCost));
const n=avg(now.map(r=>r.n)),nb=avg(before.map(r=>r.n)),min2=avg(now.map(r=>r.perMinute[1])),evo=now.filter(r=>r.evolved).length;
assert.ok(n<=nb-2,'at least 2 fewer promotions per run than before: '+n+' vs '+nb);
assert.ok(n>=11,'still a steady stream of promotions, got '+n);
assert.ok(min2<=6,'minute two no longer runs at the 7-second floor, got '+min2+' a minute');
const first=avg(now.map(r=>r.first));
assert.ok(first>=10&&first<=20,'first promotion lands around 15 seconds for a coin-chasing player, got '+first);
assert.ok(evo>=5,'most runs that play for an evolution still get one before the boss, got '+evo+'/8');
console.log('PASS: promotions cost 12, 16, 22, 29... First one at about '+first.toFixed(0)+'s. A coin-chasing player gets '+n.toFixed(1)+' before the boss (was '+nb.toFixed(1)+'), '+[0,1,2].map(m=>avg(now.map(r=>r.perMinute[m])).toFixed(1)).join('/')+' per minute, and '+evo+'/8 runs evolve a weapon.');
