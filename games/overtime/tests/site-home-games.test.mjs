// The site around the game: the new home page (from PR #139) keeps every search and share tag of the old one, shows
// the Overtime board as a growing top 10, and the app's Games tab (which took over Soon) carries the full board,
// with Merch moved to its own tab. poopprofit.com/games opens the app on the Games tab.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {SURVIVAL_ID} from '../dist/stages.mjs';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const repo=path.resolve(root,'..','..');
const read=f=>fs.readFileSync(path.join(repo,f),'utf8');
const home=read('index.html'),app=read('app.html'),games=read('games/index.html');
const head=home.slice(0,home.indexOf('</head>'));
const text=s=>s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

// 1. Home page: findable, with the same title, description, share preview and structured data as before.
assert.ok(!/noindex/i.test(home),'the home page is never hidden from search');
assert.ok(head.includes('<meta name="robots" content="index,follow,max-image-preview:large">'));
assert.ok(head.includes('<title>Work Poop Calculator | Poop Profit</title>'));
assert.ok(head.includes('<meta name="description" content="Free poop calculator that shows how much you get paid to poop at work. Start a session timer, log every visit, and track your bathroom earnings over time.">'));
assert.ok(head.includes('<link rel="canonical" href="https://www.poopprofit.com/">'));
for(const [lang,href] of [['en','https://www.poopprofit.com/'],['en-GB','https://www.poopprofit.com/poo-calculator/'],['x-default','https://www.poopprofit.com/']])
 assert.ok(head.includes(`<link rel="alternate" hreflang="${lang}" href="${href}">`),'hreflang '+lang);
