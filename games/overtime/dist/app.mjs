import {MODES,SURVIVAL_ID,stageFor,canPlayStage} from './stages.mjs';
import {paintOffice,paintLobby} from './scene.mjs';
import {PERKS,fresh,normalize,buy,cost,settle} from './progress.mjs';
import {Game,WEAPONS,PASSIVES,EVOLUTIONS,RECOVERY_SECONDS,SURVIVAL,clamp} from './engine.mjs';
import {createBoard} from './leaderboard.mjs';
import {ITEMS,MYSTERY,INTRO} from './mystery.mjs';import {tipsFor,takeTip,TIP_ICONS} from './tips.mjs';import {slidesFor} from './howto.mjs';import {rivalsFrom,passRivals} from './rivals.mjs';import {createVoice,VOICE_CLIPS} from './voice.mjs';import {MUSIC,hasMusic,trackFor,createMusicPlayer} from './music.mjs';import {shareMessage,sendShare} from './share.mjs';import {track as logEvent,timeBand,modeName} from './track.mjs';
// Build number sent with leaderboard times, so times from before a retune can be told apart.
const BUILD=31;const board=createBoard({build:BUILD});
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const brandPortrait=new Image();brandPortrait.src='assets/herman-brand.jpg';const herman=new Image();herman.src='assets/herman-battle.png';const hermanWalk=new Image();hermanWalk.src='assets/herman-walk.png';const enemySheet=new Image();enemySheet.src='assets/corporate-sprites.png';const briefcaseArt=new Image();briefcaseArt.src='assets/howto/briefcase.webp';let g=null,W=0,H=0,scale=1,cam={x:900,y:900},keys={},stick=null,muted=false,audioCtx,toastUntil=0,last=performance.now(),lastUI=0,shake=0,wonBest=0;
try{wonBest=Number(localStorage.getItem('pp-overtime-best')||0);}catch{}$('best').textContent=wonBest?'BEST: '+wonBest+' KOs':'';
let selectedStage=1;let progress=fresh();try{progress=normalize(JSON.parse(localStorage.getItem('pp-overtime-progress')||'null'));}catch{}
// Build 19: the menu lists MODES (both stages plus survival) and remembers the last one picked.
try{const saved=Number(localStorage.getItem('pp-overtime-mode'));if(MODES.some(m=>m.id===saved)&&canPlayStage(progress,saved))selectedStage=saved;}catch{}
function selectMode(id){startTicket++;selectedStage=id;try{localStorage.setItem('pp-overtime-mode',String(id));}catch{}}
const modeNumber=stage=>stage.endless?'∞':String(stage.id).padStart(2,'0');
function saveProgress(){try{localStorage.setItem('pp-overtime-progress',JSON.stringify(progress));}catch{$('saveNote').textContent='Browser storage is unavailable. Progress lasts for this session only.';}}
function updateProgress(){ cardStage=selectedStage; renderStagePicker(); $('bank').textContent=progress.credits;$('nextGoal').textContent=progress.kills<200?`NEXT UNLOCK: TP Tornado start · ${progress.kills}/200 lifetime KOs`:progress.wins<1?'NEXT UNLOCK: Corporate Lobby + Gas start · Clear the office':progress.clearedStages.includes(2)?'BOTH STAGES CLEARED · TRY A NEW BUILD':'CORPORATE LOBBY UNLOCKED · SELECT STAGE 02';}
function renderStagePicker(){
 $('stagePicker').innerHTML='';
 for(let stage of MODES){let b=document.createElement('button');b.className='stage-option'+(selectedStage===stage.id?' selected':'');b.disabled=!canPlayStage(progress,stage.id);b.setAttribute('aria-pressed',String(selectedStage===stage.id));b.textContent=modeNumber(stage)+' · '+stage.name+(b.disabled?' · LOCKED':progress.clearedStages.includes(stage.id)?' ✓':'');b.onclick=()=>{selectMode(stage.id);renderStagePicker();};$('stagePicker').append(b);}
 const stage=stageFor(selectedStage);$('stageNumber').textContent=modeNumber(stage);
 renderStageCard();
}
// Build 20 menu: the mode picker is a swipe carousel of art cards. Swiping, tapping a side card, the arrows and
// the dots all move it. The card in the middle is the one CLOCK IN starts; a locked card disables CLOCK IN.
const CARD_ART={1:'assets/menu/card-office.webp',2:'assets/menu/card-lobby.webp',[SURVIVAL_ID]:'assets/menu/card-survival.webp'};
const COIN_ART='assets/menu/coin.webp';
const LOCK_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z"/></svg>';
let cardStage=null,settleTimer=0;
const track=$('stageTrack');
MODES.forEach((stage,i)=>{
 const card=document.createElement('button');card.type='button';card.className='sv3-card';card.setAttribute('role','option');card.setAttribute('aria-label',stage.name);
 card.innerHTML=`<img src="${CARD_ART[stage.id]}" alt="" draggable="false"><span class="sv3-lock" hidden>${LOCK_ICON}<b></b></span>`;
 card.onclick=()=>goToCard(i);track.append(card);
 const dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label',stage.name);dot.onclick=()=>goToCard(i);$('stageDots').append(dot);
});
const cardIndex=()=>Math.max(0,MODES.findIndex(st=>st.id===cardStage));
function goToCard(i,instant){const el=track.children[i];if(!el||!track.clientWidth)return;track.scrollTo({left:el.offsetLeft-(track.clientWidth-el.offsetWidth)/2,behavior:instant?'auto':'smooth'});}
// Sizes each card by how far it is from the middle, and returns the index of the one nearest the middle.
function paintCarousel(){const mid=track.scrollLeft+track.clientWidth/2;let best=0,bestDist=Infinity;
 [...track.children].forEach((el,i)=>{const d=Math.abs(el.offsetLeft+el.offsetWidth/2-mid),k=Math.min(1,d/(el.offsetWidth||1));el.style.setProperty('--s',(1-k*.12).toFixed(3));el.style.setProperty('--o',(1-k*.45).toFixed(3));if(d<bestDist){bestDist=d;best=i;}});
 return best;}
