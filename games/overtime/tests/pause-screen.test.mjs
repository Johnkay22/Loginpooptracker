// Build 24: the pause screen, rebuilt from Johnny's mockup, with rotating tips under WHILE YOU'RE HERE.
// Checks the page has its pieces, every tip is true to the engine's numbers and names, tips never repeat on
// screen, and the build packs the portrait in.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {tipsFor,takeTip,TIP_ICONS} from '../dist/tips.mjs';
import {SURVIVAL,WEAPONS,PASSIVES,EVOLUTIONS,Game} from '../dist/engine.mjs';
import {SURVIVAL_ID} from '../dist/stages.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const dist=path.join(root,'dist');
const app=fs.readFileSync(path.join(dist,'app.mjs'),'utf8');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dist,'style.css'),'utf8');

// The page.
const section=html.slice(html.indexOf('id="pauseScreen"'),html.indexOf('</section>',html.indexOf('id="pauseScreen"')));
for(const id of ['pauseTitle','resume','restartPause','soundPause','soundPauseIcon','pauseTips'])assert.ok(section.includes(`id="${id}"`),'pause screen element #'+id);
assert.ok(!section.includes('class="panel"')&&!html.includes('id="pauseText"'),'old pause panel and paragraph are gone');
for(const text of ['PAUSED','ON A <span>BREAK.</span>','Take your time. You’re on the clock.','BACK TO BUSINESS','RESTART MISSION','WHILE YOU’RE HERE'])assert.ok(section.includes(text),'copy: '+text);
assert.match(section,/id="soundPause"[^>]*role="switch"/,'sound is an on/off switch');
assert.ok(['id="resume"','id="restartPause"','id="soundPause"','id="pauseTips"'].every((s,i,a)=>i===0||section.indexOf(a[i-1])<section.indexOf(s)),'order: resume, restart, sound, tips');