for(const tag of ['og:title','og:description','og:url','og:type','og:site_name','og:image','og:image:width','og:image:height'])assert.match(head,new RegExp(`<meta property="${tag}" content="[^"]+">`),tag);
assert.ok(head.includes('<meta property="og:url" content="https://www.poopprofit.com/">')&&head.includes('<meta property="og:image" content="https://www.poopprofit.com/Metatagimage.jpg">'));
assert.ok(head.includes('<meta name="twitter:card" content="summary_large_image">')&&/<meta name="twitter:image" content="https:\/\/www\.poopprofit\.com\/[^"]+">/.test(head));
{const ld=JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);const types=ld['@graph'].map(x=>x['@type']);assert.ok(types.includes('WebSite')&&types.includes('Organization'),types.join());assert.equal(ld['@graph'].find(x=>x['@type']==='WebSite').url,'https://www.poopprofit.com/');}
assert.equal((home.match(/<h1[\s>]/g)||[]).length,1,'one main heading');
assert.match(text(home.match(/<h1[\s\S]*?<\/h1>/)[0]),/Find Out How Much You Get Paid to Poop at Work/);
assert.equal((home.match(/<details class="pp-faq__item">/g)||[]).length,14,'all 14 FAQ answers are in the page');
assert.ok(!fs.existsSync(path.join(repo,'newindexsample.html')),'the sample page is gone now that it is the home page');
// Every file the page points at exists, and the UK calculator's links into the home page still land.
for(const m of home.matchAll(/(?:href|src)="(?!https?:|mailto:|#|data:)([^"?#]+)/g)){const p=m[1].replace(/^\//,'');if(!p)continue;const f=path.join(repo,decodeURIComponent(p));assert.ok(fs.existsSync(f)||fs.existsSync(f+'.html')||fs.existsSync(path.join(f,'index.html')),'missing '+m[1]);}
for(const m of read('poo-calculator/index.html').matchAll(/href="\/#([a-z-]+)"/g))assert.ok(home.includes(`id="${m[1]}"`),'poo-calculator links to /#'+m[1]);

// 2. Home game section: right facts, a growing top 10, #1 is Employee of the Month, and a way to the full board.
const gameSec=home.slice(home.indexOf('id="game"'),home.indexOf('id="token"'));
assert.ok(gameSec.includes('<li><b>2</b> levels + <b>Survival</b></li>')&&!/\b3<\/b> modes/.test(gameSec),'two levels plus survival, not "3 modes"');
assert.ok(gameSec.includes('<span>Top 10</span>')&&gameSec.includes('href="games/"'));
assert.ok(!/href="\/(games|app)/.test(home),'links stay relative, so a preview copy of the site links to itself');
assert.match(home,/var TOP = 10, MIN_ROWS = 3;/);assert.match(home,/body: JSON\.stringify\(\{ p_limit: TOP \}\)/);
assert.match(home,/for \(var n = 0; n < Math\.max\(MIN_ROWS, top\.length\); n\+\+\)/);
assert.ok(home.includes('tag.textContent = "Employee of the Month"')&&home.includes('span.textContent = name')&&!/innerHTML/.test(home),'names go in as text');
assert.match(home,/"Time to beat: " \+ clock\(top\[TOP - 1\]\.best_seconds\)/);
{const key=home.match(/var DB_PUBLIC_KEY = "([^"]+)"/)[1];assert.equal(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role,'anon','only the public key');}

// 3. poopprofit.com/games opens the app on the Games tab, and is not a page of its own in search.
assert.ok(games.includes('<meta name="robots" content="noindex">')&&games.includes('content="0;url=../app.html?tab=games"')&&games.includes("location.replace(location.pathname.replace(/games\\/?(index\\.html)?$/,'')+'app.html?tab=games')"));

// 4. App: Games took over Soon, Merch has its own tab, and both are wired into the tab switcher.
assert.ok(!app.includes('data-tab="coming"')&&!app.includes('id="panel-coming"'),'the Soon tab is gone');
const dock=app.slice(app.indexOf('<nav id="appDock"'),app.indexOf('</nav>',app.indexOf('<nav id="appDock"')));
assert.deepEqual([...dock.matchAll(/data-tab="([a-z]+)" type="button" aria-label="([A-Za-z]+)"/g)].map(m=>m[1]+':'+m[2]),['calculator:Calculator','stats:Stats','games:Games','merch:Merch']);
assert.ok(app.includes('games: document.getElementById("panel-games"),\n        merch: document.getElementById("panel-merch")'));
assert.ok(app.includes('var TAB_ORDER = ["calculator", "stats", "games", "merch"];'));
assert.ok(app.includes('if (tabName === "games") loadGamesBoard();'));
const gp=app.slice(app.indexOf('<section id="panel-games"'),app.indexOf('<section id="panel-merch"'));
for(const s of ['images/overtime-card-office.webp','images/overtime-card-lobby.webp','images/overtime-card-survival.webp','gamescomingsoong.png','id="gamesBoardRows"','id="gamesBoardGoal"','id="gamesBoardYou"','How to get on the board','href="auth.html"'])assert.ok(gp.includes(s),'games tab has '+s);
assert.ok(!gp.includes('merch'),'no merch on the Games tab');
assert.ok(app.slice(app.indexOf('<section id="panel-merch"'),app.indexOf('</section>',app.indexOf('<section id="panel-merch"'))).includes('src="merch%20coming%20soon.png"'));
for(const f of ['images/overtime-card-office.webp','images/overtime-card-lobby.webp','images/overtime-card-survival.webp','gamescomingsoong.png','merch coming soon.png'])assert.ok(fs.existsSync(path.join(repo,f)),f);
// "Play Survival" picks survival in the game (same site, same storage) with the game's real survival id.
assert.ok(gp.includes(`data-overtime-mode="${SURVIVAL_ID}"`)&&app.includes('localStorage.setItem("pp-overtime-mode", link.getAttribute("data-overtime-mode"))'));
assert.ok(fs.readFileSync(path.join(root,'dist/app.mjs'),'utf8').includes("localStorage.getItem('pp-overtime-mode')"),'the game still reads the remembered mode');
// The board: top 10, never fewer than 3 rows, names as text, a signed-in player's own place, quiet on failure.
assert.match(app,/var GAMES_TOP = 10, GAMES_MIN_ROWS = 3/);
assert.match(app,/for \(var n = 0; n < Math\.max\(GAMES_MIN_ROWS, top\.length\); n\+\+\)/);
const board=app.slice(app.indexOf('function gamesRow('),app.indexOf('function loadGamesBoard('));
assert.ok(!/innerHTML/.test(board)&&board.includes('document.createTextNode(String(entry.username))'),'usernames go in as text');
assert.match(app,/isSignedInMode\(\) && authContext\.accessToken \? authContext\.accessToken : null/);
assert.match(app,/ask\(signedToken\)\.catch\(function \(\) \{ return ask\(SUPABASE_ANON_KEY\); \}\)/,'an expired sign-in falls back to the public board');
assert.ok(app.includes('"The board is on a break. Try again in a minute."'));
// Opening on a tab from the address, without the timer tutorial on top.
assert.match(app,/var t = new URLSearchParams\(window\.location\.search\)\.get\("tab"\);/);
assert.ok(app.includes('if (seen || addressTab) return;')&&app.includes('if (addressTab) setActiveTab(addressTab);'));
assert.ok(app.indexOf('var addressTab =')<app.indexOf('function setupTutorial'),'addressTab is set up before the tutorial looks at it');
assert.ok(!/—/.test(text(gp))&&!/\bwage\b/i.test(text(gp)));
console.log('PASS: the new home page keeps its search and share tags and shows a growing top 10; the app Games tab carries the full board; Merch has its own tab; /games opens the Games tab.');
