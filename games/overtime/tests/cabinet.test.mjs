// Build 16: the promotion screen is a supply cabinet. Every upgrade the engine can offer has shelf art,
// the page has the elements the screen fills in, and the build packs the cabinet art into the single file.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {WEAPONS,PASSIVES,EVOLUTIONS} from '../dist/engine.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const dist=path.join(root,'dist');
const app=fs.readFileSync(path.join(dist,'app.mjs'),'utf8');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dist,'style.css'),'utf8');
const exists=p=>fs.existsSync(path.join(dist,p));

// 1. Shelf art: one image for every weapon, every evolution, every passive and Second Wind. Nothing unused on disk.
const art=Object.fromEntries([...app.matchAll(/(\w+):'(assets\/cabinet\/[\w-]+\.webp)'/g)].map(m=>[m[1],m[2]]));
// 'cash' is the Petty Cash bonus that survival mode offers once everything is maxed (Build 19).
const needed=[...Object.keys(WEAPONS),...Object.keys(EVOLUTIONS).map(k=>k+'2'),...Object.keys(PASSIVES),'heal','cash'];
for(const k of needed){assert.ok(art[k],'no shelf art mapped for '+k);assert.ok(exists(art[k]),'missing '+art[k]);}
assert.equal(Object.keys(art).length,needed.length,'no shelf art mapped to an upgrade that does not exist');
const onDisk=fs.readdirSync(path.join(dist,'assets/cabinet')).sort();
assert.deepEqual(onDisk,[...Object.values(art).map(p=>path.basename(p)),'cabinet.webp'].sort(),'cabinet folder holds exactly the shelf art plus the cabinet');
assert.ok(css.includes('url(assets/cabinet/cabinet.webp)'),'cabinet background is wired up');

// 2. The short passive cards cover every passive, and their numbers match the engine's own descriptions.
const cards=Object.fromEntries([...app.matchAll(/(\w+):\['(\+\d+%)','([^']+)','([^']+)'\]/g)].map(m=>[m[1],m.slice(2)]));
assert.deepEqual(Object.keys(cards).sort(),Object.keys(PASSIVES).sort(),'a short card for every passive');
for(const [k,[pct]] of Object.entries(cards))assert.ok(PASSIVES[k].desc.includes(pct.slice(1)),k+' card says '+pct+' but the engine says: '+PASSIVES[k].desc);

// 3. Page: the elements the screen fills in exist, and the old memo-card panel is gone from this screen.
const section=html.slice(html.indexOf('id="upgrade"'),html.indexOf('</section>',html.indexOf('id="upgrade"')));
for(const id of ['upgradeTitle','upgradeIntro','upgradeLabel','choices','upgradeFoot'])assert.ok(section.includes(`id="${id}"`),'promotion element #'+id);
assert.ok(!section.includes('class="panel"'),'old promotion panel is gone');
// Whole shelf is the button, with a guard so a thumb that is already steering cannot pick instantly.
assert.match(app,/UPGRADE_TAP_GUARD_MS=\d+/);
assert.match(app,/b\.className='cab-slot s'/);

// 4. Build: every cabinet file is packed in and no cabinet path is left unresolved.
const out=path.join(root,'tools','tmp','test-build-cabinet.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
execFileSync('node',[path.join(root,'tools/build-single-file.mjs'),dist,out,'--plain'],{stdio:'ignore'});
const built=fs.readFileSync(out,'utf8');
assert.ok(!/assets\/cabinet\//.test(built),'a cabinet path was not inlined');
for(const f of onDisk)assert.ok(built.includes(fs.readFileSync(path.join(dist,'assets/cabinet',f)).toString('base64')),f+' not packed in');
fs.rmSync(out);
console.log('PASS: '+needed.length+' shelf images cover every upgrade, passive cards match the engine, promotion markup is in place, and the build packs the cabinet in.');
