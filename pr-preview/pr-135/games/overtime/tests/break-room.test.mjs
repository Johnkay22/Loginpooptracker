// Build 21: the Break Room screen, rebuilt from Johnny's mockup. The page has its pieces, the screen shows the
// real perk numbers and prices from progress.mjs, weapon unlock rules are unchanged, and the build packs its art.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {PERKS,cost,buy,fresh} from '../dist/progress.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const dist=path.join(root,'dist');
const app=fs.readFileSync(path.join(dist,'app.mjs'),'utf8');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dist,'style.css'),'utf8');

const section=html.slice(html.indexOf('id="workshop"'),html.indexOf('</section>',html.indexOf('id="workshop"')));
for(const id of ['workBank','perkChoices','starts','hardMode','hardLock','saveNote','workBack'])assert.ok(section.includes(`id="${id}"`),'Break Room element #'+id);
assert.ok(!section.includes('class="panel"'),'old Break Room panel is gone');
assert.ok(section.includes('separate from your Turd Token wallet'),'says Petty Cash is not the Turd Token wallet');

// The screen is drawn from the real perk list, prices and buy rule, not from numbers typed into the page.
const fn=app.slice(app.indexOf('function workshop(){'),app.indexOf("$('perksBtn').onclick=workshop;"));
assert.match(fn,/Object\.entries\(PERKS\)/);assert.match(fn,/cost\(rank\)/);assert.match(fn,/buy\(progress,k\)/);
assert.deepEqual(Object.keys(PERKS),['health','damage','pickup']);
assert.deepEqual([0,1,2].map(cost),[250,550,850]);
{const p=fresh();p.credits=249;assert.equal(buy(p,'health'),false);p.credits=250;assert.equal(buy(p,'health'),true);assert.equal(p.credits,0);assert.equal(p.perks.health,1);}
// Every perk has art, and starting weapons keep their unlock rules.
for(const k of ['health','damage'])assert.ok(fn.includes(`${k}:'assets/breakroom/${k}.webp'`)&&fs.existsSync(path.join(dist,'assets/breakroom',k+'.webp')),k+' art');
assert.match(fn,/pickup:CABINET_ART\.cash/);
assert.match(fn,/k==='plunger'\|\|k==='tp'&&progress\.kills>=200\|\|k==='gas'&&progress\.wins>=1/);
assert.match(fn,/\$\('hardMode'\)\.disabled=progress\.wins<1/);
assert.ok(css.includes('url(assets/breakroom/herman.webp)')&&fs.existsSync(path.join(dist,'assets/breakroom/herman.webp')),'header art');

const out=path.join(root,'tools','tmp','test-build-breakroom.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
execFileSync('node',[path.join(root,'tools/build-single-file.mjs'),dist,out,'--plain'],{stdio:'ignore'});
const built=fs.readFileSync(out,'utf8');
assert.ok(!/assets\/breakroom\//.test(built),'a Break Room art path was not inlined');
for(const f of fs.readdirSync(path.join(dist,'assets/breakroom')))assert.ok(built.includes(fs.readFileSync(path.join(dist,'assets/breakroom',f)).toString('base64')),f+' not packed in');
fs.rmSync(out);
console.log('PASS: the Break Room has its pieces, uses the real perk prices and unlock rules, and the build packs its art in.');