// The wiring: pausing fills the tips, resuming stops the rotation, the switch reflects the saved sound setting.
const pauseFn=app.slice(app.indexOf('function pause(){'),app.indexOf("$('pause').onclick=pause;"));
assert.match(pauseFn,/showTips\(\);/);assert.match(pauseFn,/stopTips\(\);/);
assert.match(app,/tipsFor\(\{endless:g\.endless,weapons:g\.weapons,/,'tips are chosen for the run in progress');
assert.match(app,/if\(\$\('pauseScreen'\)\.hidden\)return stopTips\(\);/,'rotation stops itself if the screen closes another way');
assert.match(app,/\$\('soundPause'\)\.setAttribute\('aria-checked',String\(!muted\)\)/);
assert.ok(!app.includes('PAUSE_TEXT'),'old pause paragraph code is gone');

// The tips.
const all=o=>tipsFor(o);
const carried={plunger:3,tp:6,gas:0,flush:0,bomb:1};
for(const endless of [false,true]){
 const pool=all({endless,weapons:carried,keyboard:true}),name=endless?'survival':'stage';
 assert.ok(pool.length>=10,name+' has enough tips to rotate');
 assert.equal(new Set(pool.map(t=>t.id)).size,pool.length,name+' tip ids are unique');
 for(const t of pool){
  assert.ok(TIP_ICONS[t.icon]?.startsWith('<svg'),`${t.id} has an icon`);
  assert.ok(t.text.length<=96,`${t.id} fits in three lines on a small phone (${t.text.length})`);
  assert.ok(!/—|–|\bwage|\bearn|PoopProfit/i.test(t.text),`${t.id} follows the copy rules`);
  assert.ok(/[.?!]$/.test(t.text),`${t.id} ends cleanly`);
 }
 assert.equal(pool[2].id,'circles');assert.equal(pool[2].tone,'warn');assert.equal(pool[2].icon,'alert');
 // Evolution lines only for weapons in hand that can still evolve, with the real partner perk.
 assert.deepEqual(pool.filter(t=>t.id.startsWith('evolve-')).map(t=>t.id),['evolve-plunger','evolve-bomb'],name+' evolution lines');
 for(const k of ['plunger','bomb']){const t=pool.find(t=>t.id==='evolve-'+k);assert.ok(t.text.includes(WEAPONS[k].name)&&t.text.includes(EVOLUTIONS[k].name)&&t.text.includes(PASSIVES[EVOLUTIONS[k].requires].name),k+' names its true partner');}
 assert.ok(pool.some(t=>t.id==='keys'));assert.ok(!all({endless,weapons:carried}).some(t=>t.id==='keys'),'keyboard tip only on a keyboard');
}
const surv=all({endless:true}),stage=all({endless:false});
assert.deepEqual(surv.slice(0,3).map(t=>t.icon),['clock','briefcase','alert'],'survival opens with the three from the mockup');
assert.equal(surv[0].text,`No finish line. Tougher enemies and a boss every ${SURVIVAL.tierSeconds/60} minutes.`);
assert.equal(surv[1].text,'Only bosses drop briefcases. Max weapon + partner perk + boss briefcase = evolution.');
assert.equal(surv[2].text,'Get out of red circles before they burst.');
assert.ok(surv.find(t=>t.id==='slots').text.includes(`${SURVIVAL.weaponSlots} weapons and ${SURVIVAL.perkSlots} perks`));
assert.ok(surv.find(t=>t.id==='boss-drop').text.includes(`${SURVIVAL.bossKits} first aid kits`));
assert.equal(SURVIVAL.execTimes.length,2,'the "twice before each boss" tip assumes two executives per round');
assert.ok(SURVIVAL.kitHealPerTier>0,'the "kits heal more" tip assumes kits grow');
// Stage mode has no briefcases, slots or leaderboard, so it must not mention them.
assert.ok(!stage.some(t=>/briefcase|leaderboard|No finish line/i.test(t.text)||t.id==='slots'),'stage tips stay on stage rules');
// Facts quoted in the shared tips, checked against a real game.
{const g=new Game(()=>.5,{},0,'plunger',SURVIVAL_ID);g.dropBomb();assert.equal(g.bombs[0].fuse,3,'bomb fuse is 3 seconds');}
assert.match(fs.readFileSync(path.join(dist,'engine.mjs'),'utf8'),/this\.kills%60===0\)\{this\.drops\.push\(\{x:e\.x,y:e\.y,magnet:true/,'Cash Sweep every 60 KOs');
assert.match(fs.readFileSync(path.join(dist,'engine.mjs'),'utf8'),/this\.caffeine=8;/,'coffee lasts 8 seconds');

// Rotation: three on screen never repeat, every tip gets its turn, and a later pause carries on.
{const pool=surv;let at=0,showing=[];for(let i=0;i<3;i++){const r=takeTip(pool,at,showing);at=r.at;showing.push(r.tip.id);}
 assert.deepEqual(showing,pool.slice(0,3).map(t=>t.id));
 const seen=new Set(showing);for(let i=0;i<pool.length*2;i++){const slot=i%3,r=takeTip(pool,at,showing);at=r.at;showing[slot]=r.tip.id;seen.add(r.tip.id);assert.equal(new Set(showing).size,3,'no tip shown twice at once');}
 assert.equal(seen.size,pool.length,'every tip gets shown');
 assert.notEqual(takeTip(pool,3,[]).tip.id,pool[0].id,'a second pause starts past the first three');
 const two=pool.slice(0,2);assert.ok(takeTip(two,0,two.map(t=>t.id)).tip,'a tiny pool still returns a tip');}

// Art and build.
assert.ok(css.includes('url(assets/breakroom/break.webp)')&&fs.existsSync(path.join(dist,'assets/breakroom/break.webp')),'portrait is wired up');
const out=path.join(root,'tools','tmp','test-build-pause.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
execFileSync('node',[path.join(root,'tools/build-single-file.mjs'),dist,out,'--plain'],{stdio:'ignore'});
const built=fs.readFileSync(out,'utf8');
assert.ok(built.includes(fs.readFileSync(path.join(dist,'assets/breakroom/break.webp')).toString('base64')),'portrait not packed in');
assert.ok(built.includes('No finish line. Tougher enemies and a boss every')&&!/from\s*['"]\.\/tips\.mjs['"]/.test(built),'tips module is bundled into the single file');
fs.rmSync(out);
console.log('PASS: the pause screen has its pieces, its tips match the game rules and rotate without repeats, and the build packs it in.');
