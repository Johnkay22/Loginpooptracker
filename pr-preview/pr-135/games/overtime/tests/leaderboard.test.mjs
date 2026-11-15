// Build 23: survival leaderboard. The game module is tested here against a stand-in for the database, and the
// database change file is checked for the rules that keep the table locked down. (The functions themselves are
// checked on the live database when the change is applied.)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createBoard,sessionUser,SESSION_KEY,SUPABASE_URL,SUPABASE_ANON_KEY} from '../dist/leaderboard.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const store=session=>({getItem:k=>k===SESSION_KEY&&session?JSON.stringify(session):null});
const SESSION={access_token:'t',refresh_token:'r',user:{id:'u-1'}};

// 1. Who is signed in: read from the site's own sign-in storage, and never trusts junk.
assert.equal(SESSION_KEY,'sb-ukfboxemqwuwkvfglzfq-auth-token');
assert.equal(sessionUser(store(null)),null);
assert.equal(sessionUser(store(SESSION)).id,'u-1');
assert.equal(sessionUser(store({user:{id:'u-1'}})),null,'no access token means not signed in');
assert.equal(sessionUser({getItem:()=>'{not json'}),null);
assert.equal(sessionUser({getItem:()=>{throw new Error('blocked')}}),null);

// 2. Guests: nothing is sent, no library is loaded, and the board is read with one plain request.
{let libraryLoads=0,requests=[];
 const b=createBoard({build:23,storage:store(null),client:()=>{libraryLoads++;return Promise.reject(new Error('no'));},fetcher:async(url,o)=>{requests.push([url,o]);return {ok:true,json:async()=>[{place:1,username:'herman',best_seconds:612.4,is_me:false}]};}});
 assert.equal(b.signedIn(),false);b.warm();
 assert.equal(await b.startRun(),null);
 assert.deepEqual(await b.submitRun({seconds:99,kills:1,level:2,bosses:0}),{posted:false,reason:'signed_out'});
 const rows=await b.top(10);assert.equal(rows[0].username,'herman');
 assert.equal(libraryLoads,0,'guests never load the database library');
 assert.equal(requests.length,1);assert.equal(requests[0][0],SUPABASE_URL+'/rest/v1/rpc/overtime_leaderboard');
 assert.equal(requests[0][1].headers.apikey,SUPABASE_ANON_KEY);assert.deepEqual(JSON.parse(requests[0][1].body),{p_limit:10});
 const down=createBoard({storage:store(null),fetcher:async()=>({ok:false})});await assert.rejects(down.top());}

// 3. Signed in: a run id at the start, handed back with the run's numbers at the end.
{const calls=[];const fake={rpc:async(name,args)=>{calls.push([name,args]);return name==='overtime_start_run'?{data:'run-1',error:null}:name==='overtime_submit_run'?{data:{posted:true,rank:4,best:432.2},error:null}:{data:[{place:1,username:'me',best_seconds:432.2,is_me:true}],error:null};}};
 const b=createBoard({build:23,storage:store(SESSION),client:async()=>fake,fetcher:async()=>{throw new Error('signed-in players do not use the guest request');}});
 assert.equal(await b.startRun(),'run-1');
 const r=await b.submitRun({seconds:432.249,kills:1802.9,level:31,bosses:2});
 assert.deepEqual(r,{posted:true,rank:4,best:432.2});
 assert.deepEqual(calls[1],['overtime_submit_run',{p_run:'run-1',p_seconds:432.2,p_kills:1802,p_level:31,p_bosses:2,p_build:23}]);
 // A run id is used once: a second submit without a new run sends nothing.
 assert.deepEqual(await b.submitRun({seconds:500,kills:1,level:2,bosses:0}),{posted:false,reason:'offline'});assert.equal(calls.length,2);
 assert.equal((await b.top())[0].is_me,true);assert.deepEqual(calls[2],['overtime_leaderboard',{p_limit:10}]);}

