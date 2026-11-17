// Build 25: How to Play as six swipe cards with moving pictures. Checks the page and wiring, that every card's
// words match the engine, that each picture only uses art and styles that exist, and that the build packs it in.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {slidesFor} from '../dist/howto.mjs';
import {SURVIVAL,WEAPONS,PASSIVES,EVOLUTIONS,Game} from '../dist/engine.mjs';
import {MODES,STAGES,SURVIVAL_STAGE,SURVIVAL_ID} from '../dist/stages.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const dist=path.join(root,'dist');
const app=fs.readFileSync(path.join(dist,'app.mjs'),'utf8');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dist,'style.css'),'utf8');
const howFrom=css.indexOf('/* Build 25: How to Play'),how=css.slice(howFrom,css.indexOf('/* Build 26:',howFrom));

// The page: the overlay is there, the old sheet is gone, and the menu button stays.
for(const id of ['how','howTitle','howSkip','howTrack','howDots','howNext','nextGoal','howBtn'])assert.ok(html.includes(`id="${id}"`),'element #'+id);
assert.ok(!html.includes('howSheet')&&!html.includes('sv2-tips')&&!css.includes('sv2-sheet')&&!app.includes('howSheet'),'old text sheet is gone');
assert.ok(!/to earn a first aid kit/.test(html),'old sentence list is gone');

// The wiring: first CLOCK IN shows the cards, then starts the run; text goes in as text.
assert.match(app,/\$\('startBtn'\)\.onclick=\(\)=>howSeen\(\)\?begin\(\):openHow\(begin\);/,'first CLOCK IN opens the cards');
assert.match(app,/function closeHow\(action\)\{[^\n]*?localStorage\.setItem\(HOW_KEY,'1'\)/,'closing remembers it was seen');
assert.match(app,/function howSeen\(\)\{try\{return localStorage\.getItem\(HOW_KEY\)==='1';\}catch\{return true;\}\}/,'blocked storage does not nag every run');
assert.match(app,/card\.querySelector\('h3'\)\.textContent=s\.title;card\.querySelector\('p'\)\.textContent=s\.text;/);
assert.match(app,/howThen\?'CLOCK IN':'GOT IT'/,'last button says what it does');
assert.match(app,/\$\('howSkip'\)\.onclick=\(\)=>closeHow\('skipped'\);\$\('howBtn'\)\.onclick=\(\)=>openHow\(\);/);
assert.match(app,/e\.key==='ArrowRight'[^;]*;goHow\(howAt\+1\)/,'arrow keys move between cards');

// The cards, for every mode on the menu.
const IDS=['move','promo','evolve','bomb','alive','mission'];
const artClasses=new Map([...how.matchAll(/\.(i-[a-z0-9]+)\{background-image:url\(([^)]+)\)\}/g)].map(m=>[m[1],m[2]]));
for(const stage of MODES){
 const slides=slidesFor(stage);
 assert.deepEqual(slides.map(s=>s.id),IDS,stage.name+' has the six cards in order');
 for(const s of slides){
  assert.ok(s.title&&s.title===s.title.toUpperCase(),s.id+' title');
  assert.ok(s.text.length>=30&&s.text.length<=160,`${stage.name} ${s.id} text length ${s.text.length}`);
  assert.ok(!/—|–|\bwage|\bearn|PoopProfit/i.test(s.text+s.title+s.scene),`${s.id} follows the copy rules`);
  assert.ok(how.includes(`.s-${s.id} `),`${s.id} picture has styles`);
  for(const m of s.scene.matchAll(/\bi-[a-z0-9]+/g)){assert.ok(artClasses.has(m[0]),`${s.id} uses art class ${m[0]} that has no style`);assert.ok(fs.existsSync(path.join(dist,artClasses.get(m[0]))),m[0]+' art file exists');}
  assert.ok(!/<script|on[a-z]+=|javascript:/i.test(s.scene),s.id+' picture markup is plain');
 }
}
const surv=slidesFor(SURVIVAL_STAGE),stage=slidesFor(STAGES[0]);
const [W,P,E]=[WEAPONS.plunger.name,PASSIVES[EVOLUTIONS.plunger.requires].name,EVOLUTIONS.plunger.name].map(s=>s.toUpperCase());
// Evolve: survival needs the briefcase, levels do not; both name the real weapon, partner perk and evolution.
for(const s of [surv[2],stage[2]])for(const n of [W,P,E])assert.ok(s.scene.includes(n),'evolve card names '+n);
assert.ok(surv[2].scene.includes('i-case')&&surv[2].scene.includes('BRIEFCASE')&&/briefcase/.test(surv[2].text)&&!surv[2].cls);
assert.ok(!stage[2].scene.includes('i-case')&&!/briefcase/i.test(stage[2].text+stage[2].scene)&&stage[2].cls==='two');
{const g=new Game(()=>.5,{},0,'plunger',1);g.weapons.plunger=5;g.passives[EVOLUTIONS.plunger.requires]=1;g.t=60;assert.ok(g.options().some(o=>o.key==='plunger'&&o.level===6),'in a level, max weapon + partner perk really offers the evolution');}
// The mission: survival quotes the engine's minutes; a level shows its own briefing.
const m=SURVIVAL.tierSeconds/60;
assert.ok(surv[5].text.includes(`every ${m} minutes`)&&/leaderboard/.test(surv[5].text)&&surv[5].cls==='surv');
for(const t of [`${m}:00`,`${m*2}:00`,`${m*3}:00`])assert.ok(surv[5].scene.includes(t),'survival clock shows '+t);
for(const st of STAGES){const s=slidesFor(st)[5];assert.equal(s.text,st.briefing);assert.ok(!s.cls&&s.scene.includes('STAGE CLEAR'));}
// Facts quoted on the shared cards.
{const g=new Game(()=>.5,{},0,'plunger',SURVIVAL_ID);g.dropBomb();assert.equal(g.bombs[0].fuse,3,'bomb card says 3 seconds');}
assert.match(fs.readFileSync(path.join(dist,'engine.mjs'),'utf8'),/RUSH SURVIVED · FIRST AID KIT DROPPED/,'a survived rush drops a kit');

