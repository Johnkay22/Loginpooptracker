// Build 29: music. The game is ready for six tracks; none are in yet. To add one, put the mp3 in assets/music/
// and write its file name below. The Music switch on the menu and pause screen appears once any track is listed.
// Music files are loaded from the site when needed. They are never packed into the game page.
export const MUSIC={
 menu:'',      // loop: menu, Break Room, How to Play, leaderboard
 levels:'',    // loop: Office Floor and Corporate Lobby
 survival:'',  // loop: Survival of the Shittest
 boss:'',      // loop: fades in while a boss is on the floor
 win:'',       // plays once: stage clear
 lose:'',      // plays once: clocked out
};
export const hasMusic=(m=MUSIC)=>Object.values(m).some(Boolean);
// Which loop should be playing. state: {screen:'menu'|'play'|'end', endless, boss}. A missing track falls back to
// the nearest one (survival and levels stand in for each other; no boss track means the mode's own loop carries on).
export function trackFor(state,m=MUSIC){
 const has=k=>m[k]?k:null;
 if(state.screen==='menu')return has('menu');
 if(state.screen!=='play')return null;
 const mode=state.endless?has('survival')||has('levels'):has('levels')||has('survival');
 return state.boss?has('boss')||mode:mode;
}
const VOLUME=.5,MUFFLED_VOLUME=.3,OPEN_HZ=20000,MUFFLED_HZ=520;
// Plays the loops with crossfades, plays the two stings, and muffles everything (like music through a bathroom
// door) while the game is paused or the promotion cabinet is open. Volume and the muffle go through Web Audio
// because iPhones ignore volume set on an audio element. getCtx returns the page's AudioContext.
export function createMusicPlayer({url,getCtx,makeAudio=src=>new Audio(src),fade=.9,tracks=MUSIC}){
 const els={},gains={};let out=null,filter=null,current=null,on=true,muffled=false;
 function chain(){const ctx=getCtx();if(!out){filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=muffled?MUFFLED_HZ:OPEN_HZ;out=ctx.createGain();out.gain.value=muffled?MUFFLED_VOLUME:VOLUME;filter.connect(out);out.connect(ctx.destination);}return ctx;}
 function el(key){if(els[key])return els[key];const ctx=chain(),a=makeAudio(url(tracks[key]));a.loop=key!=='win'&&key!=='lose';a.preload='auto';const g=ctx.createGain();g.gain.value=0;ctx.createMediaElementSource(a).connect(g);g.connect(filter);els[key]=a;gains[key]=g;return a;}
 function ramp(param,value,seconds){const now=getCtx().currentTime;param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);param.linearRampToValueAtTime(value,now+seconds);}
 function stop(key,seconds=fade){const a=els[key];if(!a)return;ramp(gains[key].gain,0,seconds);setTimeout(()=>{if(current!==key){a.pause();if(!a.loop)a.currentTime=0;}},seconds*1000+60);}
 function start(key,seconds=fade){const a=el(key);if(!a.loop)a.currentTime=0;ramp(gains[key].gain,1,a.loop?seconds:.05);const p=a.play();if(p&&p.catch)p.catch(()=>{if(current===key)current=null;});}
 return {
  get current(){return current;},
  // Switch to a loop (or to silence with null). Safe to call every frame: it only acts on a change.
  set(key){if(!on)key=null;if(key&&!tracks[key])key=null;if(key===current)return;try{const old=current;current=key;if(old)stop(old);if(key)start(key);}catch{current=null;}},
  // Play a one-off sting over silence.
  sting(key){if(!on||!tracks[key])return;try{const old=current;current=key;if(old)stop(old,.25);start(key);}catch{}},
  muffle(yes){if(yes===muffled)return;muffled=yes;if(!out)return;try{ramp(filter.frequency,yes?MUFFLED_HZ:OPEN_HZ,.25);ramp(out.gain,yes?MUFFLED_VOLUME:VOLUME,.25);}catch{}},
  enable(yes){on=yes;if(!yes){try{const old=current;current=null;if(old)stop(old,.2);}catch{}}},
 };
}
