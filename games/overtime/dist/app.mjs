import {MODES,SURVIVAL_ID,stageFor,canPlayStage} from './stages.mjs';
import {paintOffice,paintLobby} from './scene.mjs';
import {PERKS,fresh,normalize,buy,cost,settle} from './progress.mjs';
import {Game,WEAPONS,PASSIVES,EVOLUTIONS,RECOVERY_SECONDS,SURVIVAL,clamp} from './engine.mjs';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const brandPortrait=new Image();brandPortrait.src='assets/herman-brand.jpg';const herman=new Image();herman.src='assets/herman-battle.png';const hermanWalk=new Image();hermanWalk.src='assets/herman-walk.png';const enemySheet=new Image();enemySheet.src='assets/corporate-sprites.png';let g=null,W=0,H=0,scale=1,cam={x:900,y:900},keys={},stick=null,muted=false,audioCtx,toastUntil=0,last=performance.now(),lastUI=0,shake=0,wonBest=0;
try{wonBest=Number(localStorage.getItem('pp-overtime-best')||0);}catch{}$('best').textContent=wonBest?'BEST: '+wonBest+' KOs':'';
let selectedStage=1;let progress=fresh();try{progress=normalize(JSON.parse(localStorage.getItem('pp-overtime-progress')||'null'));}catch{}
// Build 19: the menu lists MODES (both stages plus survival) and remembers the last one picked.
try{const saved=Number(localStorage.getItem('pp-overtime-mode'));if(MODES.some(m=>m.id===saved)&&canPlayStage(progress,saved))selectedStage=saved;}catch{}
function selectMode(id){selectedStage=id;try{localStorage.setItem('pp-overtime-mode',String(id));}catch{}}
const modeNumber=stage=>stage.endless?'∞':String(stage.id).padStart(2,'0');
function saveProgress(){try{localStorage.setItem('pp-overtime-progress',JSON.stringify(progress));}catch{$('saveNote').textContent='Browser storage is unavailable. Progress lasts for this session only.';}}
function updateProgress(){ cardStage=selectedStage; renderStagePicker(); $('bank').textContent=progress.credits;$('nextGoal').textContent=progress.kills<200?`NEXT UNLOCK: TP Tornado start · ${progress.kills}/200 lifetime KOs`:progress.wins<1?'NEXT UNLOCK: Corporate Lobby + Gas start · Clear the office':progress.clearedStages.includes(2)?'BOTH STAGES CLEARED · TRY A NEW BUILD':'CORPORATE LOBBY UNLOCKED · SELECT STAGE 02';}
function renderStagePicker(){
 $('stagePicker').innerHTML='';
 for(let stage of MODES){let b=document.createElement('button');b.className='stage-option'+(selectedStage===stage.id?' selected':'');b.disabled=!canPlayStage(progress,stage.id);b.setAttribute('aria-pressed',String(selectedStage===stage.id));b.textContent=modeNumber(stage)+' · '+stage.name+(b.disabled?' · LOCKED':progress.clearedStages.includes(stage.id)?' ✓':'');b.onclick=()=>{selectMode(stage.id);renderStagePicker();};$('stagePicker').append(b);}
 const stage=stageFor(selectedStage);$('stageNumber').textContent=modeNumber(stage);$('briefingTitle').textContent=stage.name+': '+stage.subtitle;$('briefingText').textContent=stage.briefing;
 renderStageCard();
}
// Nov 7 menu: one stage card with arrows. Browsing to a locked stage shows how to unlock it and disables CLOCK IN.
let cardStage=null;
function renderStageCard(){
 if(cardStage==null||!MODES.some(st=>st.id===cardStage))cardStage=selectedStage;
 const index=MODES.findIndex(st=>st.id===cardStage),stage=MODES[index],unlocked=canPlayStage(progress,stage.id);
 $('stageNumber').textContent=modeNumber(stage);
 $('stageName').textContent=stage.name.toUpperCase();
 $('stageCard').classList.toggle('long-name',stage.name.length>18);
 $('stageNote').textContent=stage.endless
  ?'Endless · '+(progress.bestSurvival?'Your best: '+format(progress.bestSurvival):'How long can you last?')
  :unlocked
  ?(progress.clearedStages.includes(stage.id)?'CLEARED ✓ · ':'')+'Survive '+Math.round(stage.survival/60)+' min · Beat the boss'
  :'🔒 Clear '+(MODES[index-1]?MODES[index-1].name:'the previous stage')+' to unlock';
 $('stageCard').classList.toggle('locked',!unlocked);
 $('startBtn').disabled=!unlocked;
 const browse=step=>()=>{cardStage=MODES[(index+step+MODES.length)%MODES.length].id;if(canPlayStage(progress,cardStage))selectMode(cardStage);renderStagePicker();};
 $('stagePrev').onclick=browse(-1);$('stageNext').onclick=browse(1);
 $('stagePrev').hidden=$('stageNext').hidden=MODES.length<2;
}
function workshop(){$('recovery').hidden=true;for(let id of ['start','end','upgrade','pauseScreen','hud','bombBtn','loadout','combo','boost'])$(id).hidden=true;g=null;$('workshop').hidden=false;$('workBank').textContent=progress.credits;$('perkChoices').innerHTML='';for(let [k,v] of Object.entries(PERKS)){let rank=progress.perks[k],b=document.createElement('button');b.className='choice';b.disabled=rank>=3||progress.credits<cost(rank);b.innerHTML=`<span class="icon">${iconFor(k,v.icon)}</span><div><strong>${v.name} · ${rank}/3</strong><p>${v.desc}</p><small>${rank===3?'MAXED':cost(rank)+' PETTY CASH'}</small></div>`;b.onclick=()=>{if(buy(progress,k)){saveProgress();workshop();sound('upgrade');}};$('perkChoices').append(b);}$('starts').innerHTML='';for(let k of ['plunger','tp','gas']){let unlocked=k==='plunger'||k==='tp'&&progress.kills>=200||k==='gas'&&progress.wins>=1;let b=document.createElement('button');b.className='loadoutChoice'+(progress.start===k?' selected':'');b.disabled=!unlocked;b.innerHTML=iconFor(k,WEAPONS[k].icon)+' '+WEAPONS[k].name+(unlocked?'':k==='tp'?' · 200 KOs':' · 1 victory');b.onclick=()=>{progress.start=k;saveProgress();workshop();};$('starts').append(b);}$('hardMode').disabled=progress.wins<1;$('hardLock').textContent=progress.wins<1?'Unlock: win a mission':'Faster, tougher enemies';}
$('perksBtn').onclick=workshop;$('endPerks').onclick=workshop;$('workBack').onclick=()=>{$('workshop').hidden=true;$('start').hidden=false;updateProgress();};updateProgress();
// Build 13: Plungerang and TP Tornado icons are drawn in the game's own art instead of emoji, which some phones can't show.
const ICON_ART={};{const mk=f=>{let c=document.createElement('canvas');c.width=c.height=96;let x=c.getContext('2d');x.translate(48,48);f(x);return c.toDataURL();};
 const plungerArt=x=>{x.lineCap='round';x.strokeStyle='#7a5a36';x.lineWidth=12;x.beginPath();x.moveTo(-34,0);x.lineTo(10,0);x.stroke();x.strokeStyle='#d9b07a';x.lineWidth=8;x.beginPath();x.moveTo(-34,0);x.lineTo(10,0);x.stroke();x.fillStyle='#b8423a';x.beginPath();x.ellipse(18,0,14,26,0,0,Math.PI*2);x.fill();x.fillStyle='#e25a4a';x.beginPath();x.ellipse(16,0,11,22,0,0,Math.PI*2);x.fill();x.fillStyle='#f39a73';x.beginPath();x.roundRect(27,-26,8,52,3);x.fill();};
 ICON_ART.plunger=mk(x=>{x.rotate(-Math.PI/4);plungerArt(x);});
 ICON_ART.plunger2=mk(x=>{for(const a of [-Math.PI*3/4,-Math.PI/4]){x.save();x.translate(a<-Math.PI/2?-12:12,10);x.rotate(a);x.scale(.7,.7);plungerArt(x);x.restore();}});
 ICON_ART.tp=mk(x=>{x.fillStyle='#a8baba';x.beginPath();x.roundRect(-27,-33,54,68,14);x.fill();x.fillStyle='#f4f7ef';x.beginPath();x.roundRect(-24,-30,48,62,12);x.fill();x.fillStyle='#cfdad4';x.beginPath();x.ellipse(0,-15,19,11,0,0,Math.PI*2);x.fill();x.fillStyle='#3b5355';x.beginPath();x.ellipse(0,-15,7,4,0,0,Math.PI*2);x.fill();x.fillStyle='#f4f7ef';x.beginPath();x.moveTo(-24,14);x.lineTo(-24,40);x.lineTo(-4,34);x.lineTo(-4,22);x.closePath();x.fill();});
 ICON_ART.magnet=mk(x=>{x.lineCap='butt';x.strokeStyle='#8f2323';x.lineWidth=24;x.beginPath();x.moveTo(-22,20);x.lineTo(-22,-6);x.arc(0,-6,22,Math.PI,0);x.lineTo(22,20);x.stroke();x.strokeStyle='#e04545';x.lineWidth=17;x.beginPath();x.moveTo(-22,20);x.lineTo(-22,-6);x.arc(0,-6,22,Math.PI,0);x.lineTo(22,20);x.stroke();x.fillStyle='#7d8a90';x.fillRect(-35,18,26,18);x.fillRect(9,18,26,18);x.fillStyle='#e3eaee';x.fillRect(-33,20,22,13);x.fillRect(11,20,22,13);});}
