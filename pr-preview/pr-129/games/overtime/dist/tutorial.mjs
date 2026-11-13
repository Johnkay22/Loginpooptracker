import {Practice} from './tutorial-model.mjs';
import {WEAPONS,PASSIVES,EVOLUTIONS} from './engine.mjs';
const STEPS=[
 {label:'Move',title:'You move. Herman attacks.',text:'Drag inside the practice floor, or use WASD / arrow keys. Keep moving through open space; your starting weapon attacks automatically.',task:'Move Herman to try it.',tip:'In a real shift, drag anywhere on the arena. You do not need to aim or tap to attack.'},
 {label:'Level up',title:'Collect cash. Get promoted.',text:'Move over the gold coins to fill your XP bar. When a promotion opens, the action stops so you can choose one upgrade.',task:'Collect all 5 Petty Cash, then choose an upgrade.',tip:'Collected Petty Cash also buys permanent perks in the Break Room after your run. Game currency only.'},
 {label:'Stink Bomb',title:'Drop it. Lure them. Walk away.',text:'Press STINK BOMB or Space / B. It drops behind Herman, draws normal enemies in, then explodes after 3 seconds.',task:'Drop a bomb and watch the crowd gather.',tip:'Starts ready. The base recharge is 12 seconds from deployment. On a phone, use a second finger while moving.'},
 {label:'Recover',title:'Low health? Look for first aid.',text:'Survive a Corporate Rush to earn a red first aid kit. Pick it up for +16 health. Coffee gives a temporary boost, not health.',task:'Your health is 60 / 100. Pick the item that heals you.',tip:'Kits appear 6 seconds after a rush arrives and vanish after 20 seconds. They are only collected when at least 8 health is missing.'},
 {label:'Boss',title:'Zero on the clock isn’t the end.',text:'Survive 3 minutes, then defeat the executive boss. When a red circle appears, move out before it bursts. Your weapons keep attacking.',task:'Start the attack, then move out of the red circle.',tip:'The boss has no time limit and resists the bomb’s lure. Bomb blasts still damage it. Defeat the boss to clear the stage.'},
 {label:'Clock in',title:'You’re ready for your shift.',text:'Keep moving → collect cash → choose upgrades → defeat the boss. If health reaches zero, the shift ends. Collected cash helps your next run.',task:'Your first goal: survive the Office Floor, then beat The Floor Manager.',tip:'Open How to Play from the pause menu whenever you need a refresher.'},
];
const ART={plunger:'assets/icons/plunger.webp',speed:'assets/icons/speed.webp',bomb:'assets/icons/bomb.webp',coffee:'assets/icons/coffee.webp',heal:'assets/icons/heal.webp'};
const icon=(key)=>`<img src="${ART[key]}" alt="">`;
export function setupTutorial({hermanSrc,enemySrc,onOpen=()=>{},onClose=()=>{}}){
 const $=id=>document.getElementById(id),dialog=$('howSheet'),content=$('lessonContent'),floor=$('practiceFloor');
 floor.style.setProperty('--corporate-sprite',`url("${enemySrc}")`);
 let step=0,practice,keys={},stick=null,raf=0,last=0,opener=null,completed=new Set(),lastMessage='',demo=false;
 $('lessonNav').innerHTML=STEPS.map((s,i)=>`<button type="button" data-step="${i}" aria-label="Lesson ${i+1}: ${s.label}"><span>${String(i+1).padStart(2,'0')}</span>${s.label}</button>`).join('');
 const status=text=>{if(text!==lastMessage){$('lessonStatus').textContent=text;lastMessage=text;}};
 function resetInput(){keys={};stick=null;}
 function render(){
  resetInput();demo=false;practice=new Practice(step);lastMessage='';
  const s=STEPS[step];$('lessonCount').textContent=`FIELD GUIDE / ${String(step+1).padStart(2,'0')} OF 06`;
  $('lessonTitle').textContent=s.title;$('lessonText').textContent=s.text;$('lessonTip').textContent=s.tip;
  $('lessonNav').querySelectorAll('button').forEach((b,i)=>{b.setAttribute('aria-current',i===step?'step':'false');b.classList.toggle('is-complete',completed.has(i));});
  $('lessonBack').disabled=step===0;$('lessonNext').textContent=step===5?'BACK TO '+(opener?.id==='howPause'?'BREAK':'BRIEFING'):'NEXT LESSON →';
  $('lessonDemo').hidden=step===5;$('lessonReplay').hidden=step===5;
  floor.hidden=step===5;content.innerHTML='';
  floor.innerHTML=`<div class="practice-label">PRACTICE FLOOR <span>NO DAMAGE · NO SAVES</span></div><div class="practice-mark" aria-hidden="true">PP / TRAINING</div><div class="practice-zone" aria-hidden="true" hidden></div><div class="practice-herman" aria-hidden="true"><img src="${hermanSrc}" alt=""><span>YOU</span></div><div class="practice-items"></div><div class="practice-effect" aria-hidden="true"></div>`;
  if(step===0)floor.insertAdjacentHTML('beforeend',`<div class="practice-auto">${icon('plunger')}<span>AUTO ATTACK</span></div><div class="practice-destination" aria-hidden="true">MOVE →</div>`);
  if(step===1)content.innerHTML=`<div class="practice-xp"><span id="practiceCash">0 / 5 XP</span><progress id="practiceXP" max="5" value="0" aria-label="Practice XP"></progress></div><div id="practiceChoices" class="practice-choices" hidden><button type="button" data-choice="plunger">${icon('plunger')}<span><b>Plungerang · Lv 2</b>Upgrade your starting weapon</span></button><button type="button" data-choice="speed">${icon('speed')}<span><b>Bathroom Dash</b>Move 10% faster</span></button></div>`;
  if(step===2)floor.insertAdjacentHTML('beforeend','<div class="practice-crowd" aria-hidden="true"><i class="practice-worker"></i><i class="practice-worker"></i><i class="practice-worker"></i></div>');
  if(step===4)floor.insertAdjacentHTML('beforeend','<div class="practice-boss" aria-hidden="true"><span>BOSS</span></div>');
  if(step===2)content.innerHTML=`<button id="practiceBomb" class="practice-action" type="button">${icon('bomb')}<span>STINK BOMB <small id="practiceBombState">READY</small></span></button>`;
  if(step===3){floor.querySelector('.practice-items').innerHTML=`<div class="practice-pickups"><button type="button" data-heal="coffee">${icon('coffee')}<span>Coffee</span></button><button type="button" data-heal="kit">${icon('heal')}<span>First aid kit</span></button></div>`;content.innerHTML='<div class="practice-hp"><span id="practiceHP">HEALTH 60 / 100</span><progress id="practiceHealth" max="100" value="60" aria-label="Practice health"></progress></div>';}
  if(step===4)content.innerHTML='<button id="practiceAttack" class="practice-action" type="button">START BOSS ATTACK</button>';
  if(step===5){content.innerHTML=`<div class="guide-route"><div><span>01</span><b>Survive</b><small>3 minutes of waves</small></div><div><span>02</span><b>Beat the boss</b><small>Dodge the red circles</small></div><div><span>03</span><b>Get stronger</b><small>Spend cash in Break Room</small></div></div><details class="guide-reference"><summary>Controls at a glance</summary><dl><dt>Move</dt><dd>Drag on the arena · WASD / arrows</dd><dt>Attack</dt><dd>Automatic (except Stink Bomb)</dd><dt>Stink Bomb</dt><dd>Tap the button · Space / B</dd><dt>Pause</dt><dd>Ⅱ button · P / Escape</dd></dl><p>Switching tabs pauses the game. After choosing an upgrade, a green circle gives you 2 seconds to get ready.</p></details><details class="guide-reference"><summary>How do weapons evolve?</summary><p>Reach weapon level 5, take at least one rank of its matching perk, and survive at least 45 seconds. Then select the evolution when offered in a promotion.</p><div class="guide-recipes">${Object.entries(EVOLUTIONS).map(([k,e])=>`<p><b>${WEAPONS[k].name}</b> + ${PASSIVES[e.requires].name}<span>→ ${e.name}</span></p>`).join('')}</div></details><details class="guide-reference"><summary>Your mission & next unlock</summary><h3 id="guideMissionTitle"></h3><p id="guideMissionText"></p><p id="guideNextGoal"></p></details>`;$('guideMissionTitle').textContent=$('briefingTitle').textContent;$('guideMissionText').textContent=$('briefingText').textContent;$('guideNextGoal').textContent=$('nextGoal').textContent;}
  status(s.task);paint();
 }
 function paint(){
  if(step===5)return;
  const p=practice,hero=floor.querySelector('.practice-herman');hero.style.left=p.x/4.8+'%';hero.style.top=p.y/2.4+'%';
  floor.classList.toggle('practice-done',p.complete);floor.classList.toggle('practice-blast',p.result==='blast');
  if(step===0&&p.complete)status('Nice. Keep moving; Herman handles the attacks automatically.');
  if(step===1){if(floor.querySelector('.practice-items').dataset.cash!==String(p.cash)){floor.querySelector('.practice-items').dataset.cash=p.cash;floor.querySelector('.practice-items').innerHTML=p.coins.map(c=>`<img class="practice-coin" src="assets/menu/coin.webp" alt="${c.value} Petty Cash" style="left:${c.x/4.8}%;top:${c.y/2.4}%">`).join('');}$('practiceCash').textContent=`${p.cash} / 5 XP`;$('practiceXP').value=p.cash;$('practiceChoices').hidden=p.cash<5;
   if(p.cash>=5)status(p.choice?'Promotion chosen. In the game, a 2-second green countdown gets you ready to move again.':'Promotion earned! Choose one upgrade below.');
   content.querySelectorAll('[data-choice]').forEach(b=>{b.disabled=!!p.choice;b.classList.toggle('chosen',b.dataset.choice===p.choice);});
  }
  if(step===2){$('practiceBomb').disabled=p.cooldown>0;$('practiceBombState').textContent=p.cooldown>0?`RECHARGING · ${Math.ceil(p.cooldown)}s`:'READY';
   const b=p.bomb,items=floor.querySelector('.practice-items');
   if(b){
    if(!items.firstElementChild)items.innerHTML=`<div class="practice-lure" style="left:${b.x/4.8}%;top:${b.y/2.4}%">${icon('bomb')}<span></span></div>`;
    items.querySelector('span').textContent=Math.ceil(b.left)+'s';
   }else items.replaceChildren();
   floor.querySelectorAll('.practice-worker').forEach((enemy,i)=>{const x=300+i*55,y=65+i*55,t=b?Math.min(1,(3-b.left)/2):0;enemy.hidden=p.result==='blast';enemy.style.left=(x+((b?.x??x)+35-x)*t)/4.8+'%';enemy.style.top=(y+((b?.y??y)+(i-1)*30-y)*t)/2.4+'%';});
   if(b)status('The crowd follows the bomb. Keep moving while its 3-second fuse burns.');else if(p.complete)status('Boom! The crowd took the blast. The bomb is recharging.');
  }
  if(step===3){$('practiceHealth').value=p.hp;$('practiceHP').textContent=`HEALTH ${p.hp} / 100`;if(p.result==='coffee')status('Coffee boosts you temporarily, but does not heal. Try the first aid kit.');if(p.complete)status('That’s it: +16 health. Watch for red kits after Corporate Rushes.');}
  if(step===4){const z=floor.querySelector('.practice-zone'),w=p.warning;z.hidden=!w;if(w){z.style.left=w.x/4.8+'%';z.style.top=w.y/2.4+'%';} $('practiceAttack').disabled=!!w;$('practiceAttack').textContent=p.result&&!w?'TRY ANOTHER ATTACK':'START BOSS ATTACK';if(w)status('Move! Leave the red circle before the 1.1-second warning ends.');else if(p.result==='dodged')status('Dodged! Keep circling and let your weapons wear the boss down.');else if(p.result==='hit')status('Still inside the circle. No damage here — try again and move as soon as it appears.');}
  if(p.complete){completed.add(step);$('lessonNav').querySelector(`[data-step="${step}"]`).classList.add('is-complete');}
 }
 function frame(now){
  if(!dialog.open)return;const dt=Math.min((now-last)/1000,.05);last=now;
  if(!document.hidden){let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);if(stick){dx=stick.dx;dy=stick.dy;}
   if(demo){if(step===0)dx=1;if(step===1&&practice.coins.length){const c=practice.coins[0];dx=c.x-practice.x;dy=c.y-practice.y;}if(step===4)dx=1;}
   practice.move(dx,dy,dt);practice.tick(dt);if(demo&&step===1&&practice.cash>=5)practice.choose('speed');if(practice.complete)demo=false;paint();}
  raf=requestAnimationFrame(frame);
 }
 function go(n){step=n;render();$('lessonTitle').focus();}
 function showDemo(){render();demo=true;if(step===2)practice.deploy();if(step===3)practice.heal('kit');if(step===4)practice.attack();paint();}
 function close(){dialog.close();}
 dialog.addEventListener('close',()=>{cancelAnimationFrame(raf);resetInput();onClose();opener?.focus();});
 dialog.addEventListener('cancel',()=>resetInput());
 dialog.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const focusable=[...dialog.querySelectorAll('button:not(:disabled),summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const first=focusable[0],last=focusable.at(-1);
  if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('lessonTitle'))){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 });
 $('howClose').onclick=close;$('lessonBack').onclick=()=>go(Math.max(0,step-1));$('lessonNext').onclick=()=>step===5?close():go(step+1);
 $('lessonReplay').onclick=()=>{render();$('lessonTitle').focus();};$('lessonDemo').onclick=showDemo;
 $('lessonNav').onclick=e=>{const b=e.target.closest('[data-step]');if(b)go(Number(b.dataset.step));};
 content.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.choice)practice.choose(b.dataset.choice);if(b.id==='practiceBomb')practice.deploy();if(b.id==='practiceAttack')practice.attack();paint();};
 floor.addEventListener('click',e=>{const b=e.target.closest('[data-heal]');if(b){practice.heal(b.dataset.heal);paint();}});
 floor.addEventListener('pointerdown',e=>{if(e.target.closest('button')||stick)return;demo=false;floor.focus();stick={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0};floor.setPointerCapture(e.pointerId);});
 floor.addEventListener('pointermove',e=>{if(stick?.id!==e.pointerId)return;const x=e.clientX-stick.x,y=e.clientY-stick.y,d=Math.max(35,Math.hypot(x,y));stick.dx=x/d;stick.dy=y/d;});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])floor.addEventListener(event,e=>{if(stick?.id===e.pointerId)stick=null;});
 window.addEventListener('keydown',e=>{if(!dialog.open)return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();demo=false;keys[k]=true;}if((k==='b'||k===' '&&!e.target.closest('button,summary'))&&!e.repeat){e.preventDefault();practice.deploy();paint();}});
 window.addEventListener('keyup',e=>{delete keys[e.key.toLowerCase()];});window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',resetInput);
 return {open(button){if(dialog.open)return;opener=button;onOpen();step=0;render();dialog.showModal();$('lessonTitle').focus();last=performance.now();raf=requestAnimationFrame(frame);}};
}