track.addEventListener('scroll',()=>{const i=paintCarousel();clearTimeout(settleTimer);settleTimer=setTimeout(()=>{if(MODES[i].id===cardStage)return;cardStage=MODES[i].id;if(canPlayStage(progress,cardStage))selectMode(cardStage);renderStagePicker();},80);},{passive:true});
// The menu is hidden during a run, and a hidden carousel cannot scroll: line it up again whenever it gets a size.
new ResizeObserver(()=>{if(track.clientWidth){goToCard(cardIndex(),true);paintCarousel();}}).observe(track);
function renderStageCard(){
 if(cardStage==null||!MODES.some(st=>st.id===cardStage))cardStage=selectedStage;
 const index=cardIndex(),stage=MODES[index],unlocked=canPlayStage(progress,stage.id);
 $('stageNumber').textContent=modeNumber(stage);
 $('stageName').textContent=stage.name.toUpperCase();
 $('stageNote').textContent=stage.endless
  ?'Endless · '+(progress.bestSurvival?'Your best: '+format(progress.bestSurvival):'How long can you last?')
  :unlocked
  ?(progress.clearedStages.includes(stage.id)?'CLEARED ✓ · ':'')+'Survive '+Math.round(stage.survival/60)+' min · Beat the boss'
  :'Clear '+(MODES[index-1]?MODES[index-1].name:'the previous stage')+' to unlock';
 $('stageCard').classList.toggle('locked',!unlocked);
 $('startBtn').disabled=!unlocked;
 $('boardBtn').hidden=!stage.endless;if(stage.endless){board.warm();refreshWho();}else $('whoami').hidden=true;
 MODES.forEach((st,i)=>{const card=track.children[i],open=canPlayStage(progress,st.id);card.classList.toggle('locked',!open);card.setAttribute('aria-selected',String(i===index));
  const lock=card.querySelector('.sv3-lock');lock.hidden=open;lock.querySelector('b').textContent=open?'':'Clear '+(MODES[i-1]?MODES[i-1].name:'the previous stage')+' to unlock';
  $('stageDots').children[i].classList.toggle('on',i===index);});
 $('stagePrev').onclick=()=>goToCard(index-1);$('stageNext').onclick=()=>goToCard(index+1);
 $('stagePrev').hidden=index===0;$('stageNext').hidden=index===MODES.length-1;
 // Came here from somewhere other than a swipe (first load, back from a run): bring that card to the middle.
 if(track.clientWidth&&paintCarousel()!==index)goToCard(index,true);
}
// Build 23: survival leaderboard. A finished survival run is handed to the server, which only changes the board
// when the time beats that player's best. Guests can look at the board and are pointed to sign in.
const ordinal=n=>'#'+Number(n).toLocaleString('en-US');
function postSurvivalTime(run){
 const row=$('endBoard'),label=text=>{if(g===run)row.innerHTML=text+' <i aria-hidden="true">›</i>';};
 if(!board.signedIn()){label('NOT POSTED · LOG IN BEFORE YOUR NEXT RUN');return;}
 label('POSTING YOUR TIME…');
 board.submitRun({seconds:run.t,kills:run.kills,level:run.level,bosses:run.bossesBeaten}).then(r=>{
  label(r&&r.posted&&r.rank?'YOU ARE '+ordinal(r.rank)+' ON THE LEADERBOARD':r&&r.rank?'LEADERBOARD · YOU ARE '+ordinal(r.rank):'LEADERBOARD');});
}
function showBoard(){logEvent('overtime_board_open',{signed_in:board.signedIn()});
 const list=$('boardList'),note=$('boardNote'),signedIn=board.signedIn();
 $('board').hidden=false;$('board').scrollTop=0;list.innerHTML='';note.textContent='Loading…';$('boardSign').hidden=signedIn;
 board.top(10).then(rows=>{
  if($('board').hidden)return;list.innerHTML='';
  const top=rows.slice(0,10),me=rows.find(r=>r.is_me),extra=me&&!top.includes(me)?me:null;
  const add=r=>{const li=document.createElement('li');li.className='bd-row'+(r.is_me?' me':'')+(r.place<=3?' top':'');
   const place=document.createElement('b');place.textContent=r.place;const name=document.createElement('span');name.textContent=r.username+(r.is_me?' (you)':'');const time=document.createElement('strong');time.textContent=format(Number(r.best_seconds));
   li.append(place,name,time);list.append(li);};
  top.forEach(add);
  if(extra){const gap=document.createElement('li');gap.className='bd-gap';gap.textContent='· · ·';list.append(gap);add(extra);}
  note.textContent=!rows.length?'No times yet. Be the first on the board.':signedIn?(me?'':'Finish a survival run to get on the board.'):'Log in, then finish a survival run to get on the board. Runs played while logged out can\'t be posted.';
 }).catch(()=>{if(!$('board').hidden){list.innerHTML='';note.textContent='The leaderboard is on a break. Try again in a bit.';}});
}
$('boardBtn').onclick=showBoard;$('endBoard').onclick=showBoard;$('boardBack').onclick=()=>{$('board').hidden=true;};
function workshop(){$('recovery').hidden=true;for(let id of ['start','end','upgrade','pauseScreen','hud','bombBtn','loadout','combo','boost'])$(id).hidden=true;g=null;$('workshop').hidden=false;$('workshop').scrollTop=0;
 // Build 21: Break Room from Johnny's mockup. Perk rows with a buy button, weapon tiles, a switch for hard mode.
 $('workBank').textContent=progress.credits.toLocaleString('en-US');$('perkChoices').innerHTML='';
 const perkArt={health:'assets/breakroom/health.webp',damage:'assets/breakroom/damage.webp',pickup:CABINET_ART.cash};
 for(let [k,v] of Object.entries(PERKS)){const rank=progress.perks[k],maxed=rank>=3,price=cost(rank),row=document.createElement('div');row.className='br-perk'+(maxed?' maxed':'');
  row.innerHTML=`<img class="br-perk-art" src="${perkArt[k]}" alt=""><div class="br-perk-text"><strong>${v.name}</strong><p>${v.desc}</p></div><div class="br-rank"><b>${rank}/3</b><span>${[0,1,2].map(i=>`<i${i<rank?' class="on"':''}></i>`).join('')}</span></div>`;
  const b=document.createElement('button');b.type='button';b.className='br-buy';b.disabled=maxed||progress.credits<price;
  b.innerHTML=maxed?'MAXED':`<img src="${COIN_ART}" alt="">${price.toLocaleString('en-US')}`;b.setAttribute('aria-label',maxed?v.name+' is maxed':'Buy '+v.name+' rank '+(rank+1)+' for '+price+' Petty Cash');
  b.onclick=()=>{if(buy(progress,k)){saveProgress();workshop();sound('upgrade');}};row.append(b);$('perkChoices').append(row);}
 $('starts').innerHTML='';
 for(let k of ['plunger','tp','gas']){const unlocked=k==='plunger'||k==='tp'&&progress.kills>=200||k==='gas'&&progress.wins>=1,selected=progress.start===k,b=document.createElement('button');
  b.type='button';b.className='br-weapon'+(selected?' selected':'')+(unlocked?'':' locked');b.disabled=!unlocked;
  b.innerHTML=`<img src="${CABINET_ART[k]}" alt=""><strong>${WEAPONS[k].name}</strong><small>${selected?'✓ SELECTED':unlocked?'TAP TO SELECT':LOCK_ICON+(k==='tp'?'GET 200 KOs':'CLEAR 1 STAGE')}</small>`;
  b.onclick=()=>{progress.start=k;saveProgress();workshop();};$('starts').append(b);}
 $('hardMode').disabled=progress.wins<1;$('hardMode').closest('label').classList.toggle('locked',progress.wins<1);$('hardLock').textContent=progress.wins<1?'Unlock: clear a stage':'Stages only: faster, tougher enemies';}
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
 // Build 31: mystery box items (Johnny's art)
 wet:'assets/icons/wet.webp',freeze:'assets/icons/freeze.webp',horn:'assets/icons/horn.webp',bidet:'assets/icons/bidet.webp',healthplan:'assets/icons/healthplan.webp',card:'assets/icons/card.webp',
};
// Which icon each mystery item uses. Cash Sweep, Coffee and the Stink Bomb reuse existing icons.
const ITEM_ICON={sweep:'sweep',coffee:'coffee',wet:'wet',freeze:'freeze',bomb:'bomb',horn:'horn',bidet:'bidet',health:'healthplan',card:'card'};
// Cash Sweep uses the drawn magnet from the floor pickup (the Expense Account icon looks like a credit card).
const itemHtml=k=>k==='sweep'?`<img class="art-icon" src="${ICON_ART.magnet}" alt="">`:iconFor(ITEM_ICON[k],'?');
const itemImgs={};function itemImg(k){const src=k==='sweep'?ICON_ART.magnet:ICON_FILES[ITEM_ICON[k]];if(!src)return null;if(!itemImgs[k]){itemImgs[k]=new Image();itemImgs[k].src=src;}const im=itemImgs[k];return im.complete&&im.naturalWidth?im:null;}
function iconFor(k,fallback){
 if(ICON_FILES[k])return `<img class="art-icon" src="${ICON_FILES[k]}" alt="">`;
 if(k==='pickup')k='magnet';
 return ICON_ART[k]?`<img class="art-icon" src="${ICON_ART[k]}" alt="">`:fallback;
}
$('bombBtn').querySelector('span').innerHTML=iconFor('bomb','💣');
// The engine's own 'deploy' event plays the drop sound, so the button no longer plays it a second time.
function triggerBomb(){if(g?.useBomb())updateUI();}
// Build 31: Herman's pocket. Up to two saved mystery items sit above the Stink Bomb button; tap one to use it.
let pocketKey='';
function renderPocket(){const box=$('pocket'),over=!g||g.state==='won'||g.state==='lost';box.hidden=over||!g.pocket.length;
 const key=g?g.pocket.join(','):'';if(key!==pocketKey){pocketKey=key;box.querySelectorAll('.pk').forEach((b,i)=>{const k=g?.pocket[i];b.hidden=!k;if(!k)return;
  b.innerHTML=itemHtml(k)+(k==='bomb'?'<em>+1</em>':'');b.setAttribute('aria-label','Use '+ITEMS[k].name);b.dataset.item=k;});}
 box.querySelectorAll('.pk').forEach(b=>b.disabled=g?.state!=='playing');}
function usePocket(i){if(g?.usePocket(i))updateUI();}
document.querySelectorAll('#pocket .pk').forEach((b,i)=>b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();usePocket(i);}));
// Company Credit Card: pick any item. The rare one (Executive Bidet or Company Health Plan, taking turns) stands out.
let cardShownAt=0;
function showCard(){stick=null;keys={};const list=$('cardItems');list.replaceChildren();const rare=MYSTERY.cardRares;
 for(const k of g.cardChoices){const b=document.createElement('button');b.type='button';b.className='cm-item'+(rare.includes(k)?' rare':'');
  b.innerHTML=`<span class="cm-icon">${itemHtml(k)}${k==='bomb'?'<em>+1</em>':''}</span><span class="cm-text">${rare.includes(k)?'<small>RARE</small>':''}<strong>${ITEMS[k].name}</strong><span>${ITEMS[k].desc}</span></span>`;
  b.onclick=()=>{if(performance.now()-cardShownAt<UPGRADE_TAP_GUARD_MS)return;if(g.buyItem(k)){$('cardMenu').hidden=true;last=performance.now();updateUI();}};list.append(b);}
 cardShownAt=performance.now();$('cardMenu').hidden=false;}
