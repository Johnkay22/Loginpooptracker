// Build 33: the Stink Bomb and pocket buttons can sit on the left or the right, chosen on the pause screen.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const app=read('dist/app.mjs'),html=read('dist/index.html'),css=read('dist/style.css');
// The choice sits on the pause screen, right under the sound and music switches.
const pause=html.slice(html.indexOf('<section id="pauseScreen"'),html.indexOf('<div class="pz-tips">'));
assert.ok(pause.indexOf('id="musicPause"')<pause.indexOf('id="sidePause"'),'under the audio switches');
assert.ok(pause.includes('data-side="left" aria-pressed="false">LEFT</button><button type="button" data-side="right" aria-pressed="true">RIGHT</button>'),'a LEFT | RIGHT choice, right by default');
// Remembered on the device, applied at load, and flips the pocket pointer arrow.
assert.ok(app.includes("const SIDE_KEY='pp-overtime-buttons';let buttonSide='right';try{if(localStorage.getItem(SIDE_KEY)==='left')buttonSide='left';}catch{}"));
assert.ok(app.includes("document.body.classList.toggle('btn-left',buttonSide==='left')")&&app.includes("$('iiArrow').textContent=buttonSide==='left'?'←':'→';"));
assert.ok(app.includes("try{localStorage.setItem(SIDE_KEY,buttonSide);}catch{}applySide();")&&app.includes('\napplySide();'));
// Everything that sits with the buttons moves, and what was on the left moves right.
for(const rule of ['body.btn-left #bombBtn{right:auto;left:12px}','body.btn-left #pocket{right:auto;left:23px}','body.btn-left .ii-pocket{right:auto;left:96px}','body.btn-left #loadout{left:auto;right:12px}','body.btn-left #boost{left:auto;right:16px}','body.btn-left .ii-pocket{animation-name:iiNudgeL}'])
 assert.ok(css.includes(rule),rule);
console.log('PASS: the Stink Bomb and pocket can sit on either side, chosen on the pause screen and remembered.');