const magnetImg=new Image();magnetImg.src=ICON_ART.magnet;
// Nov 7: Johnny's custom icon set (assets/icons) replaces the emoji and drawn icons on cards, badges and buttons.
// Evolved weapons use the weapon key plus "2" (plunger2, tp2, gas2, flush2, bomb2). The drawn magnet stays for the map pickup.
const ICON_FILES={
 plunger:'assets/icons/plunger.webp',tp:'assets/icons/tp.webp',gas:'assets/icons/gas.webp',flush:'assets/icons/flush.webp',bomb:'assets/icons/bomb.webp',
 plunger2:'assets/icons/plunger2.webp',tp2:'assets/icons/tp2.webp',gas2:'assets/icons/gas2.webp',flush2:'assets/icons/flush2.webp',bomb2:'assets/icons/bomb2.webp',
 speed:'assets/icons/speed.webp',coffee:'assets/icons/coffee.webp',magnet:'assets/icons/magnet.webp',chili:'assets/icons/chili.webp',
 health:'assets/icons/health.webp',damage:'assets/icons/damage.webp',pickup:'assets/icons/pickup.webp',heal:'assets/icons/heal.webp',
};
function iconFor(k,fallback){
 if(ICON_FILES[k])return `<img class="art-icon" src="${ICON_FILES[k]}" alt="">`;
 if(k==='pickup')k='magnet';
 return ICON_ART[k]?`<img class="art-icon" src="${ICON_ART[k]}" alt="">`:fallback;
}
$('bombBtn').querySelector('span').innerHTML=iconFor('bomb','💣');
// The engine's own 'deploy' event plays the drop sound, so the button no longer plays it a second time.
function triggerBomb(){if(g?.useBomb())updateUI();}
$('bombBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();triggerBomb();});$('bombBtn').addEventListener('click',e=>{if(e.detail===0)triggerBomb();});
function resize(){let r=canvas.getBoundingClientRect();W=r.width;H=r.height;let d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);scale=Math.min(W/570,H/850);}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>setTimeout(resize,250));if(window.visualViewport)visualViewport.addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(()=>resize()).observe(canvas);window.addEventListener('pageshow',resize);resize();
// Build 11: ElevenLabs sound effects (decoded once, after the first tap that turns sound on). Synth beeps stay as a fallback.
const SFX_FILES={coin:'assets/sfx/coin.mp3','hit-1':'assets/sfx/hit-1.mp3','hit-2':'assets/sfx/hit-2.mp3','hit-3':'assets/sfx/hit-3.mp3','hit-4':'assets/sfx/hit-4.mp3','bomb-drop':'assets/sfx/bomb-drop.mp3','fart-blast':'assets/sfx/fart-blast.mp3',flush:'assets/sfx/flush.mp3','cha-ching':'assets/sfx/cha-ching.mp3',stamp:'assets/sfx/stamp.mp3','power-up':'assets/sfx/power-up.mp3',siren:'assets/sfx/siren.mp3',boss:'assets/sfx/boss.mp3','box-pop':'assets/sfx/box-pop.mp3',victory:'assets/sfx/victory.mp3','sad-trombone':'assets/sfx/sad-trombone.mp3',
 // Nov 7: per-weapon hits, knockout impacts and new moments (picked ElevenLabs takes plus Johnny's own clips, trimmed and leveled)
 'hit-plunger':'assets/sfx/hit-plunger.mp3','hit-tp':'assets/sfx/hit-tp.mp3','hit-gas':'assets/sfx/hit-gas.mp3','hit-flush':'assets/sfx/hit-flush.mp3','hit-boss':'assets/sfx/hit-boss.mp3',
 'ko-1':'assets/sfx/ko-1.mp3','ko-2':'assets/sfx/ko-2.mp3','ko-3':'assets/sfx/ko-3.mp3','ko-4':'assets/sfx/ko-4.mp3','ko-5':'assets/sfx/ko-5.mp3',
 'plunger-throw':'assets/sfx/plunger-throw.mp3','gas-puff':'assets/sfx/gas-puff.mp3','runner-charge':'assets/sfx/runner-charge.mp3','boss-slam':'assets/sfx/boss-slam.mp3',
 'heal-1':'assets/sfx/heal-1.mp3','heal-2':'assets/sfx/heal-2.mp3',coffee:'assets/sfx/coffee.mp3',heartbeat:'assets/sfx/heartbeat.mp3',combo:'assets/sfx/combo.mp3',
};
const SFX={pickup:['coin'],hurt:['hit-1','hit-2','hit-3','hit-4'],deploy:['bomb-drop'],boom:['fart-blast'],flush:['flush'],level:['cha-ching'],upgrade:['stamp'],evolve:['power-up'],alert:['siren'],exec:['boss'],supply:['box-pop'],win:['victory'],lose:['sad-trombone'],
 'hit-plunger':['hit-plunger'],'hit-tp':['hit-tp'],'hit-gas':['hit-gas'],'hit-flush':['hit-flush'],'hit-boss':['hit-boss'],
 ko:['ko-1','ko-2','ko-3','ko-4','ko-5'],throw:['plunger-throw'],puff:['gas-puff'],charge:['runner-charge'],slam:['boss-slam'],
 heal:['heal-1','heal-2'],coffee:['coffee'],heartbeat:['heartbeat'],combo:['combo'],
};
// These moments are new, so they stay silent until their sound has loaded instead of playing the fallback beep.
const SILENT_UNTIL_LOADED=new Set(['hit-plunger','hit-tp','hit-gas','hit-flush','hit-boss','ko','throw','puff','charge','slam','heal','coffee','heartbeat','combo']);
// vol = loudness, gap = shortest time (seconds) between two plays of the same sound, jitter = random pitch change.
// Frequent sounds (hits, knockouts, throws) are quieter, rate-limited and pitch-varied so they never machine-gun.
const SFX_MIX={
 'hit-plunger':{vol:.42,gap:.07,jitter:.08},'hit-tp':{vol:.55,gap:.08,jitter:.08},'hit-gas':{vol:.26,gap:.3,jitter:.06},'hit-flush':{vol:.45,gap:.08,jitter:.07},'hit-boss':{vol:.7,gap:.12,jitter:.05},
 ko:{vol:.5,gap:.1,jitter:.09},throw:{vol:.22,gap:.15,jitter:.05},puff:{vol:.35,gap:.4,jitter:.08},charge:{vol:.55,gap:.6,jitter:.05},slam:{vol:.9,gap:.3},
 heal:{vol:.9,gap:.3},coffee:{vol:.8,gap:.5},heartbeat:{vol:.75,gap:1},combo:{vol:.8,gap:1},deploy:{vol:.8,gap:.25},
 pickup:{vol:.28,gap:.06,jitter:.06},hurt:{vol:.85,gap:.3},flush:{vol:.6,gap:.4},boom:{vol:.9,gap:.15},alert:{vol:.6,gap:1},upgrade:{vol:.7},level:{vol:.75}};
