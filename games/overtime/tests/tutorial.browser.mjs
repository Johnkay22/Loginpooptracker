// Run against a local server: BASE_URL=http://127.0.0.1:8000/ PLAYWRIGHT_MODULE=/path/to/playwright npm exec -- node tests/tutorial.browser.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const base=process.env.BASE_URL||'http://127.0.0.1:8000/';
const errors=[];
const artifacts=process.env.ARTIFACT_DIR||'/tmp/overtime-guide';fs.mkdirSync(artifacts,{recursive:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'beta-test-survival-game.html');
 const saved=await page.evaluate(()=>JSON.stringify(localStorage));
 await page.locator('#howBtn').click();assert.equal(await page.locator('#howSheet').evaluate(el=>el.open),true);
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(650);await page.keyboard.up('ArrowRight');assert.match(await page.locator('#lessonStatus').textContent(),/Nice/);
 await page.locator('[data-step="1"]').click();await page.locator('#lessonDemo').click();await page.waitForFunction(()=>document.querySelector('#lessonStatus').textContent.includes('Promotion chosen'));assert.equal(await page.locator('#practiceXP').getAttribute('value'),'5');
 await page.locator('#lessonReplay').click();assert.equal(await page.locator('#practiceXP').getAttribute('value'),'0');
 // Collect coins using pointer steering, then pick a real practice choice.
 const box=await page.locator('#practiceFloor').boundingBox();await page.mouse.move(box.x+60,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+160,box.y+box.height/2);await page.waitForTimeout(1650);await page.mouse.up();
 assert.equal(await page.locator('#practiceXP').getAttribute('value'),'5');await page.locator('[data-choice="plunger"]').click();assert.match(await page.locator('#lessonStatus').textContent(),/Promotion chosen/);
 await page.locator('[data-step="2"]').click();await page.keyboard.press('Space');assert.equal(await page.locator('#practiceBomb').isDisabled(),true);await page.waitForFunction(()=>document.querySelector('#lessonStatus').textContent.startsWith('Boom'));assert.equal(await page.locator('#practiceBomb').isDisabled(),true);
 await page.locator('[data-step="3"]').click();await page.locator('[data-heal="coffee"]').click();assert.equal(await page.locator('#practiceHealth').getAttribute('value'),'60');await page.locator('[data-heal="kit"]').click();assert.equal(await page.locator('#practiceHealth').getAttribute('value'),'76');
 await page.locator('[data-step="4"]').click();await page.locator('#practiceAttack').click();await page.waitForFunction(()=>document.querySelector('#lessonStatus').textContent.startsWith('Still inside'));await page.locator('#practiceAttack').click();await page.keyboard.down('d');await page.waitForTimeout(800);await page.keyboard.up('d');await page.waitForFunction(()=>document.querySelector('#lessonStatus').textContent.startsWith('Dodged'));
 await page.locator('[data-step="5"]').click();await page.getByText('How do weapons evolve?',{exact:true}).click();assert.match(await page.locator('.guide-recipes').textContent(),/Double Plunge/);
 // Modal contains keyboard focus; Escape closes and returns focus to the opener.
 for(let i=0;i<18;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('#howSheet').contains(document.activeElement)));}
 await page.keyboard.press('Escape');assert.equal(await page.locator('#howSheet').evaluate(el=>el.open),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'howBtn');assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),saved);
 await page.locator('#startBtn').click();await page.waitForTimeout(700);await page.locator('#pause').click();const timer=await page.locator('#timer').textContent(),hp=await page.locator('#hp').textContent();await page.locator('#howPause').click();await page.keyboard.press('p');await page.locator('[data-step="2"]').click();await page.keyboard.press('Space');await page.waitForTimeout(1200);assert.equal(await page.locator('#timer').textContent(),timer);assert.equal(await page.locator('#hp').textContent(),hp);await page.keyboard.press('Escape');assert.equal(await page.locator('#pauseScreen').isVisible(),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'howPause');await page.locator('#resume').click();assert.equal(await page.locator('#pauseScreen').isVisible(),false);
 // All lessons remain reachable without horizontal overflow at phone, short phone and landscape sizes.
 for(const size of [{width:807,height:591},{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
  await page.setViewportSize(size);await page.reload();await page.locator('#howBtn').click();
  for(let i=0;i<6;i++){await page.locator(`[data-step="${i}"]`).click();assert.ok(await page.locator('#howSheet').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`overflow at ${size.width}, lesson ${i}`);await page.locator('#lessonNext').scrollIntoViewIfNeeded();assert.equal(await page.locator('#lessonNext').isVisible(),true);}
  await page.locator('[data-step="0"]').click();
  if(size.width===807){await page.evaluate(()=>document.fonts.ready);assert.ok(await page.locator('#howSheet').evaluate(el=>el.scrollHeight<=el.clientHeight+1),'first lesson fits the reference-sized desktop');}
  if(size.width===390){await page.locator('#lessonTitle').scrollIntoViewIfNeeded();await page.screenshot({path:artifacts+'/guide-mobile.png'});}
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1280,height:900});await page.locator('#howBtn').click();await page.screenshot({path:artifacts+'/guide-desktop.png'});
 // Real touch events exercise pointer capture and release on a phone viewport.
 const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const touchPage=await touchContext.newPage();touchPage.on('pageerror',e=>errors.push(e.message));await touchPage.goto(base+'beta-test-survival-game.html');await touchPage.locator('#howBtn').tap();await touchPage.locator('#practiceFloor').scrollIntoViewIfNeeded();
 const touchBox=await touchPage.locator('#practiceFloor').boundingBox(),cdp=await touchContext.newCDPSession(touchPage),tx=touchBox.x+70,ty=touchBox.y+touchBox.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+60,y:ty}]});await touchPage.waitForTimeout(650);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.match(await touchPage.locator('#lessonStatus').textContent(),/Nice/);
 const left=await touchPage.locator('.practice-herman').evaluate(el=>el.style.left);await touchPage.waitForTimeout(200);assert.equal(await touchPage.locator('.practice-herman').evaluate(el=>el.style.left),left,'touch release stops movement');await touchContext.close();
 assert.deepEqual(errors,[]);console.log('PASS browser: every lesson, keyboard/pointer input, replay, focus, save isolation, paused run and responsive layouts');
} finally {await browser.close();}
