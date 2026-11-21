// Build 31: mystery boxes. Every supply box on the floor holds one random item; the stronger the item, the rarer
// it is (weights out of 100). "now" items take effect when picked up. "pocket" items go into Herman's pocket (two
// slots, next to the Stink Bomb) to use whenever the player taps them. With the pocket full, a pocket item is
// swapped for a random "now" item instead. Every number worth tuning lives here.
export const ITEMS={
 sweep: {name:'Cash Sweep',         weight:20,use:'now',   desc:'Every coin on the floor flies to you for 5s.'},
 coffee:{name:'Coffee',             weight:18,use:'now',   desc:'8s of extra speed and rapid fire.'},
 wet:   {name:'Wet Floor',          weight:18,use:'now',   desc:'A slippery puddle for 10s. Enemies slow, and 1 in 6 slip and go down.'},
 freeze:{name:'Out of Order',       weight:12,use:'now',   desc:'Every enemy freezes for 3s. Bosses for 1.5s.'},
 bomb:  {name:'Free Stink Bomb',    weight:11,use:'pocket',desc:'One extra bomb. Your recharging one is untouched.'},
 horn:  {name:'Air Horn',           weight:10,use:'pocket',desc:'Blasts everyone around you far back and stuns them.'},
 bidet: {name:'Executive Bidet',    weight:6, use:'now',   desc:'5 seconds of high-pressure water. Blasts enemies back and hits hard.'},
 health:{name:'Company Health Plan',weight:4, use:'pocket',desc:'Tap any time for a full heal.'},
 card:  {name:'Company Credit Card',weight:1, use:'pocket',desc:'Tap any time and pick any item you want.'},
};
export const MYSTERY={
 refill:90,          // a broken box comes back this many seconds later
 pocket:2,           // pocket slots
 puddleLife:10,puddleR:62,slipChance:1/6,slowFor:2.5,slow:.45, // Wet Floor: executives and bosses only slow down
 freeze:3,freezeBoss:1.5,                                       // Out of Order (executives count as bosses here)
 hornR:520,hornPush:450,hornStun:1.2,hornTime:.35,              // Air Horn: everyone in range flies 450 back over 0.35s; bosses and executives half, no stun
 bidetTime:5,bidetLength:150,bidetWidth:34,bidetDps:110,bidetPush:140, // about 3 enemy body lengths of spray
 cardCommon:['sweep','coffee','wet','freeze','bomb','horn'],    // the Credit Card always offers these...
 cardRares:['bidet','health'],                                  // ...plus one of these, taking turns
};
export const BOX_SPOTS=[{x:800,y:650},{x:350,y:900},{x:1450,y:900},{x:900,y:1450}];
const total=list=>list.reduce((n,k)=>n+ITEMS[k].weight,0);
// Weighted pick. `only` limits the pick to some items (used for the pocket-full swap).
export function rollItem(random,only=Object.keys(ITEMS)){let r=random()*total(only);for(const k of only){r-=ITEMS[k].weight;if(r<0)return k;}return only[only.length-1];}
export const NOW_ITEMS=Object.keys(ITEMS).filter(k=>ITEMS[k].use==='now');