// Build 31: the first time a player gets each mystery item (on this device), the run pauses and Herman explains it
// in a speech bubble above his head. Pocket items also point at the pocket. Each item explains itself once.
const ITEMS_SEEN_KEY='pp-overtime-items-seen',introQueue=[];let itemsSeen=new Set(),introShownAt=0;
try{itemsSeen=new Set(JSON.parse(localStorage.getItem(ITEMS_SEEN_KEY)||'[]'));}catch{}
function noteItem(k){if(!ITEMS[k]||itemsSeen.has(k)||introQueue.includes(k))return;itemsSeen.add(k);try{localStorage.setItem(ITEMS_SEEN_KEY,JSON.stringify([...itemsSeen]));}catch{}introQueue.push(k);}
function nextIntro(){if(!introQueue.length||!$('itemIntro').hidden||!g)return;if(g.state!=='playing'&&g.state!=='countdown')return;const k=introQueue.shift();if(!g.intro())return;
 stick=null;keys={};updateUI();const box=$('itemIntro'),r=canvas.getBoundingClientRect(),hx=r.left+(g.player.x-cam.x)*scale+W/2,hy=r.top+(g.player.y-cam.y)*scale+H*.53;
 box.style.setProperty('--hx',hx+'px');box.style.setProperty('--hy',hy+'px');
 const pocket=ITEMS[k].use==='pocket'&&g.pocket.includes(k);
 $('iiArt').innerHTML=itemHtml(k)+(k==='bomb'?'<em>+1</em>':'');$('iiTag').textContent=pocket?'NEW POCKET ITEM':'NEW ITEM';$('iiName').textContent=ITEMS[k].name;$('iiText').textContent=INTRO[k];$('iiPocket').hidden=!pocket;$('pocket').classList.toggle('lit',pocket);
 box.hidden=false;const b=$('iiBubble'),bh=b.offsetHeight;b.style.top=Math.max(12,Math.min(hy-56-bh,innerHeight-bh-12))+'px';$('iiTail').style.top=(parseFloat(b.style.top)+bh-1)+'px';$('iiTail').hidden=hy-56-bh<12;
 introShownAt=performance.now();$('iiGo').focus({preventScroll:true});}
$('iiGo').onclick=()=>{if(performance.now()-introShownAt<UPGRADE_TAP_GUARD_MS)return;$('itemIntro').hidden=true;$('pocket').classList.remove('lit');if(g?.endIntro()){keys={};stick=null;last=performance.now();updateUI();}setTimeout(nextIntro,0);};
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
const SFX={pickup:['coin'],hurt:['hit-1','hit-2','hit-3','hit-4'],deploy:['bomb-drop'],boom:['fart-blast'],flush:['flush'],level:['cha-ching'],upgrade:['stamp'],evolve:['power-up'],alert:['siren'],rush:['siren'],'exec-in':['siren'],'boss-warn':['siren'],'boss-arrive':['siren'],exec:['boss'],supply:['box-pop'],win:['victory'],lose:['sad-trombone'],
 'hit-plunger':['hit-plunger'],'hit-tp':['hit-tp'],'hit-gas':['hit-gas'],'hit-flush':['hit-flush'],'hit-boss':['hit-boss'],
 ko:['ko-1','ko-2','ko-3','ko-4','ko-5'],throw:['plunger-throw'],puff:['gas-puff'],charge:['runner-charge'],slam:['boss-slam'],
 heal:['heal-1','heal-2'],coffee:['coffee'],heartbeat:['heartbeat'],combo:['combo'],pocket:['stamp'],card:['cha-ching'],
};
// These moments are new, so they stay silent until their sound has loaded instead of playing the fallback beep.
const SILENT_UNTIL_LOADED=new Set(['hit-plunger','hit-tp','hit-gas','hit-flush','hit-boss','ko','throw','puff','charge','slam','heal','coffee','heartbeat','combo']);
// vol = loudness, gap = shortest time (seconds) between two plays of the same sound, jitter = random pitch change,
// rates = playback speeds to rotate through (lower is deeper), so one clip can stand in for several.
// Frequent sounds (hits, knockouts, throws) are quieter, rate-limited and pitch-varied so they never machine-gun.
const SFX_MIX={
 'hit-plunger':{vol:.3,gap:.45,jitter:.1},'hit-tp':{vol:.55,gap:.08,jitter:.08},'hit-gas':{vol:.26,gap:.3,jitter:.06},'hit-flush':{vol:.45,gap:.08,jitter:.07},'hit-boss':{vol:.45,gap:1.1,jitter:.05},
 ko:{vol:.5,gap:.1,jitter:.09},throw:{vol:.22,gap:.15,jitter:.05},puff:{vol:.35,gap:.4,jitter:.08},charge:{vol:.4,gap:2.5,jitter:.04,rates:[1,.85,1.18]},slam:{vol:.9,gap:.3},
 heal:{vol:.9,gap:.3},coffee:{vol:.8,gap:.5},pocket:{vol:.6,gap:.3},card:{vol:.75,gap:.5},heartbeat:{vol:.75,gap:1},combo:{vol:.8,gap:1},deploy:{vol:.8,gap:.25},
 pickup:{vol:.28,gap:.06,jitter:.06},hurt:{vol:.85,gap:.3},flush:{vol:.6,gap:.4},boom:{vol:.9,gap:.15},alert:{vol:.6,gap:1},rush:{vol:.6,gap:1},'exec-in':{vol:.5,gap:1,rates:[1.45]},'boss-warn':{vol:.7,gap:1,rates:[.7]},'boss-arrive':{vol:.8,gap:1,rates:[.56]},upgrade:{vol:.7},level:{vol:.75}};
let sfxBuffers={},sfxLoading=null,sfxLast={},hitTurn=0,rateTurn={};
// The page's one AudioContext, created on the first sound, voice line or music after a tap.
function audio(){audioCtx||=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;}
function loadSfx(){if(sfxLoading||!audioCtx)return;sfxLoading=Promise.all(Object.entries(SFX_FILES).map(async([k,u])=>{try{let r=await fetch(u);sfxBuffers[k]=await audioCtx.decodeAudioData(await r.arrayBuffer());}catch{}}));}
function playSample(type){let names=SFX[type];if(!names)return false;let mix=SFX_MIX[type]||{},now=audioCtx.currentTime;if(now-(sfxLast[type]??-9)<(mix.gap||0))return true;// Herman's hurt clips rotate in order; any other sound with several takes picks one at random.
 let name=type==='hurt'?names[hitTurn%names.length]:names[Math.floor(Math.random()*names.length)],buf=sfxBuffers[name];if(!buf)return SILENT_UNTIL_LOADED.has(type);if(type==='hurt')hitTurn++;sfxLast[type]=now;let src=audioCtx.createBufferSource(),v=audioCtx.createGain();src.buffer=buf;if(mix.jitter)src.playbackRate.value=1+(Math.random()*2-1)*mix.jitter;if(mix.rates){rateTurn[type]=(rateTurn[type]||0)+1;src.playbackRate.value*=mix.rates[rateTurn[type]%mix.rates.length];}v.gain.value=mix.vol??.8;src.connect(v);v.connect(audioCtx.destination);src.start();return true;}
// Build 31: the new mystery items have made-in-code sounds (no new files). 'note' is silent.
const SYNTH={note(){},got(){},
 horn(){const c=audioCtx,t=c.currentTime,v=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2400;v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(.16,t+.03);v.gain.setValueAtTime(.16,t+.55);v.gain.exponentialRampToValueAtTime(.0001,t+.8);lp.connect(v);v.connect(c.destination);
  for(const f of [349,440,523]){const o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f*.97,t);o.frequency.linearRampToValueAtTime(f,t+.08);o.connect(lp);o.start(t);o.stop(t+.82);}},
 freeze(){const c=audioCtx,t=c.currentTime,o=c.createOscillator(),v=c.createGain();o.type='square';o.frequency.setValueAtTime(700,t);o.frequency.exponentialRampToValueAtTime(70,t+.55);v.gain.setValueAtTime(.06,t);v.gain.exponentialRampToValueAtTime(.0001,t+.6);o.connect(v);v.connect(c.destination);o.start(t);o.stop(t+.62);},
 wet(){noiseBurst(.45,1800,300,.22);},
 bidet(){noiseBurst(MYSTERY.bidetTime,3200,2600,.09,true);}};
function noiseBurst(len,f0,f1,vol,hold){const c=audioCtx,t=c.currentTime,n=Math.floor(c.sampleRate*len),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
 const s=c.createBufferSource(),bp=c.createBiquadFilter(),v=c.createGain();s.buffer=b;bp.type='bandpass';bp.Q.value=.9;bp.frequency.setValueAtTime(f0,t);bp.frequency.exponentialRampToValueAtTime(f1,t+len);
 v.gain.setValueAtTime(vol,t);if(hold)v.gain.setValueAtTime(vol,t+len-.3);v.gain.exponentialRampToValueAtTime(.0001,t+len);s.connect(bp);bp.connect(v);v.connect(c.destination);s.start(t);s.stop(t+len);}