// 4. Trouble never breaks the game: a failed start or submit resolves quietly.
{const b=createBoard({storage:store(SESSION),client:async()=>({rpc:async()=>({data:null,error:new Error('down')})})});
 assert.equal(await b.startRun(),null);assert.deepEqual(await b.submitRun({seconds:60,kills:1,level:2,bosses:0}),{posted:false,reason:'offline'});
 const c=createBoard({storage:store(SESSION),client:()=>Promise.reject(new Error('library did not load'))});
 assert.equal(await c.startRun(),null);assert.deepEqual(await c.submitRun({seconds:60,kills:1,level:2,bosses:0}),{posted:false,reason:'offline'});
 // A run that started while offline cannot be posted later.
 let up=false;const d=createBoard({storage:store(SESSION),client:async()=>({rpc:async()=>up?{data:{posted:true},error:null}:{data:null,error:new Error('down')}})});
 await d.startRun();up=true;assert.deepEqual(await d.submitRun({seconds:60,kills:1,level:2,bosses:0}),{posted:false,reason:'offline'});}

// 5. Only the public browser key is in the game, and it is the same one the site uses.
const payload=JSON.parse(Buffer.from(SUPABASE_ANON_KEY.split('.')[1],'base64url').toString());
assert.equal(payload.role,'anon','the game holds the public key, never a service key');
const site=fs.readFileSync(path.join(root,'..','..','app.html'),'utf8');
assert.ok(site.includes(SUPABASE_ANON_KEY)&&site.includes(SUPABASE_URL),'same project and key as app.html');

// 6. The page and the game are wired up.
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8'),app=fs.readFileSync(path.join(root,'dist/app.mjs'),'utf8');
for(const id of ['boardBtn','endBoard','board','boardList','boardNote','boardSign','boardBack'])assert.ok(html.includes(`id="${id}"`),'element #'+id);
assert.match(app,/if\(g\.endless\)board\.startRun\(\)/,'a survival run asks for a run id');
assert.match(app,/if\(g\.endless\)\{postSurvivalTime\(g\);/,'a finished survival run is posted');
assert.match(app,/board\.top\(10\)/,'the board shows the top 10');
assert.ok(!/innerHTML=[^;]*username/.test(app),'usernames are written as text, never as markup');

// 7. The database change: table locked down, functions limited to the right callers.
const sql=fs.readFileSync(path.join(root,'..','..','supabase/migrations/20261115100000_overtime_survival_leaderboard.sql'),'utf8');
assert.match(sql,/alter table public\.overtime_survival_scores enable row level security;/);
assert.match(sql,/revoke all on table public\.overtime_survival_scores from anon, authenticated;/);
assert.ok(!/create policy/i.test(sql),'no direct access policies: everything goes through the functions');
for(const fn of ['overtime_start_run','overtime_submit_run','overtime_leaderboard'])assert.match(sql,new RegExp('create or replace function public\\.'+fn+'\\([^)]*\\)[\\s\\S]*?security definer\\s+set search_path = public, pg_temp'),fn+' pins its search path');
assert.match(sql,/revoke all on function public\.overtime_start_run\(\) from public, anon;/);
assert.match(sql,/revoke all on function public\.overtime_submit_run\([^)]*\) from public, anon;/);
assert.match(sql,/grant execute on function public\.overtime_leaderboard\(integer\) to anon, authenticated;/);
assert.ok(!/grant execute on function public\.overtime_(start|submit)_run[^;]*anon/.test(sql),'guests cannot start or post runs');
assert.match(sql,/v_secs > v_elapsed \+ 20/,'a time cannot be longer than the real time that passed');
assert.ok(!/\b(drop|truncate|delete from|alter table public\.(?!overtime_survival_scores))/i.test(sql),'nothing existing is changed');
console.log('PASS: guests read the board with one request, signed-in runs get a run id and post their numbers, failures stay quiet, only the public key is used, and the database change keeps the table locked down.');