let sfxBuffers={},sfxLoading=null,sfxLast={},hitTurn=0;
function loadSfx(){if(sfxLoading||!audioCtx)return;sfxLoading=Promise.all(Object.entries(SFX_FILES).map(async([k,u])=>{try{let r=await fetch(u);sfxBuffers[k]=await audioCtx.decodeAudioData(await r.arrayBuffer());}catch{}}));}
function playSample(type){let names=SFX[type];if(!names)return false;let mix=SFX_MIX[type]||{},now=audioCtx.currentTime;if(now-(sfxLast[type]??-9)<(mix.gap||0))return true;// Herman's hurt clips rotate in order; any other sound with several takes picks one at random.
 let name=type==='hurt'?names[hitTurn%names.length]:names[Math.floor(Math.random()*names.length)],buf=sfxBuffers[name];if(!buf)return SILENT_UNTIL_LOADED.has(type);if(type==='hurt')hitTurn++;sfxLast[type]=now;let src=audioCtx.createBufferSource(),v=audioCtx.createGain();src.buffer=buf;if(mix.jitter)src.playbackRate.value=1+(Math.random()*2-1)*mix.jitter;v.gain.value=mix.vol??.8;src.connect(v);v.connect(audioCtx.destination);src.start();return true;}
function sound(type){if(muted)return;try{audioCtx||=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();loadSfx();if(playSample(type))return;let o=audioCtx.createOscillator(),v=audioCtx.createGain();o.connect(v);v.connect(audioCtx.destination);let t=audioCtx.currentTime;let freq={boom:75,level:540,upgrade:700,hurt:130,flush:210,exec:850,alert:380,evolve:1100,deploy:180,pickup:950,win:880,lose:160}[type]||360;o.type=type==='boom'?'sawtooth':'sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(type==='level'?1000:Math.max(30,freq*.4),t+.18);v.gain.setValueAtTime(type==='pickup'?.009:.045,t);v.gain.exponentialRampToValueAtTime(.001,t+.22);o.start(t);o.stop(t+.23);}catch{}}
try{muted=localStorage.getItem('pp-overtime-sound')==='off';}catch{}// The menu's sound button is a speaker icon; the pause screen keeps its text label.
const SPEAKER_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const SPEAKER_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="m16 9 6 6M22 9l-6 6"/></svg>';
function soundLabel(){let t=muted?'🔇 SOUND OFF':'🔊 SOUND ON';$('sound').innerHTML=muted?SPEAKER_OFF:SPEAKER_ON;$('sound').setAttribute('aria-label',muted?'Sound is off. Tap to turn on':'Sound is on. Tap to turn off');$('soundPause').textContent=t;}function toggleSound(){muted=!muted;try{localStorage.setItem('pp-overtime-sound',muted?'off':'on');}catch{}soundLabel();sound('upgrade');}soundLabel();$('sound').onclick=toggleSound;$('soundPause').onclick=toggleSound;
function begin(){$('recovery').hidden=true;if(!canPlayStage(progress,selectedStage))selectedStage=1;sound('upgrade');g=new Game(Math.random,progress.perks,selectedStage!==SURVIVAL_ID&&$('hardMode').checked&&progress.wins>0?1:0,progress.start,selectedStage);setFloor(selectedStage);cam={x:g.player.x,y:g.player.y};keys={};stick=null;for(let id of ['start','end','upgrade','pauseScreen','workshop'])$(id).hidden=true;for(let id of ['hud','loadout','hint','bombBtn','combo'])$(id).hidden=false;last=performance.now();showToast(g.stage.name.toUpperCase()+(g.endless?' · LAST AS LONG AS YOU CAN':' · SURVIVE, THEN DEFEAT THE BOSS'),4);updateUI();}
$('nextStage').onclick=()=>{selectMode(2);begin();};$('startBtn').onclick=begin;
// How to Play sheet: opens from the menu, closes with GOT IT or a tap outside it.
$('howBtn').onclick=()=>{$('howSheet').hidden=false;$('howClose').focus();};
$('howClose').onclick=()=>{$('howSheet').hidden=true;$('howBtn').focus();};
$('howSheet').onclick=e=>{if(e.target===$('howSheet'))$('howSheet').hidden=true;};$('again').onclick=begin;$('restartPause').onclick=begin;
$('home').onclick=()=>{g=null;renderStagePicker();$('end').hidden=true;$('start').hidden=false;for(let id of ['hud','loadout','hint','bombBtn','combo','boost','recovery'])$(id).hidden=true;};
const PAUSE_TEXT={stage:$('pauseText').textContent,survival:'There is no finish line. The office gets tougher every 3 minutes and a boss clocks in each time. Knock out gold executives and bosses for briefcases: a briefcase evolves a maxed weapon that has its partner perk. Move out of marked red circles before they burst.'};
function pause(){if(!g)return;if(g.state==='playing'||g.state==='countdown'){$('pauseText').textContent=g.endless?PAUSE_TEXT.survival:PAUSE_TEXT.stage;g.pausedFrom=g.state;g.state='paused';$('recovery').hidden=true;$('pauseScreen').hidden=false;stick=null;keys={};}else if(g.state==='paused'){g.state=g.pausedFrom||'playing';$('pauseScreen').hidden=true;last=performance.now();}}
$('pause').onclick=pause;$('resume').onclick=pause;
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','p','P','Escape'].includes(e.key))e.preventDefault();if((e.key===' '||e.key.toLowerCase()==='b')&&!e.repeat)triggerBomb();if((e.key.toLowerCase()==='p'||e.key==='Escape')&&!e.repeat)pause();keys[e.key.toLowerCase()]=true;});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
window.addEventListener('blur',()=>{keys={};stick=null;if(g?.state==='playing'||g?.state==='countdown')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(g?.state==='playing'||g?.state==='countdown'))pause();});
canvas.addEventListener('pointerdown',e=>{if(!['playing','countdown'].includes(g?.state)||stick)return;let r=canvas.getBoundingClientRect();stick={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top,dx:0,dy:0};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!stick||e.pointerId!==stick.id)return;let r=canvas.getBoundingClientRect(),dx=e.clientX-r.left-stick.x,dy=e.clientY-r.top-stick.y,d=Math.hypot(dx,dy);stick.dx=dx/Math.max(45,d);stick.dy=dy/Math.max(45,d);});
for(let ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{if(stick?.id===e.pointerId)stick=null;});
function input(){if(stick)return{x:stick.dx,y:stick.dy};return{x:(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),y:(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)};}
function showToast(text,seconds=2.8){$('toast').textContent=text;$('toast').style.opacity=1;toastUntil=performance.now()+seconds*1000;}
// Build 16: the promotion screen is a supply cabinet. One shelf per choice, the whole shelf is the button.
const CABINET_ART={
 plunger:'assets/cabinet/plunger.webp',tp:'assets/cabinet/tp.webp',gas:'assets/cabinet/gas.webp',flush:'assets/cabinet/flush.webp',bomb:'assets/cabinet/bomb.webp',
 plunger2:'assets/cabinet/plunger2.webp',tp2:'assets/cabinet/tp2.webp',gas2:'assets/cabinet/gas2.webp',flush2:'assets/cabinet/flush2.webp',bomb2:'assets/cabinet/bomb2.webp',
 speed:'assets/cabinet/speed.webp',coffee:'assets/cabinet/coffee.webp',magnet:'assets/cabinet/magnet.webp',chili:'assets/cabinet/chili.webp',heal:'assets/cabinet/heal.webp',
 cash:'assets/cabinet/cash.webp',
};
// Passives read as one big number plus a short line, so they fit a shelf at phone size.
const PASSIVE_CARD={
 speed:['+10%','MOVE SPEED','Per rank. Up to 30% faster.'],
 coffee:['+8%','FASTER RECHARGE','Evolves Plungerang and Flush.'],
 magnet:['+10%','XP, WIDER PICKUP','Evolves TP Tornado.'],
 chili:['+15%','WEAPON DAMAGE','Evolves gas and Stink Bomb.'],
};
const UPGRADE_TAP_GUARD_MS=350; // a thumb already steering must not pick a shelf the instant the cabinet opens
let upgradeShownAt=0;
function upgrades(){
 stick=null;keys={};
 const brief=g.upgradeKind==='briefcase';
 $('upgradeTitle').innerHTML=brief?'SEVERANCE <span>PACKAGE</span>':'PROMOTION <span>EARNED</span>';
 const evolving=brief&&g.choices.some(c=>c.level===6);
 $('upgradeIntro').textContent=evolving?'Executive briefcase: evolve a weapon.':brief?'Executive briefcase: take a free upgrade.':'More responsibility. Same pay.';
 $('upgradeLabel').textContent=(evolving?'EVOLUTION':brief?'FREE UPGRADE':'LEVEL '+g.level)+(g.choices.length>1?' · CHOOSE ONE':' · TAKE IT');
 // Survival: evolutions come from briefcases, and a run holds a limited number of weapons and perks.
 $('upgradeFoot').textContent=g.endless?(evolving?'':g.level<=4&&!brief?'Max a weapon + its partner perk. An executive briefcase evolves it.':'Weapons '+g.ownedCount(g.weapons)+'/'+SURVIVAL.weaponSlots+' · Perks '+g.ownedCount(g.passives)+'/'+SURVIVAL.perkSlots):!brief&&g.level<=4?'Max a weapon + its partner perk to evolve it after 45 seconds.':'';
 $('choices').innerHTML='';
 g.choices.forEach((c,i)=>{
  const w=WEAPONS[c.key]||PASSIVES[c.key]||(c.key==='cash'?{icon:'💵',name:'Petty Cash Bonus',desc:'+'+SURVIVAL.cashBonus+' Petty Cash, banked right now.'}:{icon:'❤️',name:'Second Wind',desc:'Recover 35 health.'}),evo=c.level===6&&EVOLUTIONS[c.key];
  const kind=evo?'evo':PASSIVES[c.key]?'pas':c.key==='heal'||c.key==='cash'?'heal':c.level===1?'new':'up';
  const label={evo:'★ EVOLUTION',pas:'PASSIVE · RANK '+c.level,heal:c.key==='cash'?'BONUS':'RECOVERY',new:'NEW WEAPON',up:'UPGRADE · LEVEL '+c.level}[kind];
  const desc=evo?evo.desc:PASSIVES[c.key]?w.desc:c.level===1?w.desc:upgradeDesc(c.key,c.level);
  const recipe=EVOLUTIONS[c.key],card=PASSIVE_CARD[c.key],name=evo?evo.name:w.name,artKey=evo?c.key+'2':c.key;
  const b=document.createElement('button');
  b.className='cab-slot s'+(i+1)+(evo?' evolution':'');
  b.innerHTML=(CABINET_ART[artKey]?`<img class="cab-item" src="${CABINET_ART[artKey]}" alt="">`:`<span class="cab-item cab-item-icon">${iconFor(artKey,w.icon)}</span>`)
   +`<span class="cab-text"><small class="cab-chip ${kind}">${label}</small><strong class="cab-name${name.length>18?' long':''}">${name}</strong>`
   +(card?`<b class="cab-stat"><i>${card[0]}</i> ${card[1]}</b><span class="cab-desc">${card[2]}</span>`:`<span class="cab-desc">${desc}</span>`)
   +(recipe&&!evo?`<em class="cab-evo">★ Evolves with ${PASSIVES[recipe.requires].name}</em>`:'')
   +`<span class="cab-choose">CHOOSE</span></span>`;
  b.onclick=()=>{if(performance.now()-upgradeShownAt<UPGRADE_TAP_GUARD_MS)return;if(g.choose(c.key)){keys={};stick=null;$('upgrade').hidden=true;last=performance.now();updateUI();}};
  $('choices').append(b);
 });
 upgradeShownAt=performance.now();$('upgrade').hidden=false;
}
function upgradeDesc(k,l){return{plunger:'More damage'+(l%2===0?' and an extra returning plunger.':', with faster automatic throws.'),tp:'An extra orbiting roll, more damage and wider reach.',gas:'Larger clouds that last longer and deal more damage.',flush:'Bigger waves, more damage and a shorter cooldown.',bomb:'Wider lure and blast, more damage, shorter manual recharge.'}[k]||'';}
function finish(text){$('recovery').hidden=true;let earned=settle(progress,g);saveProgress();updateProgress();$('bombBtn').hidden=true;stick=null;keys={};$('upgrade').hidden=true;$('pauseScreen').hidden=true;const won=g.state==='won',hasNext=won&&g.stage.id===1,stageName=g.stage.name.toUpperCase(),boss=g.enemies.find(e=>e.boss),bossName=g.stage.bossName.replace(/\B\w+/g,w=>w.toLowerCase());
 // Build 18: end screen. One layout for a clear and a loss; the art, headline and main button change.
 $('end').classList.toggle('won',won);$('end').classList.toggle('has-next',hasNext);$('end').scrollTop=0;
 $('endTitle').innerHTML=won?'STAGE <span>CLEAR!</span>':'CLOCKED <span>OUT</span>';
 $('nextStage').hidden=!hasNext;
 $('again').innerHTML=`<b>${hasNext?'REPLAY':won?'PLAY AGAIN':'TRY AGAIN'}</b><span>${stageName}</span><i aria-hidden="true">→</i>`;
 $('home').textContent=hasNext?'Back to briefing':'MAIN MENU';
 $('receipt').classList.toggle('surv',g.endless);
 if(g.endless){
  // Build 19: survival. Time survived is the score; the line under the headline says what ended the run.
  const k=g.killedBy,who=!k?'':k.boss?(k.slam?bossName+"'s slam":bossName):{worker:'An office drone',runner:'A runner',guard:'An HR guard',exec:'An executive'}[k.type]||'The swarm';
  $('endEyebrow').textContent=g.newBest?'NEW PERSONAL BEST':'SURVIVAL · SHIFT OVER';
  $('endDesc').textContent=(who?who+' got you in':'You made it to')+' Tier '+(g.tier+1)+'.';
  $('receipt').innerHTML=`<div class="time${g.newBest?' best':''}"><b>${format(g.t)}</b><small>TIME SURVIVED · ${g.newBest?(g.previousBest?'BEAT YOUR '+format(g.previousBest):'YOUR FIRST RECORD'):'YOUR BEST '+format(g.previousBest)}</small></div><div class="cash"><b>+${earned.toLocaleString('en-US')}</b><small>PETTY CASH</small></div><div><b>${g.kills.toLocaleString('en-US')}</b><small>KOs</small></div><div><b>${g.bossesBeaten}</b><small>BOSSES BEATEN</small></div>`;
 }else{
 $('endEyebrow').textContent=won?stageName+' COMPLETE':stageName+' · SHIFT OVER';
 $('endDesc').textContent=hasNext?'Next stop: Corporate Lobby.':won?'Both stages are clear.':boss?bossName+' had '+Math.max(1,Math.ceil(boss.hp/boss.max*100))+'% health left.':'The boss shows up at '+format(g.stage.survival)+'.';
 $('receipt').innerHTML=`<div class="cash"><b>+${earned.toLocaleString('en-US')}</b><small>PETTY CASH COLLECTED</small></div><div><b>${g.bestCombo}</b><small>BEST KO CHAIN</small></div><div><b>${g.bombKills}</b><small>STINK BOMB KOs</small></div><div><b>${format(g.t)}</b><small>TIME SURVIVED</small></div>`;
 }
 $('end').hidden=false;if(g.kills>wonBest){wonBest=g.kills;try{localStorage.setItem('pp-overtime-best',String(wonBest));}catch{}$('best').textContent='BEST: '+wonBest+' KOs';}}
