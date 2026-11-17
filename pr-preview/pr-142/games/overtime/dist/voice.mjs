// Build 29: Herman's spoken lines. Which line goes with which moment, and the rules for when he speaks.
// The clips are in assets/voice/ (made with Johnny's "Herman B" ElevenLabs voice). Pure: no page access.
export const VOICE={
 start:['business','potty'],                 // "Time to do my business." / "Let's get this potty started."
 promotion:['big-dump'],                     // "I'm kind of a big dump around here."
 evolve:['number-two','movement'],           // "Number two just became number one." / "Now THAT'S a movement."
 streak:['on-a-roll','wipe-em-out'],         // "I'm on a roll! Preferably two-ply!" / "Wipe 'em out!"
 bomb:['silent-deadly'],                     // "Silent? No. Deadly? Oh yes."
 low:['skid-mark'],                          // "'Tis but a skid mark."
 rush:['tight-squeeze','slipped-out'],       // "Tight squeeze. I know the feeling." / "Slipped right out. Like a pro."
 exec:['brown-noser'],                       // "Look who it is. A professional brown-noser."
 lose:['pooped'],                            // "Welp. I'm pooped."
};
export const VOICE_CLIPS=[...new Set(Object.values(VOICE).flat())];
export const VOICE_GAP=45; // seconds of run time between lines, so Herman does not talk over the game
// The rules: the clock-in line plays at the start of every run (never the same one twice in a row) and the
// clocked-out line at the end. Every other line needs VOICE_GAP seconds since the last one, and each clip is
// used at most once per run. pick() returns the clip to play, or null.
export function createVoice({gap=VOICE_GAP,random=Math.random}={}){
 let used=new Set(),last=-Infinity,lastStart=null;
 const any=list=>list[Math.floor(random()*list.length)];
 return {
  reset(){used=new Set();last=-Infinity;},
  pick(moment,t=0){const all=VOICE[moment];if(!all)return null;
   if(moment==='start'){const fresh=all.filter(c=>c!==lastStart),clip=any(fresh.length?fresh:all);lastStart=clip;last=t;return clip;}
   if(moment==='lose')return any(all);
   if(t-last<gap)return null;
   const left=all.filter(c=>!used.has(c));if(!left.length)return null;
   const clip=any(left);used.add(clip);last=t;return clip;},
 };
}
