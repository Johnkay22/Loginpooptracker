// Nov 7 assets and wiring (PRs #121, #122, #124, #125): every icon, sound and menu file exists, is referenced,
// and is packed into the built page. Also checks the menu markup the app code depends on.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const dist=path.join(root,'dist');
const app=fs.readFileSync(path.join(dist,'app.mjs'),'utf8');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dist,'style.css'),'utf8');
const exists=p=>fs.existsSync(path.join(dist,p));

// 1. Icons: all 18 custom icons are mapped and on disk; every weapon has an evolved icon.
const icons=[...app.matchAll(/(\w+):'(assets\/icons\/[\w-]+\.webp)'/g)].map(m=>[m[1],m[2]]);
assert.equal(icons.length,18,'18 custom icons');
for(const [,p] of icons)assert.ok(exists(p),'missing '+p);
const iconKeys=new Set(icons.map(([k])=>k));
for(const w of ['plunger','tp','gas','flush','bomb']){assert.ok(iconKeys.has(w));assert.ok(iconKeys.has(w+'2'),'evolved icon for '+w);}
for(const k of ['speed','coffee','magnet','chili','health','damage','pickup','heal'])assert.ok(iconKeys.has(k),'icon for '+k);
assert.equal(fs.readdirSync(path.join(dist,'assets/icons')).length,18,'no stray icon files');

// 2. Sounds: every sound file named in the code exists, every event plays only known files, nothing on disk is unused.
const sfxFiles=Object.fromEntries([...app.matchAll(/'?([\w-]+)'?:'(assets\/sfx\/[\w-]+\.mp3)'/g)].map(m=>[m[1],m[2]]));
for(const p of Object.values(sfxFiles))assert.ok(exists(p),'missing '+p);
const onDisk=fs.readdirSync(path.join(dist,'assets/sfx')).map(f=>'assets/sfx/'+f).sort();
assert.deepEqual(Object.values(sfxFiles).sort(),onDisk,'every sound on disk is used, and every used sound is on disk');
const sfxMap=app.slice(app.indexOf('const SFX={'),app.indexOf('};',app.indexOf('const SFX={')));
const events=Object.fromEntries([...sfxMap.matchAll(/'?([\w-]+)'?:\[([^\]]*)\]/g)].map(m=>[m[1],[...m[2].matchAll(/'([\w-]+)'/g)].map(x=>x[1])]));
for(const [ev,names] of Object.entries(events))for(const n of names)assert.ok(sfxFiles[n],ev+' plays unknown sound '+n);
assert.deepEqual(events.ko,['ko-1','ko-2','ko-3','ko-4','ko-5'],'5 knockout impacts');
assert.deepEqual(events.heal,['heal-1','heal-2'],'2 Herman ahh takes');
for(const ev of ['hit-plunger','hit-tp','hit-gas','hit-flush','hit-boss','throw','puff','charge','slam','coffee','heartbeat','combo'])assert.ok(events[ev]?.length,'sound for '+ev);
// No voice "oof" knockout left behind.
assert.ok(!onDisk.some(f=>/ko\.mp3$|oof/.test(f)));

// 3. Menu: the elements the app code uses are in the page, and the menu art exists.
for(const id of ['bank','stageCard','stagePrev','stageNext','stageNumber','stageName','stageNote','stagePicker','startBtn','perksBtn','howBtn','howSheet','howClose','briefingTitle','briefingText','nextGoal','sound','best'])
  assert.ok(html.includes(`id="${id}"`),'menu element #'+id);
assert.ok(html.includes('assets/menu/coin.webp')&&exists('assets/menu/coin.webp'));
assert.ok(css.includes('url(assets/menu/stall.webp)')&&exists('assets/menu/stall.webp'));
assert.ok(!html.includes('class="memo"')&&!html.includes('class="hero"'),'old menu memo and hero are gone');

// 4. Build: every asset gets packed in, and no asset path is left unresolved in the page.
const out=path.join(root,'tools','tmp','test-build.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
execFileSync('node',[path.join(root,'tools/build-single-file.mjs'),dist,out,'--plain'],{stdio:'ignore'});
const built=fs.readFileSync(out,'utf8');
assert.ok(!/assets\/(sfx|icons|menu)\//.test(built),'an asset path was not inlined');
for(const dir of ['sfx','icons','menu'])for(const f of fs.readdirSync(path.join(dist,'assets',dir)))
  assert.ok(built.includes(fs.readFileSync(path.join(dist,'assets',dir,f)).toString('base64')),dir+'/'+f+' not packed in');
fs.rmSync(out);
console.log('PASS: 18 icons, '+onDisk.length+' sounds (5 knockout impacts, 2 heal takes), menu markup and art, and the build packs every asset in.');