function format(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');}
function updateUI(){if(!g)return;$('recovery').hidden=g.state!=='countdown';$('recoveryCircle').style.setProperty('--resume-angle',(clamp(1-g.resumeLeft/RECOVERY_SECONDS,0,1)*360)+'deg');$('boost').hidden=g.caffeine<=0||!['playing','countdown','paused','upgrade'].includes(g.state);$('boost').textContent='☕ CAFFEINE RUSH · '+Math.ceil(g.caffeine)+'s';$('money').textContent=g.tokens.toLocaleString();$('timer').textContent=g.endless?format(g.t):g.phase==='boss'?'BOSS':format(Math.max(0,g.stage.survival-g.t));$('health').style.width=g.player.hp/g.player.max*100+'%';$('hp').textContent=Math.ceil(g.player.hp);$('xp').style.width=clamp(g.xp/g.need*100,0,100)+'%';let wait=Math.ceil((g.nextUpgradeAt||0)-g.t);$('level').textContent='LVL '+g.level+((g.xp>=g.need||g.pendingBriefcases>0)&&wait>0?' · PROMOTION IN '+wait+'s':'');$('mission').textContent=g.endless?'SURVIVAL · TIER '+(g.tier+1):'STAGE '+g.stage.id+' · '+(g.phase==='boss'?'DEFEAT THE BOSS':'SURVIVE THE WAVES');$('bossHud').hidden=!(g.endless?g.boss:g.phase==='boss')||g.state==='won'||g.state==='lost';$('bossNote').textContent=g.endless?'BEAT THE BOSS FOR A BRIEFCASE':'DEFEAT THE BOSS TO CLEAR THE STAGE';$('hud').classList.toggle('boss-active',!$('bossHud').hidden);if(g.boss){let percent=Math.ceil(Math.max(0,g.boss.hp)/g.boss.max*100);$('bossName').textContent=g.stage.bossName;$('bossPercent').textContent=percent+'%';$('bossHealth').style.width=percent+'%';}$('kills').textContent=g.kills+' KOs';$('loadout').innerHTML=Object.entries(g.weapons).filter(([,l])=>l).map(([k,l])=>`<div title="${WEAPONS[k].name}">${iconFor(l===6?k+'2':k,WEAPONS[k].icon)}<small>${l===6?'EVOLVED':'LV '+l}</small></div>`).join('')+(g.passives.speed?`<div title="Bathroom Dash: ${g.passives.speed*10}% faster">${iconFor('speed','👟')}<small>+${g.passives.speed*10}%</small></div>`:'');$('hint').hidden=g.t>10;$('bombBtn').hidden=g.state==='won'||g.state==='lost';$('bombBtn').disabled=g.state!=='playing'||g.cd.bomb>0;$('bombStatus').textContent=g.cd.bomb>0?Math.ceil(g.cd.bomb)+'s':'READY';$('bombBtn').style.setProperty('--charge',Math.max(0,1-g.cd.bomb/g.bombCooldown())*100+'%');$('combo').textContent=g.combo>=5?g.combo+' KOs IN A ROW':'';let hb=$('hud').offsetHeight;if(hb){$('combo').style.top=(hb+10)+'px';$('toast').style.top=(hb+36)+'px';}}
function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function circle(x,y,r,color,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function text(t,x,y,size=12,color='#d4e3dd',align='center'){ctx.fillStyle=color;ctx.font=`700 ${size}px Inter,Arial`;ctx.textAlign=align;ctx.fillText(t,x,y);}
function world(){ctx.save();ctx.translate(W/2,H*.53);ctx.scale(scale,scale);ctx.translate(-cam.x,-cam.y);}
const floorCanvas=document.createElement('canvas');floorCanvas.width=1800;floorCanvas.height=1800;let floorStage=0;function setFloor(id){if(id===floorStage)return;floorStage=id;(id===2?paintLobby:paintOffice)(floorCanvas.getContext('2d'),{herman:brandPortrait});}setFloor(1);for(const asset of [brandPortrait])asset.addEventListener('load',()=>{let id=floorStage;floorStage=0;setFloor(id);});
function floor(){ctx.drawImage(floorCanvas,0,0);}
function enemy(e){if(enemySheet.complete&&enemySheet.naturalWidth){let index={worker:0,runner:1,guard:2,exec:3}[e.type];let sw=enemySheet.naturalWidth/4,sh=enemySheet.naturalHeight,sz=e.type==='exec'?(e.boss?125:88):e.type==='guard'?82:65;circle(e.x,e.y+14,e.r,'#0005');if(e.attracted){circle(e.x,e.y,e.r+5,null,'#c4ed6e');text('!',e.x,e.y-40,14,'#d4f486');}ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.sin(g.t*11+e.id)*.035);if(e.flash>0)ctx.globalAlpha=.55;ctx.drawImage(enemySheet,index*sw,0,sw,sh,-sz*sw/sh/2,-sz+22,sz*sw/sh,sz);ctx.restore();if(e.type==='exec'){text(e.boss?'BOSS':'EXEC',e.x,e.y-sz,10,'#ffd36b');rounded(e.x-26,e.y-sz+5,52,4,2,'#513c28');rounded(e.x-26,e.y-sz+5,52*Math.max(0,e.hp/e.max),4,2,'#ffd36b');}return;}let exec=e.type==='exec',guard=e.type==='guard',runner=e.type==='runner';let body=exec?'#d9aa52':guard?'#526d83':runner?'#a76660':'#7c9b9f';if(e.flash>0)body='#fff3cf';circle(e.x,e.y+14,e.r,'#06151b66');if(e.attracted){ctx.setLineDash([3,5]);circle(e.x,e.y,e.r+7,null,'#c4ed6e');ctx.setLineDash([]);text('!',e.x,e.y-34,13,'#d4f486');}
 ctx.save();ctx.translate(e.x,e.y);let stride=Math.sin(g.t*(runner?17:10)+e.id)*4;rounded(-10,10,8,15+stride,3,'#10212c');rounded(2,10,8,15-stride,3,'#10212c');rounded(-e.r*.72,-7,e.r*1.44,27,5,body);ctx.fillStyle='#ecede0';ctx.beginPath();ctx.moveTo(-5,-6);ctx.lineTo(5,-6);ctx.lineTo(0,9);ctx.fill();ctx.fillStyle=exec?'#b73939':'#da7254';ctx.fillRect(-1,0,3,12);circle(0,-14,10,exec?'#e8bb92':'#d2b499');ctx.fillStyle='#293540';ctx.fillRect(-9,-22,18,5);ctx.fillRect(-7,-15,5,3);ctx.fillRect(3,-15,5,3);if(exec){rounded(14,2,14,18,2,'#6f4b2d','#efcb7a');text('EXEC',0,-37,10,'#f9d77c');rounded(-25,-32,50,4,2,'#593e29');rounded(-25,-32,50*e.hp/e.max,4,2,'#f9ce66');}if(guard){rounded(-24,-2,20,28,3,'#a4bac0','#e0ebe5');text('HR',-14,14,8,'#264654');}ctx.restore();}
function plunger(x,y,a){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.strokeStyle='#c5a071';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-14,0);ctx.lineTo(10,0);ctx.stroke();ctx.fillStyle='#d75b4c';ctx.beginPath();ctx.ellipse(11,0,7,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f18c67';ctx.fillRect(15,-12,4,24);ctx.restore();}
// Temporary native token icon. Replace with the supplied PNG when it is available.
const tokenCanvas=document.createElement('canvas');tokenCanvas.width=96;tokenCanvas.height=96;{
 let c=tokenCanvas.getContext('2d');let gold=c.createLinearGradient(5,5,85,90);gold.addColorStop(0,'#fff2b4');gold.addColorStop(.3,'#e9bd53');gold.addColorStop(.55,'#815311');gold.addColorStop(.75,'#f7ce70');gold.addColorStop(1,'#a66c20');c.fillStyle=gold;c.beginPath();c.arc(48,48,44,0,Math.PI*2);c.fill();c.strokeStyle='#fff0aa';c.lineWidth=3;c.stroke();c.strokeStyle='#704713';c.lineWidth=3;c.beginPath();c.arc(48,48,36,0,Math.PI*2);c.stroke();c.fillStyle='#7c4c12';c.beginPath();c.arc(48,48,32,0,Math.PI*2);c.fill();c.fillStyle=gold;for(let [x,y,rx,ry] of [[48,60,25,11],[48,47,20,10],[49,35,14,10]]){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}c.beginPath();c.moveTo(42,32);c.bezierCurveTo(50,27,51,21,49,17);c.bezierCurveTo(63,24,59,33,51,37);c.fill();c.fillStyle='#382009';for(let x of [41,55]){c.beginPath();c.ellipse(x,46,3,5,0,0,Math.PI*2);c.fill();}c.strokeStyle='#382009';c.lineWidth=3;c.beginPath();c.arc(48,53,9,.1,Math.PI-.1);c.stroke();c.fillStyle='#fff2b4';for(let i=0;i<24;i++){let a=i*Math.PI/12;c.beginPath();c.arc(48+Math.cos(a)*40,48+Math.sin(a)*40,1,0,Math.PI*2);c.fill();}
}
function healthKit(x,y,size=1){
 ctx.save();ctx.translate(x,y);ctx.scale(size,size);
 rounded(-16,-9,34,23,3,'#681f29');rounded(-17,-12,34,24,3,'#db3947','#ff9394');
 rounded(-14,-10,28,3,1,'#f36b73');circle(0,0,8.4,'#fffef4');
 rounded(-1.7,-5.5,3.4,11,0,'#d92d3d');rounded(-5.5,-1.7,11,3.4,0,'#d92d3d');ctx.restore();
}
function supply(s){
 if(s.hp<=0)return;
 let x=s.x,y=s.y;circle(x,y+20,35,'#0004');
 ctx.save();if(s.flash>0)ctx.globalAlpha=.55;
 if(s.reward==='heal')healthKit(x,y-2,1.65);
 else{
 rounded(x-28,y-33,56,58,7,s.reward==='coffee'?'#553429':'#b58d55','#f4d499');
 rounded(x-24,y-29,48,9,3,'#172f39');
 if(s.reward==='coffee'){rounded(x-18,y-15,36,25,3,'#17242b');rounded(x-9,y-8,18,21,3,'#fff0cf');text('☕',x,y+7,23);}
 else {ctx.strokeStyle='#76502c';ctx.lineWidth=3;ctx.strokeRect(x-22,y-24,44,42);text('$',x,y+12,30,'#fff0b8');}
 if(brandPortrait.complete&&brandPortrait.naturalWidth)ctx.drawImage(brandPortrait,x-7,y+14,14,14);
 }
 ctx.restore();rounded(x-31,y-56,62,17,4,'#102b3ee8');text(s.reward==='coffee'?'COFFEE':s.reward==='heal'?'FIRST AID':'SUPPLIES',x,y-44,9,'#fff0c7');
 if(s.hp<s.max){rounded(x-22,y+32,44,3,1,'#152b32');rounded(x-22,y+32,44*s.hp/s.max,3,1,'#f5cb78');}
}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#091d27';ctx.fillRect(0,0,W,H);if(!g){world();floor();ctx.restore();return;}let p=g.player;cam.x+=(p.x-cam.x)*.12;cam.y+=(p.y-cam.y)*.12;world();if(shake>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);floor();
 for(const s of g.supplies)supply(s);
 for(let a of g.bossAttacks){let progress=clamp(a.t/a.fuse,0,1);circle(a.x,a.y,a.r,'#ed62432b','#ffad78');circle(a.x,a.y,a.r*progress,'#ff633633');ctx.lineWidth=4;circle(a.x,a.y,a.r,null,'#ff9d68');text('MOVE!',a.x,a.y+5,20,'#ffdcaf');}
 for(let r of g.raids){ctx.save();ctx.translate(r.x,r.y);ctx.strokeStyle='#ff8f6077';ctx.lineWidth=8;ctx.setLineDash([12,8]);ctx.beginPath();ctx.arc(0,0,340,r.gap+.65,r.gap+Math.PI*2-.65);ctx.stroke();ctx.restore();text('INCOMING RUSH',r.x,r.y-105,15,'#ffad7b');}
 for(let e of g.enemies){if(e.windup>0||e.dash>0){ctx.strokeStyle=e.dash>0?'#ffb883':'#ff6d6688';ctx.lineWidth=22;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+e.aim.x*145,e.y+e.aim.y*145);ctx.stroke();if(e.windup>0)text('!',e.x,e.y-42,22,'#ff9c7b');}}
 for(let c of g.clouds){let alpha=.14*(1-c.t/c.life);circle(c.x,c.y,c.r,`rgba(157,210,93,${alpha})`);for(let i=0;i<3;i++)circle(c.x+Math.cos(c.t+i*2)*c.r*.35,c.y+Math.sin(c.t+i*2)*c.r*.35,c.r*.65,`rgba(157,210,93,${alpha})`);}
 for(let b of g.bombs){ctx.setLineDash([6,9]);ctx.lineWidth=1.5;circle(b.x,b.y,b.lure,null,'#9dca5455');ctx.setLineDash([]);circle(b.x,b.y,b.blast,'#bde66b0a');let pulse=18+b.t/b.fuse*6+Math.sin(b.t*10)*2;for(let i=0;i<5;i++){let a=i*1.257+b.t,r=b.lure*(1-(b.t*.5+i*.2)%1);circle(b.x+Math.cos(a)*r,b.y+Math.sin(a)*r,3,'#dcff9277');}let crowd=g.enemies.filter(e=>e.attracted&&Math.hypot(e.x-b.x,e.y-b.y)<b.lure).length;if(crowd)text(crowd+' LURED',b.x,b.y+48,12,'#e2ff92');circle(b.x,b.y,pulse+7,'#b5e66d22');let shine=ctx.createRadialGradient(b.x-7,b.y-8,1,b.x,b.y,21);shine.addColorStop(0,'#81964b');shine.addColorStop(.45,'#344732');shine.addColorStop(1,'#111f22');circle(b.x,b.y,pulse,shine,'#d4ef87');rounded(b.x-6,b.y-25,12,10,3,'#d5c77f','#ffe7a5');circle(b.x,b.y,9,'#b9dc6e');text('☣',b.x,b.y+6,17,'#273b22');for(let i=0;i<3;i++){let a=b.t*2+i*2.1;circle(b.x+Math.cos(a)*12,b.y-30-(b.t*20+i*12)%35,5+i,'#bce77544');}text((b.fuse-b.t).toFixed(1)+'s',b.x,b.y-30,12,'#d8f79a');ctx.strokeStyle='#dfff95';ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y,25,-Math.PI/2,-Math.PI/2+Math.PI*2*b.t/b.fuse);ctx.stroke();}
 for(let d of g.drops){if(d.chest){circle(d.x,d.y,26+Math.sin(g.t*5)*3,'#ffca5b22','#ffcc67');rounded(d.x-14,d.y-10,28,21,3,'#97612d','#ffdc82');rounded(d.x-6,d.y-16,12,7,2,null,'#ffdc82');text('BONUS',d.x,d.y-24,8,'#ffdc82');}else if(d.coffee){circle(d.x,d.y,18,'#603d2d','#ffd981');text('☕',d.x,d.y+8,24);text('RUSH',d.x,d.y-25,10,'#ffdf91');}else if(d.magnet){circle(d.x,d.y,16,'#243e64','#a1dcff');if(magnetImg.complete&&magnetImg.naturalWidth)ctx.drawImage(magnetImg,d.x-12,d.y-12,24,24);}else if(d.heal){if(d.life!=null&&d.life<5&&Math.floor(d.life*6)%2)continue;circle(d.x+2,d.y+10,16,'#0004');healthKit(d.x,d.y);}else{let radius=d.value>1?13:10;circle(d.x,d.y+3,radius,'#0005');ctx.drawImage(tokenCanvas,d.x-radius,d.y-radius,radius*2,radius*2);if(d.value>1)text('×'+d.value,d.x,d.y+radius+10,9,'#ffdd83');}}
 for(let e of [...g.enemies].sort((a,b)=>a.y-b.y))enemy(e);
 // Transparent full-body mascot, grounded shadow and movement animation.
 ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.38);circle(0,25,26,'#0007');ctx.restore();circle(p.x,p.y,21,null,'#f4dc8470');if(g.t<5&&g.state==='playing'){ctx.globalAlpha=1-g.t/5;text('YOU',p.x,p.y+56,15,'#9de6c1');circle(p.x,p.y+4,34,null,'#9de6c1');ctx.globalAlpha=1;}ctx.save();ctx.translate(p.x,p.y);let moving=g.moving&&g.state==='playing';ctx.scale(g.facingX,1);ctx.globalAlpha=p.inv>0&&Math.floor(p.inv*15)%2?.45:1;if(moving&&hermanWalk.complete&&hermanWalk.naturalWidth){let frame=Math.floor(g.walkDistance/20)%4,cw=hermanWalk.naturalWidth/2,ch=hermanWalk.naturalHeight/2;ctx.drawImage(hermanWalk,(frame%2)*cw,Math.floor(frame/2)*ch,cw,ch,-42,-62,84,84);}else if(herman.complete&&herman.naturalWidth)ctx.drawImage(herman,-42,-62,84,84);ctx.restore();
 for(let s of g.shots){ctx.save();if(s.big){ctx.translate(s.x,s.y);ctx.scale(1.6,1.6);plunger(0,0,s.t*15);}else plunger(s.x,s.y,s.t*15);ctx.restore();}for(let o of g.orbits||[]){rounded(o.x-11,o.y-13,22,26,6,'#e7eee3','#a8baba');circle(o.x,o.y-8,7,'#b1c2bb');circle(o.x,o.y-8,3,'#3b5355');}
 for(let w of g.waves){if(w.t<0)continue;ctx.globalAlpha=1-w.t/w.life;ctx.lineWidth=9;circle(w.x,w.y,w.max*w.t/w.life,null,w.royal?'#ffdd72':'#76e1e9');ctx.globalAlpha=1;}
 for(let n of g.numbers){ctx.globalAlpha=1-n.t/n.life;text(n.text,n.x,n.y-n.t*40,n.big?27:13,n.color);}ctx.globalAlpha=1;
 for(let f of g.fx){ctx.globalAlpha=1-f.t/f.life;ctx.lineWidth=5;circle(f.x,f.y,f.r*f.t/f.life,f.color+'28',f.color);for(let i=0;i<8;i++){let a=i*Math.PI/4;circle(f.x+Math.cos(a)*f.r*f.t/f.life,f.y+Math.sin(a)*f.r*f.t/f.life,4,f.color);}ctx.globalAlpha=1;}
 ctx.restore();
 // Direction to executives uses screen edges and never obscures the health display.
 for(let e of g.enemies.filter(e=>e.type==='exec')){let x=W/2+(e.x-cam.x)*scale,y=H*.53+(e.y-cam.y)*scale;const bar=g.phase==='boss'||g.endless&&g.boss;if(x<40||x>W-40||y<(bar?245:175)||y>H-120){let a=Math.atan2(y-H*.53,x-W/2),ax=clamp(x,30,W-30),ay=clamp(y,bar?260:190,H-120);ctx.save();ctx.translate(ax,ay);ctx.rotate(a);ctx.fillStyle='#ffce66';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-9,-10);ctx.lineTo(-9,10);ctx.fill();ctx.restore();text(e.boss?'BOSS':'EXEC',ax,ay+25,9,'#ffce66');}}
 // Mini-map shows the pursuing boss and your position.
 let mx=W-87,my=H-215;rounded(mx-7,my-7,76,76,5,'#071e2bd9','#45656b');for(let e of g.enemies.filter(e=>e.type==='exec'))circle(mx+e.x/1800*60,my+e.y/1800*60,3.5,'#ffd36b');circle(mx+p.x/1800*60,my+p.y/1800*60,3,'#9de6c1');
 if(stick){circle(stick.x,stick.y,45,'#a6d3c015','#b2d3ca55');circle(stick.x+stick.dx*35,stick.y+stick.dy*35,17,'#b2dcc177','#c8edda');}
}
function frame(now){let elapsed=Math.max(0,(now-last)/1000),dt=Math.min(elapsed,.25);last=now;if(g){if(g.state==='countdown')g.step(elapsed,input());else{let remaining=dt;while(remaining>0){let step=Math.min(remaining,.05);g.step(step,input());remaining-=step;}}for(let event of g.events.splice(0)){if(event.text&&event.type!=='end')showToast(event.text);if(event.type==='end')sound(g.state==='won'?'win':'lose');else sound(event.type);if(event.type==='level')upgrades();if(event.type==='end')finish(event.text);if(event.type==='boom')shake=9;if(event.type==='evolve')shake=12;if(event.type==='hurt')shake=5;}
 // Heartbeat about once a second while Herman is under 25% health.
 if(g.state==='playing'&&g.player.hp>0&&g.player.hp<g.player.max*.25)sound('heartbeat');
if(now-lastUI>100){updateUI();lastUI=now;}}if(g){$('recovery').hidden=g.state!=='countdown';$('recoveryCircle').style.setProperty('--resume-angle',(clamp(1-g.resumeLeft/RECOVERY_SECONDS,0,1)*360)+'deg');}shake=Math.max(0,shake-dt*35);if(now>toastUntil)$('toast').style.opacity=0;draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
