// Build 28: live leaderboard moments. Works out which leaderboard times a survival run still has to beat, and
// which one it has just gone past. Pure, so the tests can check it. Rows come from overtime_leaderboard.
export function rivalsFrom(rows,now=0){
 return (Array.isArray(rows)?rows:[]).filter(r=>r&&!r.is_me&&Number(r.best_seconds)>now&&typeof r.username==='string')
  .map(r=>({name:r.username,place:Number(r.place)||0,seconds:Number(r.best_seconds)})).sort((a,b)=>a.seconds-b.seconds);
}
// The best-placed rival the run has now passed (or null), and the rivals still ahead. Passing several in the same
// moment reports only the highest, so one banner covers them.
export function passRivals(rivals,t){
 let n=0;while(n<rivals.length&&rivals[n].seconds<t)n++;
 return {passed:n?rivals[n-1]:null,rest:n?rivals.slice(n):rivals};
}
