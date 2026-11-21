// Build 24: the tips shown under "WHILE YOU'RE HERE" on the pause screen. Numbers and names come from the engine
// so a tuning change cannot leave a tip wrong. Pure: no page access, so the tests can check every tip.
import {SURVIVAL,WEAPONS,PASSIVES,EVOLUTIONS} from './engine.mjs';

// 24x24 line icons, drawn with the current text colour.
const svg=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const TIP_ICONS={
 clock:svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
 briefcase:svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18M11 13h2"/>'),
 alert:svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V13M12 16.5h.01"/>'),
 move:svg('<path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>'),
 bomb:svg('<circle cx="10" cy="14" r="7"/><path d="M15 9l2.5-2.5M17.5 6.5c.8-1.6 2.4-1.9 3.5-.8"/>'),
 kit:svg('<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M9 6V4h6v2M12 10v6M9 13h6"/>'),
 coffee:svg('<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2.5M12 3v2.5"/>'),
 magnet:svg('<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4zM6 8h4M14 8h4"/>'),
 up:svg('<circle cx="12" cy="12" r="9"/><path d="M12 16V8M8.5 11.5 12 8l3.5 3.5"/>'),
 spark:svg('<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z"/>'),
 slots:svg('<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>'),
 trophy:svg('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.6 3.6M16 6h3.5a3 3 0 0 1-3.6 3.6M12 13v4M8.5 20h7M10 17h4"/>'),
 shield:svg('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4"/>'),
 keyboard:svg('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
 crown:svg('<path d="M4 19h16M5 16 3 7l5 4 4-7 4 7 5-4-2 9z"/>'),
};
const tip=(id,icon,text,tone='')=>({id,icon,text,tone});
const DANGER=tip('circles','alert','Get out of red circles before they burst.','warn');

// Every tip that fits the run in progress. The first three are the must-knows for that mode; a paused player sees
// those first, then the rest in this order. `weapons` is the run's weapon levels (0 = not carried, 6 = evolved).
const clockOf=t=>Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
export function tipsFor({endless=false,weapons={},keyboard=false}={}){
 const S=SURVIVAL,minutes=Math.round(S.tierSeconds/60);
 const first=endless?[
  tip('survival-goal','clock',`No finish line. Tougher enemies and a boss every ${minutes} minutes.`),
  tip('survival-evolve','briefcase','Gold executives and bosses drop briefcases. Max weapon + partner perk + briefcase = evolution.'),
  DANGER,
 ]:[
  tip('stage-goal','clock','Outlast the timer, then beat the gold executive boss to clear the stage.'),
  tip('stage-evolve','spark','Max a weapon and carry its partner perk. Its evolution shows up as a promotion choice.'),
  DANGER,
 ];
 // One line per weapon in hand that can still evolve, naming its real partner perk.
 const evolve=Object.keys(WEAPONS).filter(k=>weapons[k]>0&&weapons[k]<6).map(k=>tip('evolve-'+k,'spark',`${WEAPONS[k].name} evolves into ${EVOLUTIONS[k].name}. Its partner perk is ${PASSIVES[EVOLUTIONS[k].requires].name}.`));
 const move=tip('move','move','Drag anywhere to move. Herman attacks on his own.');
 const bomb=tip('bomb','bomb','Stink Bomb lures the crowd, then blows after 3 seconds. Executives and bosses ignore the lure.');
 const boxes=tip('boxes','coffee','Smash the ? boxes for a random item. The stronger it is, the rarer. They refill every 90s.');
 const pocketTip=tip('pocket','briefcase','Air Horn, Health Plan and other keepers go in your pocket above the Stink Bomb. Tap to use.');
 const sweep=tip('sweep','magnet','Every 60 KOs drops a Cash Sweep. Grab it to pull in the Petty Cash on the floor.');
 const rush=tip('rush','kit','Survive a Corporate Rush and a first aid kit drops near Herman.');
 const kitWait=tip('kit-wait','kit',`A first aid kit waits ${S.kitLife} seconds and blinks before it goes. An arrow points to it.`);
 const bar=tip('bar','up','Petty Cash fills the bar under Herman’s health. A full bar is a promotion.');
 const perks=tip('perks','shield','Petty Cash from finished runs buys permanent perks in the Break Room.');
 const keys=keyboard?[tip('keys','keyboard','Keyboard: WASD or arrows to move, Space for the bomb, P to pause.')]:[];
 const rest=endless?[
  move,
  tip('slots','slots',`One run holds ${S.weaponSlots} weapons and ${S.perkSlots} perks. Stink Bomb counts as a weapon.`),
  bomb,
  tip('boss-drop','crown',`Beat a boss and it drops a briefcase and ${S.bossKits} first aid kits.`),
  boxes,
  tip('restock','coffee','Mystery boxes also restock every time a boss clocks in.'),pocketTip,
  tip('board','trophy','Signed in? A new best time posts to the leaderboard. The top 10 are public.'),
  sweep,rush,
  tip('execs','briefcase','Gold executives walk in twice before each boss. Each one carries a briefcase.'),
   tip('gold-clock','clock',`Gold unlocks at ${clockOf(S.goldAt[0])}, a 2nd at ${clockOf(S.goldAt[1])}, more at ${clockOf(S.goldAt[2])}. Early briefcases wait.`),
  bar,
  tip('kit-growth','kit','First aid kits heal more the longer the run goes.'),
  kitWait,
  tip('boost','up','Everything maxed? Extra Hot Sauce keeps adding damage, with no limit.'),
  perks,
 ]:[
  move,bomb,
  tip('boss','crown','The boss follows you and has no time limit. Keep moving and let your weapons work.'),
  boxes,sweep,rush,bar,perks,
 ];
 return [...first,...evolve,...rest,...keys];
}

// Hands out the next tip that is not already on screen. `at` is how many tips this mode has handed out so far, so a
// later pause carries on where the last one stopped instead of repeating the same three.
export function takeTip(pool,at,showing=[]){
 for(let i=0;i<pool.length;i++){const t=pool[(at+i)%pool.length];if(!showing.includes(t.id))return {tip:t,at:at+i+1};}
 return {tip:pool[at%pool.length],at:at+1};
}