// The pictures: every animation used has its keyframes, only the card in view animates, and reduce-motion stops it.
const frames=new Set([...how.matchAll(/@keyframes ([\w-]+)/g)].map(m=>m[1]));
const used=new Set();
for(const rule of how.matchAll(/([^{}]+)\{([^{}]*animation:[^{}]*)\}/g)){
 if(/prefers-reduced-motion/.test(rule[1])||rule[2].includes('animation:none'))continue;
 assert.ok(/\.hw-card\.on /.test(rule[1]),'animation outside the card in view: '+rule[1].trim().slice(0,60));
 for(const part of rule[2].match(/animation:([^;}]*)/)[1].split(','))used.add(part.trim().split(/\s+/)[0]);
}
for(const n of used)assert.ok(frames.has(n),'missing @keyframes '+n);
for(const n of frames)assert.ok(used.has(n),'unused @keyframes '+n);
assert.match(how,/@media \(prefers-reduced-motion:reduce\)\{\.hw-card\.on \.hs \*\{animation:none!important\}\}/);
assert.ok(!/\.stamp\b/.test(how),'no clash with the end screen stamp');

// Art and build: the howto folder is used and packed, and briefcases on the floor use the render.
const art=fs.readdirSync(path.join(dist,'assets/howto'));
assert.deepEqual(art.sort(),['briefcase.webp','foes.webp','herman.webp']);
for(const f of art)assert.ok((css+app).includes('assets/howto/'+f),f+' is used');
assert.match(app,/briefcaseArt\.src='assets\/howto\/briefcase\.webp'/);assert.match(app,/ctx\.drawImage\(briefcaseArt,d\.x-19,d\.y-20,38,38\)/);
assert.ok(fs.existsSync(path.join(root,'art-sources/howto/briefcase.png')),'original briefcase art is kept');
const out=path.join(root,'tools','tmp','test-build-how.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
execFileSync('node',[path.join(root,'tools/build-single-file.mjs'),dist,out,'--plain'],{stdio:'ignore'});
const built=fs.readFileSync(out,'utf8');
for(const f of art)assert.ok(built.includes(fs.readFileSync(path.join(dist,'assets/howto',f)).toString('base64')),f+' not packed in');
assert.ok(!built.includes('assets/howto/')&&!built.includes('url(assets/'),'no art path left pointing at a file');
assert.ok(built.includes('Drag anywhere to move. Herman attacks on his own.')&&built.includes('GET PROMOTED'),'cards are bundled into the single file');
fs.rmSync(out);
console.log('PASS: How to Play has six cards per mode that match the game rules, pictures with complete animations, and the build packs the art in.');