function sound(type){if(muted)return;try{audio();loadSfx();if(SYNTH[type]){SYNTH[type]();return;}if(playSample(type))return;let o=audioCtx.createOscillator(),v=audioCtx.createGain();o.connect(v);v.connect(audioCtx.destination);let t=audioCtx.currentTime;let freq={boom:75,level:540,upgrade:700,hurt:130,flush:210,exec:850,alert:380,evolve:1100,deploy:180,pickup:950,win:880,lose:160}[type]||360;o.type=type==='boom'?'sawtooth':'sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(type==='level'?1000:Math.max(30,freq*.4),t+.18);v.gain.setValueAtTime(type==='pickup'?.009:.045,t);v.gain.exponentialRampToValueAtTime(.001,t+.22);o.start(t);o.stop(t+.23);}catch{}}
try{muted=localStorage.getItem('pp-overtime-sound')==='off';}catch{}// The menu's sound button is a speaker icon; the pause screen has a labelled on/off switch.
const SPEAKER_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const SPEAKER_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="m16 9 6 6M22 9l-6 6"/></svg>';
// Build 29: Herman's voice lines (rules in voice.mjs). The clips are fetched in the background soon after the page
// loads and decoded when first needed. They follow the Sound Effects switch. A line that is not ready in time is skipped.
const voice=createVoice(),voiceData={},voiceBuffers={};
function fetchVoice(){for(const c of VOICE_CLIPS)voiceData[c]||=fetch('assets/voice/'+c+'.mp3').then(r=>r.ok?r.arrayBuffer():null).catch(()=>null);}
setTimeout(fetchVoice,1200);
function voiceBuffer(c){if(!voiceData[c])return Promise.resolve(null);return voiceBuffers[c]||=voiceData[c].then(d=>d?audio().decodeAudioData(d):null).catch(()=>null);}
function say(moment,delay=0){if(muted||!g)return;const clip=voice.pick(moment,g.t);if(!clip)return;const run=g,asked=performance.now();
 voiceBuffer(clip).then(buf=>{const late=performance.now()-asked;if(!buf||muted||g!==run||late>delay*1000+1500)return;
  setTimeout(()=>{if(muted||g!==run)return;try{const ctx=audio(),src=ctx.createBufferSource(),v=ctx.createGain();src.buffer=buf;v.gain.value=1;src.connect(v);v.connect(ctx.destination);src.start();}catch{}},Math.max(0,delay*1000-late));});}
// Build 29: music (tracks listed in music.mjs). With no tracks listed there is no player and the Music switch stays hidden.
const NOTE_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/></svg>';
const NOTE_OFF=NOTE_ON.replace('</svg>','<path d="M3 3l18 18"/></svg>');
let musicOn=true,gestured=false,musicSync=0,stingUntil=0;try{const saved=localStorage.getItem('pp-overtime-music');musicOn=saved?saved==='on':!muted;}catch{}
const music=hasMusic()?createMusicPlayer({url:file=>'assets/music/'+file,getCtx:audio}):null;if(music)music.enable(musicOn);
function musicLabel(){for(const id of ['music','musicPause'])$(id).hidden=!music;$('music').innerHTML=$('musicPauseIcon').innerHTML=musicOn?NOTE_ON:NOTE_OFF;$('music').setAttribute('aria-label',musicOn?'Music is on. Tap to turn off':'Music is off. Tap to turn on');$('musicPause').setAttribute('aria-checked',String(musicOn));}
function toggleMusic(){musicOn=!musicOn;try{localStorage.setItem('pp-overtime-music',musicOn?'on':'off');}catch{}musicLabel();gestured=true;if(music){music.enable(musicOn);syncMusic();}}
// Keeps the right loop playing for what is on screen. Called a few times a second; the player only acts on a change.
function syncMusic(){if(!music||!gestured||document.hidden)return;const s=g?.state,playing=['playing','countdown','upgrade','paused','card','intro'].includes(s);music.muffle(s==='paused'||s==='upgrade'||s==='card'||s==='intro');if((s==='won'||s==='lost')&&performance.now()<stingUntil)return;music.set(trackFor({screen:playing?'play':'menu',endless:playing&&g.endless,boss:playing&&(g.endless?!!g.boss:g.phase==='boss')}));}
// The end of a run: Herman's clocked-out line, and a music sting if one is listed (it replaces the fanfare or trombone).
function endAudio(won){const key=won?'win':'lose',sting=music&&musicOn&&MUSIC[key];if(!sting)sound(key);if(!won)say('lose',sting?.4:1.4);if(sting){music.sting(key);stingUntil=performance.now()+8000;}}
for(const ev of ['pointerdown','keydown'])addEventListener(ev,()=>{gestured=true;},{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(music)music.enable(musicOn&&!document.hidden);});
function soundLabel(){$('sound').innerHTML=$('soundPauseIcon').innerHTML=muted?SPEAKER_OFF:SPEAKER_ON;$('sound').setAttribute('aria-label',muted?'Sound effects are off. Tap to turn on':'Sound effects are on. Tap to turn off');$('soundPause').setAttribute('aria-checked',String(!muted));}function toggleSound(){muted=!muted;try{localStorage.setItem('pp-overtime-sound',muted?'off':'on');}catch{}soundLabel();sound('upgrade');}soundLabel();$('sound').onclick=toggleSound;$('soundPause').onclick=toggleSound;musicLabel();$('music').onclick=toggleMusic;$('musicPause').onclick=toggleMusic;
function begin(){$('recovery').hidden=true;if(!canPlayStage(progress,selectedStage))selectedStage=1;sound('upgrade');g=new Game(Math.random,progress.perks,selectedStage!==SURVIVAL_ID&&$('hardMode').checked&&progress.wins>0?1:0,progress.start,selectedStage);logEvent('overtime_run_start',{mode:modeName(g.stage),hard:g.difficulty===1});voice.reset();fetchVoice();say('start',.35);setFloor(selectedStage);cam={x:g.player.x,y:g.player.y};keys={};stick=null;for(let id of ['start','end','upgrade','pauseScreen','workshop','cardMenu','pocket','itemIntro'])$(id).hidden=true;introQueue.length=0;for(let id of ['hud','loadout','hint','bombBtn','combo'])$(id).hidden=false;last=performance.now();showToast(g.stage.name.toUpperCase()+(g.endless?' · LAST AS LONG AS YOU CAN':' · SURVIVE, THEN DEFEAT THE BOSS'),4);bannerQueue=[];bannerUntil=0;$('banner').hidden=true;rivals=[];bestToBeat=g.endless?progress.bestSurvival||0:0;if(g.endless){const run=g;board.startRun().then(id=>{if(!id&&board.signedIn()&&g===run)showToast('COULD NOT REACH THE LEADERBOARD · THIS RUN WON\'T POST',4);});board.top(10).then(rows=>{if(g===run)rivals=rivalsFrom(rows,run.t);}).catch(()=>{});}updateUI();}
$('nextStage').onclick=()=>{selectMode(2);begin();};
// Build 30: before a Survival run, check the login is still good. Logged out, the player hears it now, not after
// their best run: LOG IN goes to the sign-in page and back, PLAY ANYWAY starts the run (asked once per visit).
let nudged=false,whoName=null;
function showWho(r){const el=$('whoami');if(selectedStage!==SURVIVAL_ID){el.hidden=true;return;}el.hidden=false;
 if(r.signedIn){whoName=r.name;el.replaceChildren('PLAYING AS ');const b=document.createElement('b');b.textContent=r.name||'YOU';el.append(b);}
 else{whoName=null;el.innerHTML='NOT LOGGED IN · <a href="auth.html?next=overtime">LOG IN</a> TO POST TIMES';}}
function refreshWho(){if(selectedStage!==SURVIVAL_ID){$('whoami').hidden=true;return Promise.resolve({signedIn:board.signedIn()});}return board.who().then(r=>{showWho(r);return r;});}
// The check can take a moment. If the player leaves the menu meanwhile (Break Room, How to Play, another mode),
// the pending start is dropped instead of starting a run on top of wherever they went.
let startTicket=0;
const stillOnMenu=(ticket,stage)=>ticket===startTicket&&selectedStage===stage&&!$('start').hidden&&$('workshop').hidden&&$('how').hidden;
function startShift(){const go=()=>howSeen()?begin():openHow(begin);if(selectedStage!==SURVIVAL_ID)return go();
 const ticket=++startTicket,stage=selectedStage;
 $('startBtn').disabled=true;refreshWho().then(r=>{$('startBtn').disabled=false;if(!stillOnMenu(ticket,stage))return;if(r.signedIn||nudged)return go();nudged=true;$('loginNudge').hidden=false;$('nudgePlay').onclick=()=>{$('loginNudge').hidden=true;go();};});}
$('startBtn').onclick=startShift;
// How to Play sheet: opens from the menu, closes with GOT IT or a tap outside it.
// Build 25: How to Play is six swipe cards with moving pictures (words and markup in howto.mjs, drawing in
// style.css). It opens from the menu button, and once by itself the first time a player taps CLOCK IN; there, the
// last button and SKIP both start the run. Only the card in view animates.
const HOW_KEY='pp-overtime-howto',howTrack=$('howTrack');let howThen=null,howAt=0,howLock=0;
function howSeen(){try{return localStorage.getItem(HOW_KEY)==='1';}catch{return true;}}
function setHow(i){howAt=i;let n=howTrack.children.length,last=i===n-1;[...howTrack.children].forEach((c,k)=>c.classList.toggle('on',k===i));[...$('howDots').children].forEach((d,k)=>{d.classList.toggle('on',k===i);d.setAttribute('aria-current',k===i?'step':'false');});$('howNext').textContent=last?(howThen?'CLOCK IN':'GOT IT'):'NEXT';$('howSkip').style.visibility=last?'hidden':'';$('how').classList.toggle('last',last);}
function goHow(i){i=Math.max(0,Math.min(howTrack.children.length-1,i));howTrack.scrollTo({left:i*howTrack.clientWidth,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});howLock=performance.now()+600;setHow(i);}
function openHow(then){howThen=then||null;let slides=slidesFor(MODES.find(st=>st.id===cardStage)||stageFor(selectedStage));howTrack.replaceChildren();$('howDots').replaceChildren();
 slides.forEach((s,i)=>{let card=document.createElement('article');card.className='hw-card';card.setAttribute('role','group');card.setAttribute('aria-label',`Step ${i+1} of ${slides.length}: ${s.title}`);
  card.innerHTML=`<div class="hs s-${s.id} ${s.cls||''}" aria-hidden="true">${s.scene}</div><div class="hw-step">STEP ${i+1} OF ${slides.length}</div><h3></h3><p></p>`;card.querySelector('h3').textContent=s.title;card.querySelector('p').textContent=s.text;howTrack.append(card);
  let dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label','Step '+(i+1)+': '+s.title);dot.onclick=()=>goHow(i);$('howDots').append(dot);});
 $('how').hidden=false;howTrack.scrollLeft=0;setHow(0);$('howNext').focus();}
function closeHow(action){logEvent('overtime_howto',{action,first_run:!!howThen,card:howAt+1});$('how').hidden=true;howTrack.replaceChildren();try{localStorage.setItem(HOW_KEY,'1');}catch{}let then=howThen;howThen=null;if(then)then();else $('howBtn').focus();}
howTrack.addEventListener('scroll',()=>{if(!howTrack.clientWidth||performance.now()<howLock)return;let i=Math.round(howTrack.scrollLeft/howTrack.clientWidth);if(i!==howAt&&i>=0&&i<howTrack.children.length)setHow(i);},{passive:true});
$('howNext').onclick=()=>howAt>=howTrack.children.length-1?closeHow('finished'):goHow(howAt+1);$('howSkip').onclick=()=>closeHow('skipped');$('howBtn').onclick=()=>openHow();
$('how').addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();goHow(howAt+1);}else if(e.key==='ArrowLeft'){e.preventDefault();goHow(howAt-1);}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeHow('skipped');}});$('again').onclick=begin;
// Build 26: SHARE on the end screen. Uses the phone's share sheet when there is one, otherwise copies the line.
const SHARE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
let shareIdle='SHARE',shareTimer=0;
function shareLabel(t,hold){clearTimeout(shareTimer);if(!hold)shareIdle=t;$('endShare').innerHTML=SHARE_ICON+'<b></b>';$('endShare').lastChild.textContent=t;if(hold)shareTimer=setTimeout(()=>shareLabel(shareIdle),2200);}
$('endShare').onclick=async()=>{if(!g)return;let how=await sendShare(shareMessage({endless:g.endless,won:g.state==='won',time:format(g.t),stageName:g.stage.name}),navigator);logEvent('overtime_share',{mode:modeName(g.stage),outcome:how});if(how==='copied')shareLabel('COPIED. PASTE IT ANYWHERE.',true);else if(how==='failed')shareLabel('COULD NOT SHARE FROM THIS BROWSER',true);};
// Build 26: RESTART MISSION on the pause screen needs a second tap within 3 seconds, so a slip cannot wipe a run.
let restartUntil=0,restartTimer=0;
function disarmRestart(){clearTimeout(restartTimer);restartUntil=0;$('restartPause').textContent='RESTART MISSION';$('restartPause').classList.remove('armed');}
$('restartPause').onclick=()=>{if(performance.now()<restartUntil){disarmRestart();begin();return;}restartUntil=performance.now()+3000;$('restartPause').textContent='TAP AGAIN TO RESTART';$('restartPause').classList.add('armed');restartTimer=setTimeout(disarmRestart,3000);};
$('home').onclick=()=>{g=null;renderStagePicker();$('end').hidden=true;$('start').hidden=false;for(let id of ['hud','loadout','hint','bombBtn','combo','boost','recovery'])$(id).hidden=true;};
// Build 24: tips under WHILE YOU'RE HERE. Three show at once; one swaps out every few seconds, so each stays long
// enough to read. Each mode remembers how far it has got, so the next pause shows different tips.
const TIP_SLOTS=3,TIP_SWAP_MS=5000,tipAt={stage:0,survival:0};let tipTimer=0,tipPool=[],tipMode='stage',tipSlot=0;
function fillTip(li,t){li.dataset.tip=t.id;li.innerHTML=`<span class="pz-ico ${t.tone}">${TIP_ICONS[t.icon]}</span><span class="pz-tip-text"></span>`;li.lastChild.textContent=t.text;}
function nextTip(){let showing=[...$('pauseTips').children].map(li=>li.dataset.tip),r=takeTip(tipPool,tipAt[tipMode],showing);tipAt[tipMode]=r.at;return r.tip;}
function swapTip(){if($('pauseScreen').hidden)return stopTips();let rows=[...$('pauseTips').children].filter(li=>li.offsetParent),li=rows[tipSlot++%rows.length];if(!li)return;li.classList.add('out');setTimeout(()=>{fillTip(li,nextTip());li.classList.remove('out');},260);}
function stopTips(){clearInterval(tipTimer);tipTimer=0;}
function showTips(){stopTips();tipMode=g.endless?'survival':'stage';tipPool=tipsFor({endless:g.endless,weapons:g.weapons,keyboard:matchMedia('(hover:hover) and (pointer:fine)').matches});tipSlot=0;let list=$('pauseTips');list.replaceChildren();for(let i=0;i<TIP_SLOTS;i++){let li=document.createElement('li');list.append(li);fillTip(li,nextTip());}tipTimer=setInterval(swapTip,TIP_SWAP_MS);}
function pause(){if(!g)return;if(g.state==='playing'||g.state==='countdown'){showTips();disarmRestart();g.pausedFrom=g.state;g.state='paused';$('recovery').hidden=true;$('pauseScreen').hidden=false;stick=null;keys={};}else if(g.state==='paused'){g.state=g.pausedFrom||'playing';$('pauseScreen').hidden=true;stopTips();last=performance.now();}}
$('pause').onclick=pause;$('resume').onclick=pause;
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','p','P','Escape'].includes(e.key))e.preventDefault();if((e.key===' '||e.key.toLowerCase()==='b')&&!e.repeat)triggerBomb();if((e.key==='1'||e.key==='2')&&!e.repeat)usePocket(+e.key-1);if((e.key.toLowerCase()==='p'||e.key==='Escape')&&!e.repeat)pause();keys[e.key.toLowerCase()]=true;});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
window.addEventListener('blur',()=>{keys={};stick=null;if(g?.state==='playing'||g?.state==='countdown')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(g?.state==='playing'||g?.state==='countdown'))pause();});
canvas.addEventListener('pointerdown',e=>{if(!['playing','countdown'].includes(g?.state)||stick)return;let r=canvas.getBoundingClientRect();stick={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top,dx:0,dy:0};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!stick||e.pointerId!==stick.id)return;let r=canvas.getBoundingClientRect(),dx=e.clientX-r.left-stick.x,dy=e.clientY-r.top-stick.y,d=Math.hypot(dx,dy);stick.dx=dx/Math.max(45,d);stick.dy=dy/Math.max(45,d);});
for(let ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{if(stick?.id===e.pointerId)stick=null;});
function input(){if(stick)return{x:stick.dx,y:stick.dy};return{x:(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),y:(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)};}
// Build 28: the banner is the big centre-screen line for moments that must not be missed: a boss arriving, a new
// personal best, going past a leaderboard time. One at a time, queued, about 2.6 seconds each. Text only.
let bannerQueue=[],bannerUntil=0,rivals=[],bestToBeat=0;
function banner(title,sub='',tone=''){bannerQueue.push({title,sub,tone});}
function stepBanner(now){const el=$('banner');if(now<bannerUntil)return;if(!bannerQueue.length){if(!el.hidden)el.hidden=true;return;}const b=bannerQueue.shift();el.hidden=true;el.className=b.tone;el.firstChild.textContent=b.title;el.lastChild.textContent=b.sub;void el.offsetWidth;el.hidden=false;bannerUntil=now+2600;}
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
 speed:['+10%','MOVE SPEED','Evolves Courtesy Flush.'],
 coffee:['+8%','FASTER RECHARGE','Evolves Plungerang.'],
 magnet:['+10%','FASTER PROMOTIONS','Wider pickup. Evolves TP Tornado.'],
 chili:['+15%','WEAPON DAMAGE','Evolves gas and Stink Bomb.'],
};
const UPGRADE_TAP_GUARD_MS=350; // a thumb already steering must not pick a shelf the instant the cabinet opens
let upgradeShownAt=0;
function upgrades(){
 stick=null;keys={};
 const brief=g.upgradeKind==='briefcase';
 $('upgradeTitle').innerHTML=brief?'SEVERANCE <span>PACKAGE</span>':'PROMOTION <span>EARNED</span>';
 const evolving=brief&&g.choices.some(c=>c.level===6);
 $('upgradeIntro').textContent=evolving?'Executive briefcase: evolve a weapon.':brief?(g.endless?'Executive briefcase: your fastest route to an evolution.':'Executive briefcase: take a free upgrade.'):'More responsibility. Same pay.';
 $('upgradeLabel').textContent=(evolving?'EVOLUTION':brief?'FREE UPGRADE':'LEVEL '+g.level)+(g.choices.length>1?' · CHOOSE ONE':' · TAKE IT');
 // Survival: evolutions come from briefcases, and a run holds a limited number of weapons and perks.
 $('upgradeFoot').textContent=g.endless?(evolving?'':g.level<=4&&!brief?'Max a weapon + its partner perk. An executive briefcase evolves it.':'Weapons '+g.ownedCount(g.weapons)+'/'+SURVIVAL.weaponSlots+' · Perks '+g.ownedCount(g.passives)+'/'+SURVIVAL.perkSlots):!brief&&g.level<=4?'Max a weapon + its partner perk to evolve it after 45 seconds.':'';
 $('choices').innerHTML='';
 g.choices.forEach((c,i)=>{
  const w=WEAPONS[c.key]||PASSIVES[c.key]||(c.key==='cash'?{icon:'💵',name:'Petty Cash Bonus',desc:'+'+SURVIVAL.cashBonus+' Petty Cash, banked right now.'}:c.key==='boost'?{icon:'🌶️',name:'Extra Hot Sauce',desc:'All weapons hit '+Math.round(SURVIVAL.boost*100)+'% harder. Stacks every time you take it.'}:{icon:'❤️',name:'Second Wind',desc:'Recover 35 health.'}),evo=c.level===6&&EVOLUTIONS[c.key];
  const kind=evo?'evo':PASSIVES[c.key]?'pas':c.key==='heal'||c.key==='cash'||c.key==='boost'?'heal':c.level===1?'new':'up';
  const label={evo:'★ EVOLUTION',pas:'PASSIVE · RANK '+c.level,heal:c.key==='cash'?'BONUS':c.key==='boost'?'DAMAGE · STACK '+c.level:'RECOVERY',new:'NEW WEAPON',up:'UPGRADE · LEVEL '+c.level}[kind];
  const desc=evo?evo.desc:PASSIVES[c.key]?w.desc:c.level===1?w.desc:upgradeDesc(c.key,c.level);
  const recipe=EVOLUTIONS[c.key],card=PASSIVE_CARD[c.key],name=evo?evo.name:w.name,artKey=evo?c.key+'2':c.key==='boost'?'chili':c.key;
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
function finish(text){$('recovery').hidden=true;let earned=settle(progress,g);saveProgress();updateProgress();$('bombBtn').hidden=true;$('pocket').hidden=true;$('cardMenu').hidden=true;$('itemIntro').hidden=true;introQueue.length=0;stick=null;keys={};$('upgrade').hidden=true;$('pauseScreen').hidden=true;const won=g.state==='won',hasNext=won&&g.stage.id===1;logEvent('overtime_run_end',{mode:modeName(g.stage),result:won?'won':'lost',time_band:timeBand(g.t),bosses_beaten:g.bossesBeaten||0});const stageName=g.stage.name.toUpperCase(),boss=g.enemies.find(e=>e.boss),bossName=g.stage.bossName.replace(/\B\w+/g,w=>w.toLowerCase());
 // Build 18: end screen. One layout for a clear and a loss; the art, headline and main button change.
 $('end').classList.toggle('won',won);$('end').classList.toggle('has-next',hasNext);$('end').scrollTop=0;
 $('endTitle').innerHTML=won?'STAGE <span>CLEAR!</span>':'CLOCKED <span>OUT</span>';
 $('nextStage').hidden=!hasNext;
 $('again').innerHTML=`<b>${hasNext?'REPLAY':won?'PLAY AGAIN':'TRY AGAIN'}</b><span>${stageName}</span><i aria-hidden="true">→</i>`;
 $('home').textContent=hasNext?'Back to briefing':'MAIN MENU';
 $('receipt').classList.toggle('surv',g.endless);$('endBoard').hidden=!g.endless;shareLabel(g.endless?'SHARE MY TIME':won?'SHARE THE WIN':'CHALLENGE A FRIEND');
 if(g.endless){postSurvivalTime(g);
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
function updateUI(){if(!g)return;$('recovery').hidden=g.state!=='countdown';$('recoveryCircle').style.setProperty('--resume-angle',(clamp(1-g.resumeLeft/RECOVERY_SECONDS,0,1)*360)+'deg');$('boost').hidden=g.caffeine<=0||!['playing','countdown','paused','upgrade','card','intro'].includes(g.state);renderPocket();$('boost').textContent='☕ CAFFEINE RUSH · '+Math.ceil(g.caffeine)+'s';$('money').textContent=g.tokens.toLocaleString();$('timer').textContent=g.endless?format(g.t):g.phase==='boss'?'BOSS':format(Math.max(0,g.stage.survival-g.t));$('health').style.width=g.player.hp/g.player.max*100+'%';$('hp').textContent=Math.ceil(g.player.hp);$('xp').style.width=clamp(g.xp/g.need*100,0,100)+'%';let wait=Math.ceil((g.nextUpgradeAt||0)-g.t);$('level').textContent='LVL '+g.level+((g.xp>=g.need||g.pendingBriefcases>0)&&wait>0?' · PROMOTION IN '+wait+'s':'');let bossIn=g.endless?g.nextBossAt-g.t:g.phase==='boss'?0:g.stage.survival-g.t,bossSoon=bossIn>0&&bossIn<=30;$('mission').textContent=bossSoon?'BOSS IN 0:'+String(Math.ceil(bossIn)).padStart(2,'0'):g.endless?'SURVIVAL · TIER '+(g.tier+1):'STAGE '+g.stage.id+' · '+(g.phase==='boss'?'DEFEAT THE BOSS':'SURVIVE THE WAVES');$('mission').classList.toggle('boss-soon',bossSoon);$('bossHud').hidden=!(g.endless?g.boss:g.phase==='boss')||g.state==='won'||g.state==='lost';$('bossNote').textContent=g.endless?'BEAT THE BOSS FOR A BRIEFCASE':'DEFEAT THE BOSS TO CLEAR THE STAGE';$('hud').classList.toggle('boss-active',!$('bossHud').hidden);if(g.boss){let percent=Math.ceil(Math.max(0,g.boss.hp)/g.boss.max*100);$('bossName').textContent=g.stage.bossName;$('bossPercent').textContent=percent+'%';$('bossHealth').style.width=percent+'%';}$('kills').textContent=g.kills+' KOs';$('loadout').innerHTML=Object.entries(g.weapons).filter(([,l])=>l).map(([k,l])=>`<div title="${WEAPONS[k].name}">${iconFor(l===6?k+'2':k,WEAPONS[k].icon)}<small>${l===6?'EVOLVED':'LV '+l}</small></div>`).join('')+(g.passives.speed?`<div title="Bathroom Dash: ${g.passives.speed*10}% faster">${iconFor('speed','👟')}<small>+${g.passives.speed*10}%</small></div>`:'')+(g.boosts?`<div title="Extra Hot Sauce: ${g.boosts*10}% more damage">${iconFor('chili','🌶️')}<small>+${g.boosts*10}%</small></div>`:'');$('hint').hidden=g.t>10;$('bombBtn').hidden=g.state==='won'||g.state==='lost';$('bombBtn').disabled=g.state!=='playing'||g.cd.bomb>0;$('bombStatus').textContent=g.cd.bomb>0?Math.ceil(g.cd.bomb)+'s':'READY';$('bombBtn').style.setProperty('--charge',Math.max(0,1-g.cd.bomb/g.bombCooldown())*100+'%');$('combo').textContent=g.combo>=5?g.combo+' KOs IN A ROW':'';let hb=$('hud').offsetHeight;if(hb){$('combo').style.top=(hb+10)+'px';$('toast').style.top=(hb+36)+'px';}}
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
// Build 31: every supply box is a mystery box, drawn from above: a taped cardboard box with a gold "?".
function supply(s){
 if(s.hp<=0)return;
 const x=s.x,y=s.y,bob=Math.sin(g.t*3+x*.01)*1.5;circle(x,y+22,34,'#0004');
 ctx.save();if(s.flash>0)ctx.globalAlpha=.6;
 circle(x,y,40+Math.sin(g.t*4+x*.01)*2,'#ffd25a18');
 rounded(x-29,y-29+bob,58,58,6,'#b98a4f','#e9c27d');
 rounded(x-27,y-27+bob,54,54,5,null,'#8f6534');
 rounded(x-29,y-2+bob,58,4,0,'#9a6f3c');
 rounded(x-6,y-29+bob,12,58,0,'#dcb874');
 circle(x,y+bob,15,'#3a2414','#ffd45e');text('?',x,y+8+bob,22,'#ffd45e');
 ctx.restore();rounded(x-34,y-56,68,17,4,'#102b3ee8');text('MYSTERY',x,y-44,9,'#ffe08a');
 if(s.hp<s.max){rounded(x-22,y+32,44,3,1,'#152b32');rounded(x-22,y+32,44*s.hp/s.max,3,1,'#f5cb78');}
}
// Wet Floor: a yellow puddle seen from above, fading out at the end.
function puddle(u){const fade=clamp(Math.min((u.life-u.t)/1.5,u.t/.25),0,1),r=u.r;ctx.save();ctx.globalAlpha=fade;
 const lobes=[[0,0,1,.78],[.42,.18,.55,.5],[-.45,-.12,.5,.45],[.1,-.42,.45,.38],[-.2,.4,.42,.36]];
 ctx.beginPath();for(const [dx,dy,rx,ry] of lobes){ctx.moveTo(u.x+dx*r+rx*r,u.y+dy*r);ctx.ellipse(u.x+dx*r,u.y+dy*r,rx*r,ry*r,0,0,Math.PI*2);}ctx.fillStyle='#f2cb2f66';ctx.fill();
 ctx.beginPath();ctx.ellipse(u.x,u.y,r*.98,r*.76,0,0,Math.PI*2);ctx.strokeStyle='#ffe27a99';ctx.lineWidth=2;ctx.stroke();
 ctx.beginPath();ctx.ellipse(u.x-r*.25,u.y-r*.2,r*.32,r*.12,-.4,0,Math.PI*2);ctx.fillStyle='#fff6c055';ctx.fill();
 const im=itemImg('wet');if(im)ctx.drawImage(im,u.x+r*.35,u.y-r*.75,28,28);ctx.restore();}
// A mystery item lying on the floor, waiting to be picked up.
function itemDrop(d){const pulse=Math.sin(g.t*5+d.x)*2;circle(d.x,d.y+16,15,'#0005');circle(d.x,d.y,22+pulse,'#ffe08a22','#ffe08a');
 const im=itemImg(d.item);if(im)ctx.drawImage(im,d.x-17,d.y-17,34,34);else text('?',d.x,d.y+7,20,'#ffe08a');
 text(ITEMS[d.item].name.toUpperCase(),d.x,d.y-29,8,'#ffe08a');}
// Executive Bidet: a spray from Herman in the way he is facing, about three enemy bodies long.
function bidetSpray(){const p=g.player,f=g.face,L=MYSTERY.bidetLength,n={x:-f.y,y:f.x},fade=Math.min(1,g.bidet/.4);ctx.save();ctx.globalAlpha=fade;
 const sx=p.x+f.x*16,sy=p.y+f.y*16,w0=6,w1=MYSTERY.bidetWidth*.9,ex=p.x+f.x*L,ey=p.y+f.y*L;
 const grad=ctx.createLinearGradient(sx,sy,ex,ey);grad.addColorStop(0,'#e8f8ffee');grad.addColorStop(1,'#7fd3ff33');
 ctx.beginPath();ctx.moveTo(sx+n.x*w0,sy+n.y*w0);ctx.lineTo(ex+n.x*w1,ey+n.y*w1);ctx.lineTo(ex-n.x*w1,ey-n.y*w1);ctx.lineTo(sx-n.x*w0,sy-n.y*w0);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
 for(let i=0;i<9;i++){const t=((g.t*3.2+i/9)%1),side=Math.sin(i*12.9)*w1*t;circle(sx+(ex-sx)*t+n.x*side,sy+(ey-sy)*t+n.y*side,2.5+t*3,'#e8f8ffcc');}
 ctx.restore();}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#091d27';ctx.fillRect(0,0,W,H);if(!g){world();floor();ctx.restore();return;}let p=g.player;cam.x+=(p.x-cam.x)*.12;cam.y+=(p.y-cam.y)*.12;world();if(shake>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);floor();
 for(const u of g.puddles)puddle(u);for(const s of g.supplies)supply(s);
 for(let a of g.bossAttacks){let progress=clamp(a.t/a.fuse,0,1);circle(a.x,a.y,a.r,'#ed62432b','#ffad78');circle(a.x,a.y,a.r*progress,'#ff633633');ctx.lineWidth=4;circle(a.x,a.y,a.r,null,'#ff9d68');text('MOVE!',a.x,a.y+5,20,'#ffdcaf');}
 for(let r of g.raids){ctx.save();ctx.translate(r.x,r.y);ctx.strokeStyle='#ff8f6077';ctx.lineWidth=8;ctx.setLineDash([12,8]);ctx.beginPath();ctx.arc(0,0,340,r.gap+.65,r.gap+Math.PI*2-.65);ctx.stroke();ctx.restore();text('INCOMING RUSH',r.x,r.y-105,15,'#ffad7b');}
 for(let e of g.enemies){if(e.windup>0||e.dash>0){ctx.strokeStyle=e.dash>0?'#ffb883':'#ff6d6688';ctx.lineWidth=22;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+e.aim.x*145,e.y+e.aim.y*145);ctx.stroke();if(e.windup>0)text('!',e.x,e.y-42,22,'#ff9c7b');}}
 for(let c of g.clouds){let alpha=.14*(1-c.t/c.life);circle(c.x,c.y,c.r,`rgba(157,210,93,${alpha})`);for(let i=0;i<3;i++)circle(c.x+Math.cos(c.t+i*2)*c.r*.35,c.y+Math.sin(c.t+i*2)*c.r*.35,c.r*.65,`rgba(157,210,93,${alpha})`);}
 for(let b of g.bombs){ctx.setLineDash([6,9]);ctx.lineWidth=1.5;circle(b.x,b.y,b.lure,null,'#9dca5455');ctx.setLineDash([]);circle(b.x,b.y,b.blast,'#bde66b0a');let pulse=18+b.t/b.fuse*6+Math.sin(b.t*10)*2;for(let i=0;i<5;i++){let a=i*1.257+b.t,r=b.lure*(1-(b.t*.5+i*.2)%1);circle(b.x+Math.cos(a)*r,b.y+Math.sin(a)*r,3,'#dcff9277');}let crowd=g.enemies.filter(e=>e.attracted&&Math.hypot(e.x-b.x,e.y-b.y)<b.lure).length;if(crowd)text(crowd+' LURED',b.x,b.y+48,12,'#e2ff92');circle(b.x,b.y,pulse+7,'#b5e66d22');let shine=ctx.createRadialGradient(b.x-7,b.y-8,1,b.x,b.y,21);shine.addColorStop(0,'#81964b');shine.addColorStop(.45,'#344732');shine.addColorStop(1,'#111f22');circle(b.x,b.y,pulse,shine,'#d4ef87');rounded(b.x-6,b.y-25,12,10,3,'#d5c77f','#ffe7a5');circle(b.x,b.y,9,'#b9dc6e');text('☣',b.x,b.y+6,17,'#273b22');for(let i=0;i<3;i++){let a=b.t*2+i*2.1;circle(b.x+Math.cos(a)*12,b.y-30-(b.t*20+i*12)%35,5+i,'#bce77544');}text((b.fuse-b.t).toFixed(1)+'s',b.x,b.y-30,12,'#d8f79a');ctx.strokeStyle='#dfff95';ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y,25,-Math.PI/2,-Math.PI/2+Math.PI*2*b.t/b.fuse);ctx.stroke();}
 for(let d of g.drops){if(d.item){itemDrop(d);continue;}if(d.chest){circle(d.x,d.y,26+Math.sin(g.t*5)*3,'#ffca5b22','#ffcc67');if(briefcaseArt.complete&&briefcaseArt.naturalWidth)ctx.drawImage(briefcaseArt,d.x-19,d.y-20,38,38);else{rounded(d.x-14,d.y-10,28,21,3,'#97612d','#ffdc82');rounded(d.x-6,d.y-16,12,7,2,null,'#ffdc82');}text('BONUS',d.x,d.y-24,8,'#ffdc82');}else if(d.coffee){circle(d.x,d.y,18,'#603d2d','#ffd981');text('☕',d.x,d.y+8,24);text('RUSH',d.x,d.y-25,10,'#ffdf91');}else if(d.magnet){circle(d.x,d.y,16,'#243e64','#a1dcff');if(magnetImg.complete&&magnetImg.naturalWidth)ctx.drawImage(magnetImg,d.x-12,d.y-12,24,24);}else if(d.heal){if(d.life!=null&&d.life<5&&Math.floor(d.life*6)%2)continue;circle(d.x+2,d.y+10,16,'#0004');healthKit(d.x,d.y);}else{let radius=d.value>1?13:10;circle(d.x,d.y+3,radius,'#0005');ctx.drawImage(tokenCanvas,d.x-radius,d.y-radius,radius*2,radius*2);if(d.value>1)text('×'+d.value,d.x,d.y+radius+10,9,'#ffdd83');}}
 if(g.bidet>0)bidetSpray();for(let e of [...g.enemies].sort((a,b)=>a.y-b.y))enemy(e);
 for(const e of g.enemies)if(e.hp>0&&e.frozen>0){circle(e.x,e.y-6,(e.r||14)+8,'#a8e6ff3a','#d6f6ff');}
 // Transparent full-body mascot, grounded shadow and movement animation.
 ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.38);circle(0,25,26,'#0007');ctx.restore();circle(p.x,p.y,21,null,'#f4dc8470');if(g.t<5&&g.state==='playing'){ctx.globalAlpha=1-g.t/5;text('YOU',p.x,p.y+56,15,'#9de6c1');circle(p.x,p.y+4,34,null,'#9de6c1');ctx.globalAlpha=1;}ctx.save();ctx.translate(p.x,p.y);let moving=g.moving&&g.state==='playing';ctx.scale(g.facingX,1);ctx.globalAlpha=p.inv>0&&Math.floor(p.inv*15)%2?.45:1;if(moving&&hermanWalk.complete&&hermanWalk.naturalWidth){let frame=Math.floor(g.walkDistance/20)%4,cw=hermanWalk.naturalWidth/2,ch=hermanWalk.naturalHeight/2;ctx.drawImage(hermanWalk,(frame%2)*cw,Math.floor(frame/2)*ch,cw,ch,-42,-62,84,84);}else if(herman.complete&&herman.naturalWidth)ctx.drawImage(herman,-42,-62,84,84);ctx.restore();
 for(let s of g.shots){ctx.save();if(s.big){ctx.translate(s.x,s.y);ctx.scale(1.6,1.6);plunger(0,0,s.t*15);}else plunger(s.x,s.y,s.t*15);ctx.restore();}for(let o of g.orbits||[]){rounded(o.x-11,o.y-13,22,26,6,'#e7eee3','#a8baba');circle(o.x,o.y-8,7,'#b1c2bb');circle(o.x,o.y-8,3,'#3b5355');}
 for(let w of g.waves){if(w.t<0)continue;ctx.globalAlpha=1-w.t/w.life;ctx.lineWidth=9;circle(w.x,w.y,w.max*w.t/w.life,null,w.royal?'#ffdd72':'#76e1e9');ctx.globalAlpha=1;}
 for(let n of g.numbers){ctx.globalAlpha=1-n.t/n.life;text(n.text,n.x,n.y-n.t*40,n.big?27:13,n.color);}ctx.globalAlpha=1;
 for(let f of g.fx){ctx.globalAlpha=1-f.t/f.life;ctx.lineWidth=5;circle(f.x,f.y,f.r*f.t/f.life,f.color+'28',f.color);for(let i=0;i<8;i++){let a=i*Math.PI/4;circle(f.x+Math.cos(a)*f.r*f.t/f.life,f.y+Math.sin(a)*f.r*f.t/f.life,4,f.color);}ctx.globalAlpha=1;}
 ctx.restore();
 // Direction to executives uses screen edges and never obscures the health display.
 const bar=g.phase==='boss'||g.endless&&g.boss;
 const edge=(wx,wy,label,color,size=1)=>{let x=W/2+(wx-cam.x)*scale,y=H*.53+(wy-cam.y)*scale;if(!(x<40||x>W-40||y<(bar?245:175)||y>H-120))return;let a=Math.atan2(y-H*.53,x-W/2),ax=clamp(x,30,W-30),ay=clamp(y,bar?260:190,H-120);ctx.save();ctx.translate(ax,ay);ctx.rotate(a);ctx.scale(size,size);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-9,-10);ctx.lineTo(-9,10);ctx.fill();ctx.restore();text(label,ax,ay+18+7*size,size>1?11:9,color);};
 for(let e of g.enemies.filter(e=>e.type==='exec'))edge(e.x,e.y,e.boss?'BOSS':'EXEC',e.boss?'#ff8a66':'#ffce66',e.boss?1.5:1);
 // Build 28: briefcases and first aid kits get an arrow too (kits only while Herman can use one).
 for(let d of g.drops){if(d.chest)edge(d.x,d.y,'CASE','#ffce66');else if(d.heal&&p.hp<=p.max-8)edge(d.x,d.y,'KIT','#ff9aa0');}
 // Mini-map shows the pursuing boss and your position.
 let mx=W-87,my=H-215;rounded(mx-7,my-7,76,76,5,'#071e2bd9','#45656b');for(let e of g.enemies.filter(e=>e.type==='exec'))circle(mx+e.x/1800*60,my+e.y/1800*60,3.5,'#ffd36b');circle(mx+p.x/1800*60,my+p.y/1800*60,3,'#9de6c1');
 if(stick){circle(stick.x,stick.y,45,'#a6d3c015','#b2d3ca55');circle(stick.x+stick.dx*35,stick.y+stick.dy*35,17,'#b2dcc177','#c8edda');}
}
function frame(now){let elapsed=Math.max(0,(now-last)/1000),dt=Math.min(elapsed,.25);last=now;if(g){nextIntro();if(g.state==='countdown')g.step(elapsed,input());else{let remaining=dt;while(remaining>0){let step=Math.min(remaining,.05);g.step(step,input());remaining-=step;}}for(let event of g.events.splice(0)){if(event.type==='boss-arrive')banner(g.stage.bossName,event.text,'boss');else if(event.type==='gold-open')banner('GOLD UNLOCKED','YOUR NEXT BRIEFCASE TURNS IT GOLD','best');else if(event.text&&event.type!=='end'&&event.type!=='got')showToast(event.text);if(event.type==='end')endAudio(g.state==='won');else sound(event.type==='gold-saved'?'upgrade':event.type==='gold-open'?'evolve':event.type);
 // Herman speaks at a few moments (voice.mjs decides whether he actually does).
 if(event.type==='upgrade'&&g.upgradeKind==='promotion')say('promotion',.3);else if(event.type==='evolve')say('evolve',.6);else if(event.type==='combo')say('streak');else if(event.type==='boom'&&event.text)say('bomb',.5);else if(event.type==='supply'&&event.text.startsWith('RUSH SURVIVED'))say('rush');else if(event.type==='exec-in')say('exec',.8);else if(event.type==='hurt'&&g.player.hp>0&&g.player.hp<g.player.max*.25)say('low',.3);if(event.type==='level')upgrades();if(event.type==='card')showCard();if(event.type==='got')noteItem(event.text);if(event.type==='end')finish(event.text);if(event.type==='boom')shake=9;if(event.type==='evolve')shake=12;if(event.type==='hurt')shake=5;}
 // Build 28: live leaderboard moments in survival. One banner when the run beats the player's own best, and one
 // each time it goes past a time on the public top 10.
 if(g.endless&&g.state==='playing'){if(bestToBeat&&g.t>bestToBeat){bestToBeat=0;banner('NEW PERSONAL BEST','EVERY SECOND NOW IS A RECORD','best');}const r=passRivals(rivals,g.t);if(r.passed){rivals=r.rest;banner('YOU PASSED #'+r.passed.place,r.passed.name+' · '+format(r.passed.seconds),'best');}}
 // Heartbeat about once a second while Herman is under 25% health.
 if(g.state==='playing'&&g.player.hp>0&&g.player.hp<g.player.max*.25)sound('heartbeat');
if(now-lastUI>100){updateUI();lastUI=now;}}if(g){$('recovery').hidden=g.state!=='countdown';$('recoveryCircle').style.setProperty('--resume-angle',(clamp(1-g.resumeLeft/RECOVERY_SECONDS,0,1)*360)+'deg');}shake=Math.max(0,shake-dt*35);if(now>toastUntil)$('toast').style.opacity=0;stepBanner(now);if(now-musicSync>250){musicSync=now;syncMusic();}draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
