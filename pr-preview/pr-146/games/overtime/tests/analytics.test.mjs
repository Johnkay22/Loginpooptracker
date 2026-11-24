// Build 27: game analytics. Same Google Analytics property and consent key as the rest of the site, cookieless
// until the visitor taps "Got it", a few plain events, nothing exact about time, and never loaded on a dev machine.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {track,timeBand,modeName} from '../dist/track.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const repo=path.resolve(root,'..','..');
const dist=path.join(root,'dist');
const read=(...p)=>fs.readFileSync(path.join(...p),'utf8');
const html=read(dist,'index.html'),app=read(dist,'app.mjs'),css=read(dist,'style.css'),home=read(repo,'index.html');
const GA='G-R1E17DCKNC',KEY='pp_analytics_consent_v1';

// 1. Same property and consent key as the home page, storage denied by default, granted only on "Got it".
assert.ok(home.includes(`var GA_ID="${GA}"`)&&home.includes(`var CONSENT_KEY="${KEY}"`),'home page still uses this property and key');
assert.ok(html.includes(`var GA_ID="${GA}"`)&&html.includes(`var CONSENT_KEY="${KEY}"`),'game uses the same property and consent key');
assert.ok(html.includes('gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:"denied",wait_for_update:500})'));
assert.ok(html.includes('function grantAnalytics(){gtag("consent","update",{analytics_storage:"granted"});}')&&html.includes('if(consentGiven())grantAnalytics();'));
assert.ok(html.indexOf('gtag("consent","default"')<html.indexOf('gtag("config",GA_ID)'),'consent is set before the first hit');
assert.ok(html.indexOf('var GA_ID=')<html.indexOf('<script type="module" src="app.mjs">'),'analytics is set up before the game code runs');
// Not loaded from a developer's machine, so test runs never reach the live property.
assert.ok(html.includes('var local=location.protocol==="file:"||/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(location.hostname);if(!local){'));
// The property id lives only in .html, where the preview workflow swaps it out.
for(const f of fs.readdirSync(dist).filter(f=>/\.(mjs|css)$/.test(f)))assert.ok(!read(dist,f).includes(GA),f+' must not hold the analytics id');
assert.ok(read(repo,'.github/workflows/pr-preview.yml').includes(`grep -rl "${GA}" /tmp/preview-src --include=*.html`),'previews switch the property off');

// 2. The notice is on the menu, uses the ids the loader looks for, and links to the privacy page.
const menu=html.slice(html.indexOf('id="start"'),html.indexOf('id="how"'));
assert.ok(menu.includes('id="cookieConsent"')&&menu.includes('id="cookieConsentAccept"')&&menu.includes('href="/privacy.html"'),'notice sits on the menu');
assert.ok(menu.indexOf('id="howBtn"')<menu.indexOf('id="cookieConsent"'),'notice is below the menu buttons');
assert.ok(/id="cookieConsent"[^>]*style="display:none"/.test(html),'notice stays hidden until the loader decides');
assert.ok(css.includes('#cookieConsent{position:sticky;'));
assert.ok(!/—|\bwage/.test(menu.slice(menu.indexOf('id="cookieConsent"'))));

// 3. track(): sends through gtag, does nothing without it, never throws.
{const calls=[];globalThis.window={gtag:(...a)=>calls.push(a)};track('overtime_run_start',{mode:'survival'});assert.deepEqual(calls,[['event','overtime_run_start',{mode:'survival'}]]);
 globalThis.window={};assert.doesNotThrow(()=>track('x'));globalThis.window={gtag(){throw new Error('blocked');}};assert.doesNotThrow(()=>track('x'));delete globalThis.window;assert.doesNotThrow(()=>track('x'));}
// Time goes out as a range, as the privacy page promises.
assert.deepEqual([0,59.9,60,179,180,359,360,539,540,719,720,1199,1200,99999,-5,NaN].map(timeBand),['under_1m','under_1m','1_3m','1_3m','3_6m','3_6m','6_9m','6_9m','9_12m','9_12m','12_20m','12_20m','20m_plus','20m_plus','under_1m','under_1m']);
assert.equal(modeName({endless:true,id:10}),'survival');assert.equal(modeName({id:1}),'stage_1');assert.equal(modeName({id:2}),'stage_2');

// 4. The five events, and what they carry.
assert.match(app,/import \{track as logEvent,timeBand,modeName\} from '\.\/track\.mjs';/);
const sent=[...app.matchAll(/logEvent\('([a-z_]+)',\{([^}]*)\}\)/g)].map(m=>[m[1],m[2]]);
assert.deepEqual(sent.map(e=>e[0]).sort(),['overtime_board_open','overtime_howto','overtime_run_end','overtime_run_start','overtime_share']);
const params=Object.fromEntries(sent);
assert.equal(params.overtime_run_start,'mode:modeName(g.stage),hard:g.difficulty===1');
assert.equal(params.overtime_run_end,"mode:modeName(g.stage),result:won?'won':'lost',time_band:timeBand(g.t),bosses_beaten:g.bossesBeaten||0");
assert.equal(params.overtime_howto,'action,first_run:!!howThen,card:howAt+1');
assert.equal(params.overtime_share,'mode:modeName(g.stage),outcome:how');
assert.equal(params.overtime_board_open,'signed_in:board.signedIn()');
for(const [name,p] of sent)assert.ok(!/username|email|user_id|seconds:|g\.t[,}]|kills|credits/.test(p),name+' carries nothing exact or personal');
assert.match(app,/closeHow\('finished'\)/);assert.match(app,/\$\('howSkip'\)\.onclick=\(\)=>closeHow\('skipped'\);/);

// 5. The privacy page says what the game sends and how the notice works.
const privacy=read(repo,'privacy.html');
assert.ok(privacy.includes('we send a few game events')&&privacy.includes('a time range for how long it lasted'));
assert.ok(privacy.includes('runs in a cookieless mode')&&!privacy.includes('Analytics do not load until you interact'),'privacy page matches how analytics really loads');

// 6. The built page carries it all.
const out=path.join(root,'tools','tmp','test-build-analytics.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
execFileSync('node',[path.join(root,'tools/build-single-file.mjs'),dist,out,'--plain'],{stdio:'ignore'});
const built=fs.readFileSync(out,'utf8');fs.rmSync(out);
assert.equal(built.split(GA).length-1,1,'the property id appears once in the built page');
assert.ok(built.includes('overtime_run_end')&&built.includes('id="cookieConsent"')&&built.includes(KEY));
console.log('PASS: game analytics uses the site property and consent key, stays cookieless until Got it, sends five plain events with time as a range, and is off on dev machines and previews.');
