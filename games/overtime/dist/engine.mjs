import {resolveFurniture, furnitureFor} from './scene.mjs';
import {stageFor} from './stages.mjs';
import {bossPath} from './navigation.mjs';
import {ITEMS,MYSTERY,BOX_SPOTS,rollItem,NOW_ITEMS} from './mystery.mjs';
export const WEAPONS={plunger:{name:'Plungerang',icon:'🪠',color:'#ffbd66',desc:'A returning plunger cuts through the crowd.'},tp:{name:'TP Tornado',icon:'🧻',color:'#e5efff',desc:'Orbiting rolls keep nearby enemies off you.'},gas:{name:'Silent But Deadly',icon:'💨',color:'#a6ec74',desc:'Leave damaging stink clouds in your wake.'},flush:{name:'Courtesy Flush',icon:'🌊',color:'#64dcec',desc:'A circular blast damages and pushes enemies away.'},bomb:{name:'Stink Bomb',icon:'💣',color:'#d0f274',desc:'Lures nearby enemies, then explodes after 3 seconds.'}};
export const PASSIVES={speed:{name:'Bathroom Dash',icon:'👟',desc:'Move 10% faster per rank. Evolves Courtesy Flush.'},coffee:{name:'Double Espresso',icon:'☕',desc:'Weapons recharge 8% faster per rank. Evolves Plungerang.'},magnet:{name:'Expense Account',icon:'🧲',desc:'Pulls coins in from further away, and the promotion bar fills 10% faster per rank. Evolves TP Tornado.'},chili:{name:'Hot Sauce',icon:'🌶️',desc:'15% more weapon damage per rank. Evolves gas and Stink Bomb.'}};
export const EVOLUTIONS={plunger:{name:'Double Plunge',requires:'coffee',desc:'Six giant plungers spiral out, pierce the crowd and return.'},tp:{name:'Wrap Sheet',requires:'magnet',desc:'Two counter-rotating rings of toilet rolls shred nearby enemies.'},gas:{name:'Chemical Warfare',requires:'chili',desc:'Huge lingering clouds slow enemies and deal double damage.'},flush:{name:'Royal Flush',requires:'speed',desc:'Massive golden flushes hit twice and clear a wide escape route.'},bomb:{name:'Weapons of Ass Destruction',requires:'chili',desc:'A giant lure bomb detonates, then delivers a second blast.'}};
export const RECOVERY_SECONDS=2;
// Build 17: coins needed for the next promotion; level is the level just reached. The first promotion costs 12
// (it was 5, which came about 7 seconds in). The 2nd to 8th cost 16, 22, 29, 37, 45, 54, 64 (they were 11, 14,
// 18, 22, 26, 30, 35), so the promotion screen opens a little less often without pushing evolutions out of a
// 3-minute run.
export const FIRST_PROMOTION_COST=12;
export const promotionCost=level=>Math.floor(6+level*4.5+level*level*.35);
// Build 19: survival mode ("Survival of the Shittest"). The run never ends and time survived is the score.
// Every number worth tuning lives here. Stage mode (Office Floor, Corporate Lobby) does not use any of it.
export const SURVIVAL={
 tierSeconds:180,          // enemies step up, and a boss arrives, this often
 tierHealth:2.3,           // from healthFrom on, enemy health multiplies by this every tierSeconds, climbing smoothly, on top of the steady growth over time
 healthFrom:210,           // seconds before that extra health growth starts (Build 28: was 150, which piled onto the first boss)
 lateFrom:360,lateHealth:1.9, // from lateFrom on the multiple per tierSeconds eases to lateHealth, so strong builds can push further
 tierSpeed:.05,            // extra enemy speed per tier...
 speedCap:1.3,             // ...up to this multiple, so nothing outruns Herman
 tierDamage:.15,           // extra enemy and boss-slam damage per tier
 openingGrace:4,           // seconds of half-pace spawns at the very start
 spawnStart:.5,            // seconds between spawns at 0:00 (stage mode starts at 0.9)
 rampHold:120,rampDone:270, // Build 28: the spawn gap shrinks as before until rampHold, then eases down to spawnFloor by rampDone (it used to get there by 2:53)
 spawnFloor:.12,           // fastest spawn gap in tier 1...
 tierSpawn:.012,           // ...shrinking this much per tier...
 spawnMin:.06,             // ...but never below this
 enemyCap:240,tierCap:20,capMax:320, // most enemies alive at once: base, extra per tier, ceiling
 runnerFrom:6,guardFrom:20, // seconds before runners and guards join
 firstRush:28,rushGap:22,rushMax:48, // first Corporate Rush, gap between rushes, biggest rush
 rushLateFrom:120,rushGapLate:30, // Build 28: from rushLateFrom on, rushes come this far apart
 rushBossGap:10,           // no rush starts within this many seconds of a boss arriving
 execTimes:[60,120],       // seconds into each tier when a briefcase executive walks in (the boss brings a third briefcase)
 execHP:600,execHPPerSecond:8, // executive health: base plus this much per second of run time, times the tier health multiple
 execSpeed:78,
 bossHP:7000,bossGrowth:1,  // boss health: this, plus this share again for each boss before it, times the health climb above
 bossCash:40,bossKits:2,   // what a beaten boss drops besides the briefcase
 weaponSlots:4,perkSlots:3, // most weapons (Stink Bomb counts) and perks one run can hold
 earlyEase:.35,easeIn:[45,120],easeOut:[240,360], // Build 32: regular enemies have this much less health while the player is still building (full from easeIn[1] to easeOut[0], fading at both ends)
 promoRate:.45,            // Build 32: share of each coin that fills the promotion bar in Survival (Petty Cash is unaffected)
 firstCost:12,             // coins for the first promotion
 kitHeal:25,kitHealPerTier:3,kitHealMax:40, // health per first aid kit (Build 28: was 16, about one hit)
 kitLife:45,               // seconds a first aid kit waits on the floor (was 20)
 kitsFromTier:2,           // from this tier (0 = first) a survived rush drops 2 kits instead of 1
 cashBonus:30,             // Petty Cash from the bonus offered once everything is maxed
 boost:.1,boostTaper:.88,  // Extra Hot Sauce: the 1st adds 10% weapon damage, each later one 12% less than the one before (Build 32: was +10% each, forever), so it tops out near +83%
 // Build 32: Middle Managers. Big guards that shrug off knockback (TP rings, flushes, the Air Horn barely move them),
 // so a fully built Herman can't stand still behind his weapons. Slower than Herman, so a moving player outwalks them.
 // They come a little faster every tier, with more allowed at once, and no ceiling: every run ends eventually.
 managerFrom:240,managerGap:14,managerGapTier:2,managerGapMin:4,managerCap:6,managerCapTier:3,managerHP:20,managerSpeed:120,managerDamage:1.5,managerR:26,
 goldAt:[180,240,300],      // Build 30: earliest run time (seconds) for the 1st, 2nd, and 3rd and later gold (evolved) weapon
};
// Coins for each later promotion in survival. Steeper than stage mode so a long run paces at about 3 a minute.
export const survivalPromotionCost=level=>Math.floor(8+level*6+level*level*.6);
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clock=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
export class Game{
 constructor(random=Math.random,perks={},difficulty=0,startWeapon="plunger",stageId=1){this.stage=stageFor(stageId);this.endless=!!this.stage.endless;this.furniture=furnitureFor(this.stage.map||this.stage.id);this.tier=0;this.nextBossAt=SURVIVAL.tierSeconds;this.execIndex=0;this.nextExecAt=SURVIVAL.execTimes[0];this.bossesBeaten=0;this.killedBy=null;this.phase='survival';this.resumeLeft=0;this.caffeine=0;this.supplies=BOX_SPOTS.map((o,i)=>({...o,id:'supply'+i,type:'supply',reward:'mystery',hp:45,max:45,r:27,flash:0,hit:0,refillAt:0}));this.boss=null;this.bossDefeated=false;this.bossWarning=false;this.bossAttacks=[];this.bombHint=false;this.random=random;this.state='playing';this.perks=perks;this.difficulty=difficulty;this.passives={coffee:0,magnet:0,chili:0,speed:0};this.nextUpgradeAt=0;this.pendingBriefcases=0;this.savedBriefcases=0;this.goldNoticeAt=0;this.boosts=0;this.walkDistance=0;this.moving=false;this.facingX=1;this.damageMult=1;this.numbers=[];this.combo=0;this.comboTime=0;this.bestCombo=0;this.bombKills=0;this.magnetTime=0;this.tokens=0;this.upgradeKind='promotion';this.t=0;this.level=1;this.xp=0;this.need=this.endless?SURVIVAL.firstCost:FIRST_PROMOTION_COST;this.kills=0;this.stopped=0;this.player={x:900,y:900,hp:100+(perks.health||0)*10,max:100+(perks.health||0)*10,inv:0};this.weapons={plunger:0,tp:0,gas:0,flush:0,bomb:1};this.weapons[['plunger','tp','gas'].includes(startWeapon)?startWeapon:'plunger']=1;this.cd={plunger:0,tp:0,gas:0,flush:0,bomb:0};this.enemies=[];this.shots=[];this.clouds=[];this.bombs=[];this.waves=[];this.drops=[];this.rushCount=0;this.kitDrops=[];this.fx=[];this.events=[];this.spawnCd=0;this.raidAt=this.endless?SURVIVAL.firstRush:45;this.raids=[];this.id=0;this.face={x:0,y:-1};this.choices=[];this.healCount=0;this.pocket=[];this.puddles=[];this.bidet=0;this.cardUses=0;this.cardChoices=[];}
 event(type,text){this.events.push({type,text});}
 spawn(type,x,y,o={}){let stats={worker:[24,92,13],runner:[22,120,16],guard:[100,65,22],exec:[o.hp??this.stage.bossHP,o.speed??this.stage.bossSpeed,20]}[type];if(type!=='exec')stats[0]*=1+this.t*.017;stats[0]*=1+this.difficulty*.3;stats[1]*=1+this.difficulty*.12;if(this.endless){const S=SURVIVAL;if(type!=='exec')stats[0]*=this.healthScale()*this.easeScale();stats[1]*=Math.min(S.speedCap,1+this.tier*S.tierSpeed);stats[2]*=1+this.tier*S.tierDamage;}let e={id:++this.id,type,x,y,hp:stats[0],max:stats[0],speed:stats[1],damage:stats[2],r:type==='guard'?20:type==='exec'?28:15,flash:0,hit:0,attracted:false,chargeCd:1.5+this.random()*2,windup:0,dash:0,aim:{x:0,y:0}};this.enemies.push(e);return e;}
 // Nov 7 sounds: which hit sound a landed blow makes. The final blow plays a knockout impact instead,
 // bosses and executives get the heavy hit, and Stink Bomb blasts stay quiet (the blast sound covers them).
 hitSound(e,weapon){
  if(e.hp<=0){if(!e.boss)this.event('ko','');return;}
  // Build 31: Johnny cut the Plungerang hit (squeak) and the executive and boss grunt (groan); knockouts still sound.
  if(!weapon||weapon==='bomb'||weapon==='bidet'||weapon==='wet'||weapon==='plunger'||e.type==='exec')return;
  this.event('hit-'+weapon,'');
 }
 hit(e,amount,weapon){if(e.hp<=0||this.state==='won'||this.state==='lost')return;amount*=1+(this.perks.damage||0)*.06+this.passives.chili*.15+this.boostTotal();e.hp-=amount;if(e.type==='supply'){e.flash=.12;if(e.hp<=0)this.openBox(e);return;}if(amount>=8&&e.flash===0&&this.numbers.length<45)this.numbers.push({x:e.x,y:e.y-22,text:Math.round(amount),t:0,life:.65,color:'#fff3c8'});e.flash=.12;this.hitSound(e,weapon);if(e.hp<=0){this.kills++;this.combo++;this.comboTime=2.5;this.bestCombo=Math.max(this.bestCombo,this.combo);if(this.combo%25===0)this.event('combo',this.combo+' KOs · KEEP IT GOING');if(this.kills%60===0){this.drops.push({x:e.x,y:e.y,magnet:true,value:0});}let value=e.type==='exec'?14:e.type==='guard'?4:1;if(e.boss&&this.endless)value=SURVIVAL.bossCash;if(!e.boss||this.endless)this.drops.push({x:e.x,y:e.y+(this.endless&&e.type==='exec'?26:0),value,heal:false});if(e.type==='exec'){if(e.boss&&!this.endless)this.bossDefeated=true;else this.drops.push({x:e.x,y:e.y,chest:true,value:0});if(e.boss&&this.endless){this.bossesBeaten++;for(let i=0;i<SURVIVAL.bossKits;i++)this.drops.push({x:clamp(e.x+(i*2-1)*46,80,1720),y:e.y,heal:true,value:0,life:this.kitLife()});}this.stopped++;this.event('exec',this.endless?(e.boss?'BOSS':'EXECUTIVE')+' DEFEATED · GRAB THE BRIEFCASE':'EXECUTIVE DEFEATED');}this.fx.push({x:e.x,y:e.y,t:0,life:.35,r:25,color:e.type==='exec'?'#ffcc67':'#91dcbe'});}}
 // Survival: weapons and perks are limited to a few slots, evolutions only come from briefcases, and once
 // everything is maxed a promotion offers a Petty Cash bonus or a heal.
 ownedCount(set){return Object.values(set).filter(l=>l>0).length;}
 readyToEvolve(){return Object.keys(WEAPONS).filter(k=>this.weapons[k]===5&&this.passives[EVOLUTIONS[k].requires]>0);}
 // Build 30: gold comes on a schedule in survival (SURVIVAL.goldAt), so the power spike lands after the run has
 // built some tension. A briefcase grabbed while a weapon is ready but gold is still locked is saved, not
 // spent: it opens by itself the moment gold unlocks. The two levels are unchanged.
 goldCount(){return Object.values(this.weapons).filter(l=>l===6).length;}
 goldOpensAt(){const at=SURVIVAL.goldAt;return this.endless?at[Math.min(this.goldCount(),at.length-1)]:0;}
 goldLocked(){return this.endless&&this.t<this.goldOpensAt();}
 // Build 28: a briefcase with nothing ready to evolve offers the upgrades that get a weapon there soonest:
 // the missing partner perk first, then levels for the weapon closest to level 5. No luck involved.
 evolutionRoute(){const S=SURVIVAL,room=this.ownedCount(this.passives)<S.perkSlots,out=[];
  const add=k=>{if(out.length<3&&!out.some(c=>c.key===k))out.push({key:k,level:(this.weapons[k]??this.passives[k])+1});};
  const paths=Object.keys(WEAPONS).filter(k=>this.weapons[k]>0&&this.weapons[k]<6).map(k=>{const perk=EVOLUTIONS[k].requires,has=this.passives[perk]>0;return{k,perk,has,steps:5-this.weapons[k]+(has?0:1)};}).filter(r=>r.has||room).sort((a,b)=>a.steps-b.steps);
  for(const r of paths){if(!r.has)add(r.perk);if(this.weapons[r.k]<5)add(r.k);}
  return out;}
 survivalOptions(kind){const S=SURVIVAL;if(kind==='briefcase'){let ready=this.goldLocked()?[]:this.readyToEvolve();if(ready.length)return ready.slice(0,3).map(k=>({key:k,level:6}));let route=this.goldLocked()?[]:this.evolutionRoute();if(route.length){for(const c of this.survivalOptions('promotion'))if(route.length<3&&!route.some(r=>r.key===c.key)&&(c.key in WEAPONS||c.key in PASSIVES))route.push(c);return route;}}
  let ow=this.ownedCount(this.weapons),op=this.ownedCount(this.passives);
  let keys=Object.keys(WEAPONS).filter(k=>this.weapons[k]<5&&(this.weapons[k]>0||ow<S.weaponSlots));keys.push(...Object.keys(PASSIVES).filter(k=>this.passives[k]<3&&(this.passives[k]>0||op<S.perkSlots)));
  for(let i=keys.length-1;i>0;i--){let j=Math.floor(this.random()*(i+1));[keys[i],keys[j]]=[keys[j],keys[i]];}
  let picks=keys.slice(0,3).map(k=>({key:k,level:(this.weapons[k]??this.passives[k])+1}));
  return picks.length?picks:[{key:'boost',level:this.boosts+1},{key:'cash',level:1},{key:'heal',level:1}];}
 options(kind){if(this.endless)return this.survivalOptions(kind);let keys=Object.keys(WEAPONS).filter(k=>this.weapons[k]<5||(this.weapons[k]===5&&this.passives[EVOLUTIONS[k].requires]>0&&this.t>=45));keys.push(...Object.keys(PASSIVES).filter(k=>this.passives[k]<3));for(let i=keys.length-1;i>0;i--){let j=Math.floor(this.random()*(i+1));[keys[i],keys[j]]=[keys[j],keys[i]];}let evo=keys.find(k=>this.weapons[k]===5);if(evo)keys=[evo,...keys.filter(k=>k!==evo)];if(this.level===2&&this.passives.speed===0)keys=['speed',...keys.filter(k=>k!=='speed')];return keys.slice(0,3).map(k=>({key:k,level:(this.weapons[k]??this.passives[k])+1}));}
 choose(k){if(this.state!=='upgrade'||!this.choices.some(c=>c.key===k))return false;if(k==='heal')this.player.hp=Math.min(this.player.max,this.player.hp+35);else if(k==='cash')this.tokens+=SURVIVAL.cashBonus;else if(k==='boost')this.boosts++;else if(k in this.passives)this.passives[k]++;else this.weapons[k]++;this.state='countdown';this.resumeLeft=RECOVERY_SECONDS;this.moving=false;this.nextUpgradeAt=this.t+7;this.choices=[];this.event(this.weapons[k]===6?'evolve':'upgrade',this.weapons[k]===6?EVOLUTIONS[k].name.toUpperCase()+' · EVOLVED':'');return true;}
 openUpgrade(kind='promotion',note=''){this.upgradeKind=kind;this.choices=this.options(kind);if(!this.choices.length)this.choices=[{key:'heal',level:1}];this.state='upgrade';this.event('level',note||(kind==='briefcase'?'EXECUTIVE BRIEFCASE · CHOOSE YOUR BONUS':'LEVEL '+this.level));}
 levelCheck(){if(this.state!=='playing'||this.t<this.nextUpgradeAt)return;const ready=this.endless&&this.readyToEvolve().length>0;if(this.savedBriefcases>0&&(!ready||!this.goldLocked())){this.savedBriefcases--;this.openUpgrade('briefcase',ready?'GOLD UNLOCKED · CHOOSE YOUR EVOLUTION':'');return;}if(this.pendingBriefcases>0){this.pendingBriefcases--;if(ready&&this.goldLocked()){this.savedBriefcases++;this.event('gold-saved','GOLD BRIEFCASE SAVED · OPENS AT '+clock(this.goldOpensAt()));}else{this.openUpgrade('briefcase');return;}}if(ready&&!this.savedBriefcases&&!this.goldLocked()&&this.goldNoticeAt!==this.goldOpensAt()&&this.t-this.goldOpensAt()<1){this.goldNoticeAt=this.goldOpensAt();this.event('gold-open','GOLD UNLOCKED · YOUR NEXT BRIEFCASE TURNS IT GOLD');}if(this.xp>=this.need){this.xp-=this.need;this.level++;this.need=this.endless?survivalPromotionCost(this.level):promotionCost(this.level);this.openUpgrade();}}
 bombCooldown(){return Math.max(5,12-(this.weapons.bomb-1)*.8)*(1-this.passives.coffee*.08);}
 useBomb(){if(this.state!=='playing'||!this.weapons.bomb||this.cd.bomb>0)return false;this.dropBomb();this.cd.bomb=this.bombCooldown();this.event('deploy','');return true;}
 dropBomb(){const l=Math.max(1,this.weapons.bomb||0),evolved=l===6;this.bombs.push({x:this.player.x-this.face.x*27,y:this.player.y-this.face.y*27,t:0,fuse:3,lure:evolved?340:160+l*23,blast:evolved?245:100+l*15,damage:evolved?450:105+l*30,level:l});}
 // ---- Build 31: mystery boxes (rules and numbers in mystery.mjs) ----
 openBox(box){this.fx.push({x:box.x,y:box.y,t:0,life:.45,r:45,color:'#f2cd87'});box.refillAt=this.t+MYSTERY.refill;const k=rollItem(this.random);
  if(k==='wet'){this.addPuddle(box.x,box.y);this.event('got','wet');}
  else if(k==='sweep')this.drops.push({x:box.x,y:box.y,magnet:true,value:0});
  else if(k==='coffee')this.drops.push({x:box.x,y:box.y,coffee:true,value:0});
  else this.drops.push({x:box.x,y:box.y,item:k,value:0});
  this.event('supply','MYSTERY BOX · '+ITEMS[k].name.toUpperCase());return k;}
 // A picked-up item: pocket items go in the pocket; with the pocket full, a random "now" item happens instead.
 gainItem(k){if(ITEMS[k].use==='pocket'){if(this.pocket.length<MYSTERY.pocket){this.pocket.push(k);this.event('pocket',ITEMS[k].name.toUpperCase()+' · IN YOUR POCKET');this.event('got',k);return k;}
   const swap=rollItem(this.random,NOW_ITEMS);this.useNow(swap,'POCKET FULL · '+ITEMS[swap].name.toUpperCase()+' INSTEAD');return swap;}
  this.useNow(k);return k;}
 useNow(k,note){if(k!=='bomb'&&k!=='horn'&&k!=='health'&&k!=='card')this.event('got',k);const p=this.player,say=t=>this.event(k==='coffee'?'coffee':k==='sweep'?'upgrade':k,note||t);
  if(k==='sweep'){this.magnetTime=5;say('CASH SWEEP · COLLECT IT ALL');}
  else if(k==='coffee'){this.caffeine=8;say('CAFFEINE RUSH · 8s OF SPEED + RAPID FIRE');}
  else if(k==='wet'){this.addPuddle(p.x,p.y);say('WET FLOOR · WATCH THEM SLIP');}
  else if(k==='freeze'){this.freezeAll();say('OUT OF ORDER · EVERYONE FREEZE');}
  else if(k==='bidet'){this.bidet=MYSTERY.bidetTime;say('EXECUTIVE BIDET · 5s OF PRESSURE');}
  else if(k==='bomb'||k==='horn'||k==='health'||k==='card'){this.pocket.push(k);this.usePocket(this.pocket.length-1);}}
 // The app pauses the run while Herman's first-time bubble is up, then counts back in like a promotion.
 intro(){if(this.state!=='playing'&&this.state!=='countdown')return false;this.state='intro';return true;}
 endIntro(){if(this.state!=='intro')return false;this.state='countdown';this.resumeLeft=RECOVERY_SECONDS;this.moving=false;return true;}
 // Build 32: Extra Hot Sauce with diminishing returns (see SURVIVAL.boost / boostTaper).
 boostTotal(){const S=SURVIVAL,n=this.boosts||0;return n?S.boost*(1-S.boostTaper**n)/(1-S.boostTaper):0;}
 // Executives, bosses and Middle Managers are "big": item effects push them less and never one-shot them.
 isBig(e){return !!(e.boss||e.type==='exec'||e.manager);}
 stepManagers(){const S=SURVIVAL;if(!this.endless||this.t<S.managerFrom)return;this.nextManagerAt??=S.managerFrom;if(this.t<this.nextManagerAt)return;
  this.nextManagerAt=this.t+Math.max(S.managerGapMin,S.managerGap-this.tier*S.managerGapTier);
  if(this.enemies.filter(e=>e.manager&&e.hp>0).length>=S.managerCap+this.tier*S.managerCapTier)return;
  const p=this.player,a=this.random()*Math.PI*2,x=clamp(p.x+Math.cos(a)*620,60,1740),y=clamp(p.y+Math.sin(a)*620,60,1740);
  const e=this.spawn('guard',x,y);e.manager=true;e.hp*=S.managerHP;e.max=e.hp;e.speed=S.managerSpeed;e.damage*=S.managerDamage;e.r=S.managerR;
  if(!this.managerSeen){this.managerSeen=true;this.event('manager','MIDDLE MANAGER · THEY DON\'T BUDGE · KEEP MOVING');}return e;}
 addPuddle(x,y){this.puddles.push({x,y,r:MYSTERY.puddleR,t:0,life:MYSTERY.puddleLife,seen:new Set()});}
 freezeAll(){for(const e of this.enemies)if(e.hp>0){e.frozen=Math.max(e.frozen||0,this.isBig(e)?MYSTERY.freezeBoss:MYSTERY.freeze);e.windup=0;e.dash=0;}}
 airHorn(){const p=this.player;this.fx.push({x:p.x,y:p.y,t:0,life:.5,r:MYSTERY.hornR,color:'#ffe08a'});
  for(const e of this.enemies){if(e.hp<=0)continue;const d=dist(e,p);if(d>MYSTERY.hornR)continue;const big=this.isBig(e),push=MYSTERY.hornPush*(big?.5:1),k=Math.max(1,d),v=2*push/MYSTERY.hornTime;
   // A shove that plays out over hornTime (fast, then easing off) instead of a jump.
   e.kb={vx:(e.x-p.x)/k*v,vy:(e.y-p.y)/k*v,t:MYSTERY.hornTime};if(!big){e.frozen=Math.max(e.frozen||0,MYSTERY.hornStun);e.windup=0;e.dash=0;}}}
 // Tap a pocket slot. Returns false when nothing happens (paused, empty slot, or already at full health).
 usePocket(i){if(this.state!=='playing')return false;const k=this.pocket[i];if(!k)return false;const p=this.player;
  if(k==='health'&&p.hp>=p.max){this.event('note','ALREADY AT FULL HEALTH');return false;}
  this.pocket.splice(i,1);
  if(k==='bomb'){this.dropBomb();this.event('deploy','');}
  else if(k==='horn'){this.airHorn();this.event('horn','AIR HORN');}
  else if(k==='health'){p.hp=p.max;this.event('heal','COMPANY HEALTH PLAN · FULLY HEALED');}
  else if(k==='card')this.openCard();
  return true;}
 // Company Credit Card: the game pauses on a menu of every common and uncommon item plus one rare, taking turns.
 openCard(){this.cardChoices=[...MYSTERY.cardCommon,MYSTERY.cardRares[this.cardUses%MYSTERY.cardRares.length]];this.cardUses++;this.state='card';this.event('card','COMPANY CREDIT CARD · PICK ANYTHING');}
 buyItem(k){if(this.state!=='card'||!this.cardChoices.includes(k))return false;this.cardChoices=[];this.state='countdown';this.resumeLeft=RECOVERY_SECONDS;this.moving=false;
  if(ITEMS[k].use==='pocket'&&this.pocket.length<MYSTERY.pocket){this.pocket.push(k);this.event('pocket',ITEMS[k].name.toUpperCase()+' · IN YOUR POCKET');this.event('got',k);}
  else{const was=this.state;this.state='playing';this.useNow(k);if(this.state==='playing')this.state=was;}return true;}
 stepMystery(dt){
  for(const u of this.puddles){u.t+=dt;for(const e of this.enemies){if(e.hp<=0||dist(e,u)>u.r+e.r*.5)continue;e.slowT=MYSTERY.slowFor;if(u.seen.has(e.id))continue;u.seen.add(e.id);
    if(!this.isBig(e)&&this.random()<MYSTERY.slipChance){this.numbers.push({x:e.x,y:e.y-24,text:'SLIP!',t:0,life:.8,color:'#ffe066'});this.fx.push({x:e.x,y:e.y,t:0,life:.4,r:30,color:'#ffe066'});e.flash=.12;this.hit(e,e.hp*99+1e6,'wet');}}}
  this.puddles=this.puddles.filter(u=>u.t<u.life);
  if(this.bidet>0){this.bidet=Math.max(0,this.bidet-dt);const p=this.player,f=this.face,hs=this.endless?this.healthScale():1;
   for(const e of this.combatTargets()){if(e.hp<=0)continue;const dx=e.x-p.x,dy=e.y-p.y,along=dx*f.x+dy*f.y,across=Math.abs(dx*f.y-dy*f.x);
    if(along<8||along>MYSTERY.bidetLength+e.r||across>MYSTERY.bidetWidth+e.r+along*.12)continue;
    if(e.type!=='supply'&&!this.isBig(e)){e.flash=.12;this.hit(e,e.hp*99+1e6,'bidet');}else this.hit(e,MYSTERY.bidetDps*hs*dt,'bidet');}}}
 hurtPlayer(amount,by,slam=false){if(this.player.inv>0||this.state!=='playing')return false;this.player.hp=Math.max(0,this.player.hp-amount);this.player.inv=.65;this.combo=0;this.comboTime=0;this.event('hurt','');if(this.player.hp===0){this.state='lost';this.killedBy=by?{type:by.type,boss:!!by.boss,slam}:null;this.event('end','Herman ran out of health. Spend Petty Cash on perks or try a different weapon build.');}return true;}
 bossSpot(distance=240){
  const p=this.player;let spot=null,best=-Infinity;
  for(let i=0;i<16;i++){let a=i*Math.PI/8,q={x:clamp(p.x+Math.cos(a)*distance,85,1715),y:clamp(p.y+Math.sin(a)*distance,85,1715)};resolveFurniture(q,38,this.furniture);let d=dist(p,q);if(d<distance-30)continue;let score=-Math.abs(d-distance)-Math.hypot(q.x-900,q.y-900)*.03;if(score>best){best=score;spot=q;}}
  return spot||{x:900,y:900};
 }
 addBoss(hp){const spot=this.bossSpot();let boss=this.spawn('exec',spot.x,spot.y,{hp});boss.boss=true;boss.attackCd=2;boss.navCd=0;boss.path=[];boss.slam=null;this.boss=boss;return boss;}
 beginBoss(){
  this.phase='boss';this.raids=[];this.spawnCd=2;
  this.addBoss();this.event('boss-arrive','DEFEAT THE BOSS TO CLEAR THE STAGE');
 }
 // Survival: the tier follows the clock, a boss joins the fight at every tier change (the swarm does not let up,
 // so stalling a boss buys nothing), and briefcase executives walk in between.
 stepSurvival(){const S=SURVIVAL;this.tier=Math.floor(this.t/S.tierSeconds);
  if(!this.bossWarning&&this.t>=this.nextBossAt-6){this.bossWarning=true;this.event('boss-warn','BOSS ARRIVES IN 6s · GET READY');}
  if(this.t>=this.nextBossAt){const n=Math.round(this.nextBossAt/S.tierSeconds);this.nextBossAt+=S.tierSeconds;this.bossWarning=false;this.addBoss(S.bossHP*(1+(n-1)*S.bossGrowth)*this.healthScale());for(const s of this.supplies)if(s.hp<=0){s.hp=s.max;s.flash=0;this.fx.push({x:s.x,y:s.y,t:0,life:.45,r:45,color:'#f2cd87'});}this.event('boss-arrive','TIER '+(this.tier+1)+' · SUPPLY BOXES RESTOCKED');}
  if(this.t>=this.nextExecAt){const spot=this.bossSpot(300);this.spawn('exec',spot.x,spot.y,{hp:(S.execHP+this.t*S.execHPPerSecond)*this.healthScale(),speed:S.execSpeed});this.execIndex++;this.nextExecAt=Math.floor(this.execIndex/S.execTimes.length)*S.tierSeconds+S.execTimes[this.execIndex%S.execTimes.length];this.event('exec-in','EXECUTIVE INCOMING · KO FOR A BRIEFCASE');}
 }
 spawnGap(){const S=SURVIVAL,t=this.t,held=S.spawnStart-S.rampHold*.0022,ramp=t<=S.rampHold?S.spawnStart-t*.0022:t>=S.rampDone?0:held+(S.spawnFloor-held)*(t-S.rampHold)/(S.rampDone-S.rampHold);return Math.max(S.spawnMin,S.spawnFloor-this.tier*S.tierSpawn,ramp)*(t<S.openingGrace?2:1);}
 // Survival: a rush never starts within rushBossGap seconds of a boss arriving. A held rush moves to just after.
 rushHeldForBoss(){if(!this.endless)return false;const S=SURVIVAL,next=this.nextBossAt,last=next-S.tierSeconds;if(next-this.t<S.rushBossGap){this.raidAt=next+S.rushBossGap;return true;}if(last>0&&this.t-last<S.rushBossGap){this.raidAt=last+S.rushBossGap;return true;}return false;}
 spawnKind(){const S=SURVIVAL;return this.t>S.runnerFrom&&this.random()<Math.min(.4,.28+this.tier*.03)?'runner':this.t>S.guardFrom&&this.random()<Math.min(.4,.22+this.tier*.04)?'guard':'worker';}
 healthScale(){const S=SURVIVAL;return S.tierHealth**(Math.max(0,Math.min(this.t,S.lateFrom)-S.healthFrom)/S.tierSeconds)*S.lateHealth**(Math.max(0,this.t-S.lateFrom)/S.tierSeconds);}
 easeScale(){const S=SURVIVAL,t=this.t,[a,b]=S.easeIn,[c,d]=S.easeOut;const w=t<=a||t>=d?0:t<b?(t-a)/(b-a):t<=c?1:(d-t)/(d-c);return 1-S.earlyEase*w;}
 kitHeal(){const S=SURVIVAL;return this.endless?Math.min(S.kitHealMax,S.kitHeal+this.tier*S.kitHealPerTier):16;}
 kitLife(){return this.endless?SURVIVAL.kitLife:20;}
 stepBoss(boss,dt){
  const p=this.player;
  if(boss.slam){boss.slam.t+=dt;if(boss.slam.t>=boss.slam.fuse){const a=boss.slam;this.fx.push({x:a.x,y:a.y,t:0,life:.4,r:a.r,color:'#ff8664'});this.event('slam',''); /* boss slam lands */if(dist(p,a)<a.r+15)this.hurtPlayer(22*(this.endless?1+this.tier*SURVIVAL.tierDamage:1),boss,true);boss.slam=null;boss.attackCd=this.stage.slamCooldown;this.bossAttacks=[];}return;}
  boss.attackCd-=dt;
  if(boss.attackCd<=0&&dist(boss,p)<330){boss.slam={x:p.x,y:p.y,t:0,fuse:1.1,r:this.stage.slamRadius};this.bossAttacks=[boss.slam];return;}
  boss.navCd-=dt;
  if(boss.navCd<=0){resolveFurniture(boss,boss.r+3,this.furniture);boss.path=bossPath(boss,p,this.furniture,boss.r+2);boss.navCd=.45;}
  while(boss.path.length&&dist(boss,boss.path[0])<5)boss.path.shift();
  const next=boss.path[0];if(next){const d=dist(boss,next),slow=this.clouds.some(c=>c.slow&&dist(boss,c)<c.r)?.55:1,move=Math.min(d,boss.speed*dt*slow);if(d>0){boss.x+=(next.x-boss.x)/d*move;boss.y+=(next.y-boss.y)/d*move;}}
  boss.x=clamp(boss.x,65,1735);boss.y=clamp(boss.y,65,1735);
 }
 combatTargets(){return [...this.enemies,...this.supplies.filter(s=>s.hp>0)];}
 movementSpeed(){return 180*(1+this.passives.speed*.1)*(this.caffeine>0?1.25:1);}
 step(dt,input={x:0,y:0}){if(this.state==='countdown'){this.resumeLeft=Math.max(0,this.resumeLeft-dt);if(this.resumeLeft<.00001){this.resumeLeft=0;this.state='playing';}return;}if(this.state!=='playing')return;dt=Math.min(dt,.05);this.caffeine=Math.max(0,this.caffeine-dt);for(const s of this.supplies){s.flash=Math.max(0,s.flash-dt);s.hit=Math.max(0,s.hit-dt);if(s.hp<=0&&s.refillAt&&this.t>=s.refillAt){s.hp=s.max;s.refillAt=0;this.fx.push({x:s.x,y:s.y,t:0,life:.45,r:45,color:'#f2cd87'});}}this.t+=dt;this.comboTime-=dt;if(this.comboTime<=0)this.combo=0;this.magnetTime=Math.max(0,this.magnetTime-dt);let p=this.player,oldX=p.x,oldY=p.y;let len=Math.hypot(input.x,input.y);if(len>.04){let dx=input.x/Math.max(1,len),dy=input.y/Math.max(1,len);p.x=clamp(p.x+dx*this.movementSpeed()*dt,65,1735);p.y=clamp(p.y+dy*this.movementSpeed()*dt,65,1735);this.face={x:dx/Math.hypot(dx,dy),y:dy/Math.hypot(dx,dy)};}resolveFurniture(p,18,this.furniture);let moved=Math.hypot(p.x-oldX,p.y-oldY);this.walkDistance+=moved;this.moving=moved>.005;if(Math.abs(p.x-oldX)>.005)this.facingX=p.x>oldX?1:-1;p.inv=Math.max(0,p.inv-dt);
 if(!this.bombHint&&this.t>=8){this.bombHint=true;this.event('tip','STINK BOMB: DROP IT, THEN MOVE AWAY.');}
 if(this.endless)this.stepSurvival();
 else{if(!this.bossWarning&&this.t>=this.stage.survival-6){this.bossWarning=true;this.event('boss-warn','BOSS ARRIVES IN 6s · GET READY');}
 if(this.phase==='survival'&&this.t>=this.stage.survival)this.beginBoss();}
 this.spawnCd-=dt;if(this.spawnCd<=0&&this.enemies.length<(this.endless?Math.min(SURVIVAL.capMax,SURVIVAL.enemyCap+this.tier*SURVIVAL.tierCap):this.phase==='boss'?70:240)){this.spawnCd=this.endless?this.spawnGap():this.phase==='boss'?1.2:Math.max(.12,.45-this.t*.0022)*(this.t<30?2-this.t/30:1);let a=this.random()*Math.PI*2,r=(this.t<8?260:360)+this.random()*70;let type=this.endless?this.spawnKind():this.t>10&&this.random()<.28?'runner':this.t>25&&this.random()<.22?'guard':'worker';let sx=clamp(p.x+Math.cos(a)*r,45,1755),sy=clamp(p.y+Math.sin(a)*r,45,1755);if(Math.hypot(sx-p.x,sy-p.y)<230){a=Math.atan2(900-p.y,900-p.x);sx=clamp(p.x+Math.cos(a)*r,45,1755);sy=clamp(p.y+Math.sin(a)*r,45,1755);}this.spawn(type,sx,sy);}
 if(this.phase==='survival'&&this.t>=this.raidAt&&!this.rushHeldForBoss()){this.raidAt+=this.endless?(this.t>=SURVIVAL.rushLateFrom?SURVIVAL.rushGapLate:SURVIVAL.rushGap):22;this.raids.push({x:p.x,y:p.y,t:0,gap:this.random()*Math.PI*2});this.event('rush','CORPORATE RUSH · FIND THE GAP · SURVIVE FOR A FIRST AID KIT');}
 for(let raid of this.raids){raid.t+=dt;if(raid.t>=1.4&&!raid.done){raid.done=true;this.rushCount++;this.kitDrops.push({at:this.t+6,count:(this.endless?this.tier>=SURVIVAL.kitsFromTier:this.t>=170)?2:1});let count=12+Math.floor(this.t/20);if(this.endless)count=Math.min(SURVIVAL.rushMax,count);for(let i=0;i<count;i++){let a=raid.gap+.65+i/(count-1)*(Math.PI*2-1.3);this.spawn(i%4===0?'runner':'worker',clamp(raid.x+Math.cos(a)*340,45,1755),clamp(raid.y+Math.sin(a)*340,45,1755));}}}this.raids=this.raids.filter(r=>!r.done);for(let k of this.kitDrops){if(this.t<k.at||k.done)continue;k.done=true;let base=this.random()*Math.PI*2;for(let i=0;i<k.count;i++){let a=base+i*Math.PI;this.drops.push({x:clamp(p.x+Math.cos(a)*220,80,1720),y:clamp(p.y+Math.sin(a)*220,80,1720),heal:true,value:0,life:this.kitLife()});}this.event('supply',k.count>1?'RUSH SURVIVED · 2 FIRST AID KITS DROPPED':'RUSH SURVIVED · FIRST AID KIT DROPPED');}this.kitDrops=this.kitDrops.filter(k=>!k.done);
 for(let k in this.cd)this.cd[k]-=dt;let rate=(1-this.passives.coffee*.08)*(this.caffeine>0?.65:1);
 let l=this.weapons.plunger;if(l&&this.cd.plunger<=0){this.cd.plunger=Math.max(.38,1.0-l*.11)*rate;let target=this.enemies.filter(e=>e.hp>0&&dist(e,p)<260).sort((a,b)=>dist(a,p)-dist(b,p))[0]||this.supplies.filter(e=>e.hp>0&&dist(e,p)<260).sort((a,b)=>dist(a,p)-dist(b,p))[0]||this.enemies.filter(e=>e.hp>0).sort((a,b)=>dist(a,p)-dist(b,p))[0];let angle=target?Math.atan2(target.y-p.y,target.x-p.x):Math.atan2(this.face.y,this.face.x);let count=l===6?6:1+Math.floor(l/2);for(let i=0;i<count;i++){let a=angle+(i-(count-1)/2)*.26;this.shots.push({x:p.x,y:p.y,sx:p.x,sy:p.y,dx:Math.cos(a),dy:Math.sin(a),big:l===6,t:0,returning:false,hit:new Set(),damage:l===6?115:20+l*9});}
  this.event('throw',''); // Plungerang thrown
 }
 l=this.weapons.gas;if(l&&this.cd.gas<=0){this.cd.gas=Math.max(.5,1.5-l*.15)*rate;{const r=l===6?130:36+l*10,near=this.clouds.find(c=>c.r===r&&dist(c,p)<r*.6);if(near)near.t=0;else this.clouds.push({x:p.x,y:p.y,t:0,life:l===6?8:2.8+l*.6,r,dps:l===6?75:9+l*5,slow:l===6});}
  this.event('puff',''); // gas cloud dropped
 }
 l=this.weapons.flush;if(l&&this.cd.flush<=0){this.cd.flush=(5.5-l*.5)*rate;this.waves.push({x:p.x,y:p.y,t:0,life:.65,max:l===6?370:100+l*25,hit:new Set(),damage:l===6?160:20+l*12,royal:l===6});if(l===6)this.waves.push({x:p.x,y:p.y,t:-.4,life:.65,max:370,hit:new Set(),damage:100,royal:true});this.event('flush','');}
 for(let b of this.bombs){b.t+=dt;if(b.t>=b.fuse&&!b.done){b.done=true;let before=this.kills;for(let e of this.combatTargets())if(dist(e,b)<b.blast+e.r)this.hit(e,b.damage,'bomb');this.fx.push({x:b.x,y:b.y,t:0,life:.6,r:b.blast,color:'#c7f76b'});this.bombKills+=this.kills-before;if(this.kills>before)this.numbers.push({x:b.x,y:b.y-45,text:(this.kills-before)+' KOs!',t:0,life:1.2,color:'#e2ff92',big:true});this.event('boom',this.kills-before>=5?(this.kills-before)+' IN ONE BLAST!':'');if(b.level===6)this.waves.push({x:b.x,y:b.y,t:-.5,life:.6,max:b.blast*1.2,hit:new Set(),damage:b.damage*.7,royal:true});}}
 this.bombs=this.bombs.filter(b=>!b.done);
 for(let e of this.enemies){if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-dt);e.hit=Math.max(0,e.hit-dt);if(e.slowT>0)e.slowT=Math.max(0,e.slowT-dt);if(e.kb){const f=e.kb.t/MYSTERY.hornTime,s=Math.min(dt,e.kb.t);e.x=clamp(e.x+e.kb.vx*f*s,35,1765);e.y=clamp(e.y+e.kb.vy*f*s,35,1765);resolveFurniture(e,e.r,this.furniture);e.kb.t-=dt;if(e.kb.t<=0)e.kb=null;}if(e.frozen>0){e.frozen=Math.max(0,e.frozen-dt);continue;}let target=p;e.attracted=false;if(e.type!=='exec'){let near=this.bombs.filter(b=>dist(e,b)<b.lure).sort((a,b)=>dist(e,a)-dist(e,b))[0];if(near){target=near;e.attracted=true;}}let d=dist(e,target);let charging=false;
 if(e.boss){this.stepBoss(e,dt);if(this.state==='lost')return;charging=true;}
 if(e.type==='runner'){
 if(e.attracted){e.windup=0;e.dash=0;e.chargeCd=Math.max(e.chargeCd,1);}
 else if(e.windup>0){charging=true;e.windup=Math.max(0,e.windup-dt);if(e.windup===0)e.dash=.48;}
 else if(e.dash>0){charging=true;e.dash=Math.max(0,e.dash-dt);e.x=clamp(e.x+e.aim.x*290*dt,35,1765);e.y=clamp(e.y+e.aim.y*290*dt,35,1765);}
 else{e.chargeCd-=dt;if(e.chargeCd<=0&&d<280&&d>50){e.aim={x:(p.x-e.x)/d,y:(p.y-e.y)/d};e.windup=.7;e.chargeCd=4.2;charging=true;this.event('charge',''); /* runner winds up: warning huff */}}
 }
 if(!charging&&d>7){let slow=(this.clouds.some(c=>c.slow&&dist(e,c)<c.r)?.55:1)*(e.slowT>0?MYSTERY.slow:1);e.x+=(target.x-e.x)/d*e.speed*dt*slow;e.y+=(target.y-e.y)/d*e.speed*dt*slow;}
 resolveFurniture(e,e.r,this.furniture);
 if(dist(e,p)<e.r+15&&this.hurtPlayer(e.damage,e)){let d=Math.max(1,dist(e,p));e.x-=(p.x-e.x)/d*22;e.y-=(p.y-e.y)/d*22;if(this.state==='lost')return;}
 }
 if(this.endless)this.bossAttacks=this.enemies.filter(e=>e.boss&&e.hp>0&&e.slam).map(e=>e.slam);
 for(let s of this.shots){s.t+=dt;if(s.t>.5&&!s.returning){s.returning=true;s.hit.clear();}if(!s.returning){s.x+=s.dx*460*dt;s.y+=s.dy*460*dt;}else{let d=dist(s,p);s.x+=(p.x-s.x)/Math.max(1,d)*520*dt;s.y+=(p.y-s.y)/Math.max(1,d)*520*dt;if(d<20)s.dead=true;}for(let e of this.combatTargets())if(e.hp>0&&!s.hit.has(e.id)&&dist(e,s)<e.r+12){s.hit.add(e.id);this.hit(e,s.damage,'plunger');}}
 this.shots=this.shots.filter(s=>!s.dead&&s.t<1.8);
 l=this.weapons.tp;this.orbits=[];if(l){for(let i=0;i<(l===6?12:l+1);i++){let a=this.t*(1.8+l*.16)*(l===6&&i>=6?-1:1)+i*Math.PI*2/(l===6?6:l+1);let radius=l===6?(i<6?75:125):61+l*5;let o={x:p.x+Math.cos(a)*radius,y:p.y+Math.sin(a)*radius};this.orbits.push(o);for(let e of this.combatTargets())if(e.hp>0&&e.hit===0&&dist(e,o)<e.r+14){this.hit(e,12+l*7,'tp');e.hit=l===6?.55:.35;let d=Math.max(1,dist(e,p));if(e.type!=='supply'&&!e.manager){const kb=l===6?6:10;e.x+=(e.x-p.x)/d*kb;e.y+=(e.y-p.y)/d*kb;}}}}
 for(let c of this.clouds){c.t+=dt;for(let e of this.combatTargets())if(e.hp>0&&dist(e,c)<c.r+e.r)this.hit(e,c.dps*dt,'gas');}this.clouds=this.clouds.filter(c=>c.t<c.life);this.stepMystery(dt);this.stepManagers();
 for(let w of this.waves){w.t+=dt;if(w.t<0)continue;let r=w.max*w.t/w.life;for(let e of this.combatTargets())if(e.hp>0&&!w.hit.has(e.id)&&dist(e,w)<r+e.r){w.hit.add(e.id);this.hit(e,w.damage,'flush');let d=Math.max(1,dist(e,w));let force=e.type==='supply'?0:e.type==='exec'||e.manager?12:55;e.x=clamp(e.x+(e.x-w.x)/d*force,30,1770);e.y=clamp(e.y+(e.y-w.y)/d*force,30,1770);}}this.waves=this.waves.filter(w=>w.t<w.life);
 for(let d of this.drops){if(d.heal){if(d.life!=null){d.life-=dt;if(d.life<=0){d.taken=true;continue;}}if(p.hp>p.max-8)continue;}let r=dist(d,p);if(r<100+this.passives.magnet*35+(this.perks.pickup||0)*20||this.magnetTime>0&&!d.chest&&!d.heal&&!d.coffee&&!d.item){d.x+=(p.x-d.x)/Math.max(1,r)*300*dt;d.y+=(p.y-d.y)/Math.max(1,r)*300*dt;}if(r<23){d.taken=true;if(d.item){this.gainItem(d.item);}else if(d.chest){this.pendingBriefcases++;}else if(d.magnet){this.magnetTime=5;this.event('upgrade','CASH SWEEP · COLLECT IT ALL');this.event('got','sweep');}else if(d.coffee){this.caffeine=8;this.event('coffee','CAFFEINE RUSH · 8s OF SPEED + RAPID FIRE');this.event('got','coffee');}else if(d.heal){p.hp=Math.min(p.max,p.hp+this.kitHeal());this.healCount++;this.event('heal',''); /* Herman's relieved ahh */}else{this.tokens+=d.value;this.xp+=d.value*(1+this.passives.magnet*.1)*(this.endless?SURVIVAL.promoRate:1);if(!this.events.some(e=>e.type==='pickup'))this.event('pickup','');}}}this.drops=this.drops.filter(d=>!d.taken);if(this.drops.length>500){let loose=this.drops.filter(d=>!d.heal&&!d.chest&&!d.magnet&&!d.coffee&&!d.item);if(loose.length>1){loose[1].value+=loose[0].value;this.drops.splice(this.drops.indexOf(loose[0]),1);}}
 for(let n of this.numbers)n.t+=dt;this.numbers=this.numbers.filter(n=>n.t<n.life);this.enemies=this.enemies.filter(e=>e.hp>0);for(let f of this.fx)f.t+=dt;this.fx=this.fx.filter(f=>f.t<f.life);
 if(this.endless)this.boss=this.enemies.find(e=>e.boss)||null;
 if(this.phase==='boss'&&this.bossDefeated&&this.state==='playing'){this.state='won';this.bossAttacks=[];this.event('end',this.stage.clear);return;}this.levelCheck();}
}
