// Build 23: survival leaderboard. Talks to the Poop Profit database through three server functions
// (supabase/migrations/20261115110043_overtime_survival_leaderboard.sql). The game never touches the table.
//   - Guests can read the board. That is a plain web request; no extra script is loaded for them.
//   - Signed-in players (the same sign-in as the rest of poopprofit.com) get a run id when a survival run
//     starts and hand it back with their time when it ends. The server decides whether it is a new best.
// Everything here fails quietly: with no connection the game plays exactly as before.
export const SUPABASE_URL='https://ukfboxemqwuwkvfglzfq.supabase.co';
// The site's public browser key, the same one app.html uses. It only allows what the database rules allow.
export const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrZmJveGVtcXd1d2t2ZmdsemZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MDk0OTQsImV4cCI6MjA5NjI4NTQ5NH0.nXvi3ZEimwuZHfWR2DZlxX1YYzrdMe_UvZa6NkKN4Og';
export const SESSION_KEY='sb-'+new URL(SUPABASE_URL).hostname.split('.')[0]+'-auth-token';
const LIBRARY='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'; // same script the site already loads

// The signed-in user, read from where the site's sign-in keeps it. null for guests.
export function sessionUser(storage=globalThis.localStorage){
 try{const raw=storage&&storage.getItem(SESSION_KEY);if(!raw)return null;const s=JSON.parse(raw),sess=s&&s.currentSession||s;return sess&&sess.access_token&&sess.user&&sess.user.id?sess.user:null;}catch{return null;}
}
let libraryClient=null;
// Loads the site's database library once, only for signed-in players, so their sign-in stays fresh.
function defaultClient(){
 if(!libraryClient)libraryClient=new Promise((resolve,reject)=>{
  const ready=()=>{try{resolve(globalThis.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY));}catch(e){reject(e);}};
  if(globalThis.supabase&&globalThis.supabase.createClient)return ready();
  const tag=document.createElement('script');tag.src=LIBRARY;tag.async=true;tag.onload=ready;tag.onerror=()=>{libraryClient=null;reject(new Error('library did not load'));};document.head.append(tag);
 });
 return libraryClient;
}
export function createBoard({build=0,client=defaultClient,storage=globalThis.localStorage,fetcher=(...a)=>globalThis.fetch(...a)}={}){
 let run=null;
 const signedIn=()=>!!sessionUser(storage);
 return {
  signedIn,
  // Get the library ready ahead of the first run so starting a run is quick.
  warm(){if(signedIn())client().catch(()=>{});},
  // Call when a survival run starts. Resolves to the run id, or null for guests and when offline.
  startRun(){run=null;if(!signedIn())return Promise.resolve(null);const mine=run={id:null};
   return client().then(c=>c.rpc('overtime_start_run')).then(({data,error})=>{if(error)throw error;mine.id=data||null;return mine.id;}).catch(()=>null);},
  // Call when that run ends. Resolves to {posted, rank, best, reason}; never throws.
  async submitRun({seconds,kills,level,bosses}){const mine=run;run=null;
   if(!signedIn())return {posted:false,reason:'signed_out'};
   if(!mine||!mine.id)return {posted:false,reason:'offline'};
   try{const c=await client();const {data,error}=await c.rpc('overtime_submit_run',{p_run:mine.id,p_seconds:Math.round(seconds*10)/10,p_kills:Math.floor(kills),p_level:Math.floor(level),p_bosses:Math.floor(bosses),p_build:build});if(error)throw error;return data||{posted:false,reason:'offline'};}
   catch{return {posted:false,reason:'offline'};}},
  // The top times as [{place, username, best_seconds, is_me}]. Throws when the board cannot be reached.
  async top(limit=10){
   if(signedIn()){const c=await client();const {data,error}=await c.rpc('overtime_leaderboard',{p_limit:limit});if(error)throw error;return data||[];}
   const res=await fetcher(SUPABASE_URL+'/rest/v1/rpc/overtime_leaderboard',{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+SUPABASE_ANON_KEY},body:JSON.stringify({p_limit:limit})});
   if(!res.ok)throw new Error('board unavailable');return await res.json();},
 };
}
