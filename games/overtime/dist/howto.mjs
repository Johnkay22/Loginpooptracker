// Build 25: How to Play as six swipe cards, each with a small moving picture made from the game's own art.
// This file is only the words and the picture markup; the pictures are drawn and animated in style.css (.hs rules).
// Names and numbers come from the engine so a tuning change cannot leave a card wrong.
import {SURVIVAL,WEAPONS,PASSIVES,EVOLUTIONS} from './engine.mjs';

const herman='<i class="mv"><i class="hs-h"></i></i>';
// The evolution card uses the starting weapon as its example.
const W=WEAPONS.plunger.name.toUpperCase(),P=PASSIVES[EVOLUTIONS.plunger.requires].name.toUpperCase(),E=EVOLUTIONS.plunger.name.toUpperCase();
const SCENES={
 move:`<i class="hs-f f2 a"></i><i class="hs-f f1 b"></i>${herman}<i class="hs-i i-plunger p"></i><i class="stick"><b></b></i>`,
 promo:`<i class="bar"><b></b></i><i class="hs-i i-cash c1"></i><i class="hs-i i-cash c2"></i><i class="hs-i i-cash c3"></i><i class="hs-i i-cash c4"></i>${herman}<i class="lab">PROMOTION: PICK ONE</i><i class="card k1"><b class="hs-i i-plunger"></b></i><i class="card k2"><b class="hs-i i-coffee"></b></i><i class="card k3"><b class="hs-i i-bomb"></b></i>`,
 evolve:briefcase=>`<i class="slot a"><b class="hs-i i-plunger"></b><em>MAX</em><u>${W}</u></i><i class="plus p1">+</i><i class="slot b"><b class="hs-i i-coffee"></b><u>${P}</u></i>${briefcase?'<i class="plus p2">+</i><i class="slot c"><b class="hs-i i-case"></b><u>BRIEFCASE</u></i>':''}<i class="rays"></i><i class="hs-i i-plunger2 res"></i><i class="name">${E}</i>`,
 bomb:`<i class="ring"></i><i class="ring r2"></i><i class="hs-i i-bomb bm"></i><i class="hs-f f1 a"></i><i class="hs-f f2 b"></i><i class="hs-f f3 c"></i><i class="boom"></i><i class="btn"><b class="hs-i i-bomb"></b></i>`,
 alive:`<i class="bar hp"><b></b></i><i class="zone"><b></b></i>${herman}<i class="hs-f f2 r1"></i><i class="hs-f f1 r2"></i><i class="hs-f f2 r3"></i><i class="lab warn">CORPORATE RUSH</i><i class="lab ok">RUSH SURVIVED</i><i class="hs-i i-heal kit"></i>`,
 stage:`<i class="clock"><b>0:03</b><b>0:02</b><b>0:01</b><b>0:00</b></i>${herman}<i class="hs-i i-plunger p"></i><i class="boss"><b class="tag">BOSS</b><b class="bhp"><u></u></b><b class="hs-f f4"></b></i><i class="won">STAGE CLEAR</i>`,
 survival:m=>`<i class="clock"><b>0:00</b><b>${m}:00</b><b>${m*2}:00</b><b>${m*3}:00</b></i>${herman}<i class="boss"><b class="tag">BOSS</b><b class="hs-f f4"></b></i><i class="line"><b></b><u></u><u></u><u></u></i><i class="row"><b>#1</b><b>YOU</b><b>${m*3}:00</b></i>`,
};

// The six cards for the mode on the menu. `stage` is an entry from stages.mjs.
export function slidesFor(stage){
 const endless=!!stage.endless,m=Math.round(SURVIVAL.tierSeconds/60);
 return [
  {id:'move',title:'MOVE',text:'Drag anywhere to move. Herman attacks on his own.',scene:SCENES.move},
  {id:'promo',title:'GET PROMOTED',text:'Grab Petty Cash to fill the bar. A full bar is a promotion: pick a new weapon or perk.',scene:SCENES.promo},
  {id:'evolve',title:'EVOLVE',cls:endless?'':'two',text:endless
   ?'Max a weapon, carry its partner perk, then open a briefcase. Gold executives and bosses drop them.'
   :'Max a weapon and carry its partner perk. Its evolution shows up as a promotion choice.',scene:SCENES.evolve(endless)},
  {id:'bomb',title:'STINK BOMB',text:'Tap the button to drop it. It lures the crowd, then blows after 3 seconds.',scene:SCENES.bomb},
  {id:'alive',title:'STAY ALIVE',text:'Step out of red circles before they burst. Survive a Corporate Rush and a first aid kit drops.',scene:SCENES.alive},
  endless
   ?{id:'mission',title:'THE MISSION',cls:'surv',text:`Corporate cancelled the end of your shift. No finish line: a boss clocks in every ${m} minutes. Sign in and your best time posts to the leaderboard.`,scene:SCENES.survival(m)}
   :{id:'mission',title:'THE MISSION',text:stage.briefing,scene:SCENES.stage},
 ];
}
