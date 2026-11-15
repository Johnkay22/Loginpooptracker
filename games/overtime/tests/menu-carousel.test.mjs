// Build 20: the menu's mode picker is a swipe carousel of art cards. Every mode has a card, the page has the
// carousel pieces, the cards snap into place, and the build packs the card art into the single file.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {MODES,SURVIVAL_ID} from '../dist/stages.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const dist=path.join(root,'dist');
const app=fs.readFileSync(path.join(dist,'app.mjs'),'utf8');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dist,'style.css'),'utf8');

// One card per mode, in menu order, and the art is on disk.
const block=app.slice(app.indexOf('const CARD_ART={'),app.indexOf('};',app.indexOf('const CARD_ART={')));
const art=Object.fromEntries([...block.matchAll(/(\d+|\[SURVIVAL_ID\]):'(assets\/menu\/card-[\w-]+\.webp)'/g)].map(m=>[m[1]==='[SURVIVAL_ID]'?SURVIVAL_ID:Number(m[1]),m[2]]));
for(const mode of MODES){assert.ok(art[mode.id],'no card art for '+mode.name);assert.ok(fs.existsSync(path.join(dist,art[mode.id])),'missing '+art[mode.id]);}
assert.equal(Object.keys(art).length,MODES.length,'no card for a mode that does not exist');
assert.deepEqual(fs.readdirSync(path.join(dist,'assets/menu')).filter(f=>f.startsWith('card-')).sort(),Object.values(art).map(p=>path.basename(p)).sort());

// The page has the carousel, and it sits above CLOCK IN with Break Room and How to Play still on the menu.
const menu=html.slice(html.indexOf('id="start"'),html.indexOf('id="howSheet"'));
for(const id of ['stageCard','stageTrack','stageDots','stagePrev','stageNext','stageNote','startBtn','perksBtn','howBtn','sound','bank'])assert.ok(menu.includes(`id="${id}"`),'menu element #'+id);
assert.ok(menu.indexOf('id="stageTrack"')<menu.indexOf('id="startBtn"')&&menu.indexOf('id="startBtn"')<menu.indexOf('id="perksBtn"'),'carousel, then CLOCK IN, then Break Room');
assert.ok(!menu.includes('sv2-hero'),'the old single hero image is gone');

// Cards snap to the middle one at a time, and a locked mode still blocks CLOCK IN.
assert.match(css,/\.sv3-track\{[^}]*scroll-snap-type:x mandatory/);
assert.match(css,/\.sv3-card\{[^}]*scroll-snap-align:center[^}]*scroll-snap-stop:always/);
assert.match(app,/\$\('startBtn'\)\.disabled=!unlocked/);
assert.match(app,/new ResizeObserver\(/,'the carousel lines itself up again when the menu comes back');

// Build: the card art is packed in and no card path is left unresolved.
const out=path.join(root,'tools','tmp','test-build-menu.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
execFileSync('node',[path.join(root,'tools/build-single-file.mjs'),dist,out,'--plain'],{stdio:'ignore'});
const built=fs.readFileSync(out,'utf8');
assert.ok(!/assets\/menu\/card-/.test(built),'a card path was not inlined');
for(const p of Object.values(art))assert.ok(built.includes(fs.readFileSync(path.join(dist,p)).toString('base64')),p+' not packed in');
fs.rmSync(out);
console.log('PASS: every mode has a swipe card, the carousel pieces are on the menu, cards snap one at a time, and the build packs the card art in.');
