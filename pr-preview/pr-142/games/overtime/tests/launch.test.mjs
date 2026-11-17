// Build 26: launch. The game has a real address, can be found and previewed, old links still work, the site links
// to it, the end screen can share a result, and RESTART MISSION needs a second tap.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {shareMessage,sendShare,GAME_URL} from '../dist/share.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const repo=path.resolve(root,'..','..');
const dist=path.join(root,'dist');
const read=(...p)=>fs.readFileSync(path.join(...p),'utf8');
const html=read(dist,'index.html'),app=read(dist,'app.mjs'),css=read(dist,'style.css');
const URL_='https://www.poopprofit.com/overtime',IMG='https://www.poopprofit.com/images/overtime-share.jpg';

// 1. The page says what it is, where it lives and how to preview it.
const head=html.slice(0,html.indexOf('</head>'));
assert.match(head,/<title>Poop Profit: Overtime \| Free Browser Survival Game<\/title>/);
const desc=head.match(/<meta name="description" content="([^"]*)">/)[1];
assert.ok(desc.length>=110&&desc.length<=160&&/free/i.test(desc)&&desc.includes('Poop Profit: Overtime'),'description length '+desc.length);
assert.ok(head.includes(`<link rel="canonical" href="${URL_}">`));
for(const [k,v] of [['og:url',URL_],['og:image',IMG],['og:type','website'],['og:image:width','1200'],['og:image:height','630']])assert.ok(head.includes(`<meta property="${k}" content="${v}">`),k);
assert.ok(head.includes('<meta name="twitter:card" content="summary_large_image">')&&head.includes(`<meta name="twitter:image" content="${IMG}">`));
assert.ok(/<meta property="og:title" content="[^"]+">/.test(head)&&/<meta property="og:description" content="[^"]+">/.test(head));
const ld=JSON.parse(head.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
assert.equal(ld['@type'],'VideoGame');assert.equal(ld.url,URL_);assert.equal(ld.image,IMG);assert.equal(ld.offers.price,'0');assert.equal(ld.description,desc);
assert.ok(!/—|–|\bwage|\bearn/i.test(head),'head follows the copy rules');
assert.ok(!head.includes('noindex'),'the source page is not hidden from search');
assert.equal(GAME_URL,URL_);

// 2. The build writes the public page to /overtime and does not hide it; only the password build is noindex.
const pkg=JSON.parse(read(root,'package.json'));
assert.equal(pkg.scripts.build,'node tools/build-single-file.mjs dist ../../overtime.html --plain');
const tool=read(root,'tools','build-single-file.mjs');
assert.match(tool,/const plain = !password \|\| password === '--plain';/);assert.match(tool,/\$\{plain \? '' : '<meta name="robots" content="noindex,nofollow">'\}/);
const out=path.join(root,'tools','tmp','test-build-launch.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
execFileSync('node',[path.join(root,'tools/build-single-file.mjs'),dist,out,'--plain'],{stdio:'ignore'});
const built=fs.readFileSync(out,'utf8');fs.rmSync(out);
assert.ok(!built.includes('noindex')&&built.includes(`<link rel="canonical" href="${URL_}">`)&&built.includes('application/ld+json'),'built page can be indexed');
const live=read(repo,'overtime.html');
assert.equal(live,built,'overtime.html in the repo root is the current build (run npm run build)');

// 3. The old address forwards, keeping anything after ? or #, and is not indexed itself.
const old=read(repo,'beta-test-survival-game.html');
assert.ok(old.length<2000,'old page is only a redirect');
assert.ok(old.includes('<meta http-equiv="refresh" content="0;url=overtime">')&&old.includes("location.replace('overtime'+location.search+location.hash)"));
assert.ok(old.includes('<meta name="robots" content="noindex">')&&old.includes(`<link rel="canonical" href="${URL_}">`)&&old.includes('<a href="overtime">'));

// 4. Site files: sitemap, robots, llms.txt, share image, and links from the home page and the app.
assert.ok(read(repo,'sitemap.xml').includes(`<loc>${URL_}</loc>`));
const robots=read(repo,'robots.txt');
assert.ok(robots.includes('Disallow: /games/overtime/')&&!/Disallow: \/overtime/.test(robots)&&!robots.includes('beta-test-survival-game'),'robots lets /overtime in and keeps the working copy out');
assert.ok(read(repo,'llms.txt').includes(`(${URL_})`));
const size=execFileSync('python3',['-I','-c','import sys;from PIL import Image\nfor f in sys.argv[1:]:print(*Image.open(f).size)',path.join(repo,'images/overtime-share.jpg'),path.join(repo,'images/overtime-banner.webp')]).toString().trim().split('\n');
assert.deepEqual(size,['1200 630','1200 630'],'share image and banner are 1200x630');
assert.ok(fs.statSync(path.join(repo,'images/overtime-share.jpg')).size<300000,'share image is light enough for previews');
const home=read(repo,'index.html'),siteApp=read(repo,'app.html');
assert.ok((home.match(/href="\/?overtime"/g)||[]).length>=4,'home page links to the game');
assert.ok(home.indexOf('id="features"')<home.indexOf('id="game"')&&home.indexOf('id="game"')<home.indexOf('id="token"')&&home.indexOf('id="token"')<home.indexOf('id="faq"'),'home game section sits between the toolkit and the Turd Token');
assert.ok(home.includes('href="/games/"'),'home page links to the Games screen');
assert.ok(siteApp.includes('<section id="panel-games"')&&siteApp.includes('class="games-fan" href="/overtime"'),'app Games tab links to the game');
assert.ok(!/—/.test(home.slice(home.indexOf('id="game"'),home.indexOf('id="faq"'))));

// 5. SHARE: the words, and what happens with and without a share sheet.
const s1=shareMessage({endless:true,time:'07:42',stageName:'Survival of the Shittest'});
assert.deepEqual(s1,{title:'Poop Profit: Overtime',text:'I lasted 07:42 in Survival of the Shittest. Think you can outlast me?',url:URL_});
assert.equal(shareMessage({won:true,time:'03:20',stageName:'Office Floor'}).text,'I cleared Office Floor in Poop Profit: Overtime. Your turn.');
assert.equal(shareMessage({time:'02:10',stageName:'Corporate Lobby'}).text,'Corporate Lobby clocked me out at 02:10 in Poop Profit: Overtime. Think you can do better?');
for(const m of [s1,shareMessage({won:true,stageName:'X'}),shareMessage({time:'1',stageName:'X'})])assert.ok(!/—|–|\bwage|\bearn|PoopProfit/i.test(m.text)&&m.text.length<=120);
{let got=null;assert.equal(await sendShare(s1,{share:async m=>{got=m;}}),'shared');assert.deepEqual(got,s1);}
{const abort=Object.assign(new Error('x'),{name:'AbortError'});let copied=0;assert.equal(await sendShare(s1,{share:async()=>{throw abort;},clipboard:{writeText:async()=>{copied++;}}}),'cancelled');assert.equal(copied,0,'closing the share sheet does not copy');}
{let text='';assert.equal(await sendShare(s1,{clipboard:{writeText:async t=>{text=t;}}}),'copied');assert.equal(text,s1.text+' '+URL_);}
{let text='';assert.equal(await sendShare(s1,{share:async()=>{throw new Error('blocked');},clipboard:{writeText:async t=>{text=t;}}}),'copied','a share sheet that errors falls back to copying');assert.ok(text);}
assert.equal(await sendShare(s1,{}),'failed');assert.equal(await sendShare(s1,{clipboard:{writeText:async()=>{throw new Error('no');}}}),'failed');
const actions=html.slice(html.indexOf('class="end-actions"'),html.indexOf('id="trackCta"'));
assert.ok(actions.indexOf('id="again"')<actions.indexOf('id="endShare"')&&actions.indexOf('id="endShare"')<actions.indexOf('id="endPerks"'),'SHARE sits under the main button');
assert.match(app,/sendShare\(shareMessage\(\{endless:g\.endless,won:g\.state==='won',time:format\(g\.t\),stageName:g\.stage\.name\}\),navigator\)/);
assert.match(app,/shareLabel\(g\.endless\?'SHARE MY TIME':won\?'SHARE THE WIN':'CHALLENGE A FRIEND'\)/);
assert.ok(css.includes('.end-actions .end-share{'));

// 6. RESTART MISSION needs a second tap, and pausing again starts from the safe state.
assert.match(app,/\$\('restartPause'\)\.onclick=\(\)=>\{if\(performance\.now\(\)<restartUntil\)\{disarmRestart\(\);begin\(\);return;\}restartUntil=performance\.now\(\)\+3000;/);
assert.ok(app.includes("'TAP AGAIN TO RESTART'")&&app.includes('showTips();disarmRestart();')&&!app.includes("$('restartPause').onclick=begin"));
assert.ok(css.includes('.pz-restart.armed{'));
console.log('PASS: the game is at /overtime and findable, old links forward, the site links in, results can be shared, and restart needs two taps.');
