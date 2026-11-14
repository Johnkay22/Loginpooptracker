// Build 18: the end screen (stage clear and clocked out) is one layout with art, a headline, four stat tiles
// and the action buttons. Checks the page has those pieces, the old seven-row receipt is gone, and the build
// packs the victory art in.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const dist=path.join(root,'dist');
const app=fs.readFileSync(path.join(dist,'app.mjs'),'utf8');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dist,'style.css'),'utf8');

const section=html.slice(html.indexOf('id="end"'),html.indexOf('</section>',html.indexOf('id="end"')));
for(const id of ['endEyebrow','endTitle','endDesc','receipt','nextStage','again','endPerks','home','trackCta'])assert.ok(section.includes(`id="${id}"`),'end screen element #'+id);
assert.ok(!section.includes('class="panel"'),'old end panel is gone');
assert.match(section,/href="\/\?utm_source=overtime&amp;utm_medium=game&amp;utm_campaign=end_screen"/,'tracker link keeps its campaign tags');
// Buttons keep the order the layout relies on: continue, replay, loadout, menu.
assert.ok(['id="nextStage"','id="again"','id="endPerks"','id="home"'].every((s,i,a)=>i===0||section.indexOf(a[i-1])<section.indexOf(s)),'button order');

const finish=app.slice(app.indexOf('function finish('),app.indexOf('function format('));
for(const label of ['PETTY CASH COLLECTED','BEST KO CHAIN','STINK BOMB KOs','TIME SURVIVED'])assert.ok(finish.includes(label),'stat tile '+label);
for(const gone of ['Executive boss','Corporate KOs','Final level'])assert.ok(!finish.includes(gone),'old receipt row removed: '+gone);
for(const text of ['STAGE <span>CLEAR!</span>','CLOCKED <span>OUT</span>','Next stop: Corporate Lobby.','TRY AGAIN','PLAY AGAIN','REPLAY'])assert.ok(finish.includes(text),'copy: '+text);
assert.match(finish,/settle\(progress,g\)/,'Petty Cash is still banked before the screen shows');

for(const f of ['clear.webp','clocked-out.webp']){assert.ok(fs.existsSync(path.join(dist,'assets/end',f)),f+' exists');assert.ok(css.includes('url(assets/end/'+f+')'),f+' is wired up');}
const out=path.join(root,'tools','tmp','test-build-end.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
execFileSync('node',[path.join(root,'tools/build-single-file.mjs'),dist,out,'--plain'],{stdio:'ignore'});
const built=fs.readFileSync(out,'utf8');
assert.ok(!/assets\/end\//.test(built),'an end screen art path was not inlined');
for(const f of fs.readdirSync(path.join(dist,'assets/end')))assert.ok(built.includes(fs.readFileSync(path.join(dist,'assets/end',f)).toString('base64')),f+' not packed in');
fs.rmSync(out);
console.log('PASS: end screen has its headline, four stat tiles, buttons and tracker link, and the build packs the stage clear and clocked out art in.');
