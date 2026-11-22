const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{parseHTML}=require('linkedom');
const root=require('path').join(__dirname,'..'),C=require(root+'/js/core.js'),rects=require(root+'/tests/office-geometry.cjs');
async function run(width,bundle=false){
 const html=fs.readFileSync(root+(bundle?'/Line-Manager-Beta.html':'/index.html'),'utf8'),{document,window:dom}=parseHTML(html),memory=new Map();let frame,now=0,focusCalls=0;
 const V={obstacles:rects,images:{},fit(){},focus(){focusCalls++;},render(){},onTap(){},zoomBy(){}};
 const sandbox={window:{LMCore:C,LMOffice:V},document,innerWidth:width,localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},GameAudio:class{setMuted(){}},requestAnimationFrame:f=>{if(f.name==='frame')frame=f;else f();},addEventListener(){},console};
 vm.createContext(sandbox);
 const code=bundle?[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1]:fs.readFileSync(root+'/js/app.js','utf8');
 vm.runInContext(code,sandbox);await new Promise(r=>setImmediate(r));
 const g=sandbox.window.__lineManager.game;
 function refresh(){for(let i=0;i<3;i++){now+=120;frame(now);}}
 function click(selector){const el=document.querySelector(selector);assert.ok(el,selector);assert.ok(!el.disabled,selector+' disabled');el.dispatchEvent(new dom.Event('click',{bubbles:true}));}
 assert.match(document.getElementById('modal').textContent,/Start orientation/);assert.ok(document.querySelector('.mascot'));
 click('[data-action="help"]');assert.equal(document.querySelectorAll('.legend>div').length,5);assert.ok(!document.getElementById('modal').textContent.includes('Queued actions'));
 click('[data-action="help-close"]');click('[data-action="continue"]');assert.match(document.getElementById('modal').textContent,/Welcome toFacilities/);
 click('[data-action="start"]');assert.equal(g.screen,'play');const initialFocus=focusCalls;refresh();assert.equal(document.getElementById('lesson').hidden,false);
 for(let i=0;i<40;i++)g.tick(.1);refresh();click('[data-employee="jamie"]');assert.equal(g.active.id,'jamie');
 function until(fn){for(let i=0;i<12000&&!fn();i++)g.tick(1/60);assert.ok(fn());refresh();}
 until(()=>g.followers.length===1);click('[data-stall="1"]');until(()=>g.instruction===3);click('#paper');click('[data-stall="1"]');until(()=>g.instruction===4);until(()=>g.employees[1].state==='needing');click('[data-employee="riley"]');click('[data-stall="1"]');until(()=>g.screen==='report');
 assert.equal(focusCalls,initialFocus,'Selections must not recenter the camera');assert.match(document.getElementById('modal').textContent,/You know the floor/);click('[data-action="report-next"]');click('[data-action="start"]');assert.equal(g.day,1);assert.equal(g.mode,'career');
 click('#pause');assert.equal(g.screen,'pause');click('[data-action="home"]');assert.match(document.getElementById('modal').textContent,/Continue shift/);click('[data-action="continue"]');click('[data-action="resume"]');assert.equal(g.screen,'play');
 g.gdp=80;g.breaks=8;g.clock=g.duration-.05;g.employees.forEach(e=>e.rest=999);g.tick(.1);refresh();
 assert.equal(g.save.day,2);assert.match(document.querySelector('[data-action="report-next"]').textContent,/Continue to Day 2/);
 click('[data-action="home"]');assert.equal(document.querySelector('[data-replay="2"]').disabled,false);click('[data-action="continue"]');
 click('[data-action="report-next"]');assert.equal(g.day,2);assert.equal(g.employees.length,5);assert.equal(g.screen,'brief');
 click('[data-action="shop"]');assert.equal(document.querySelector('[data-buy="lead"]').disabled,false);click('[data-buy="lead"]');
 click('[data-action="shop-next"]');assert.equal(g.day,2);assert.equal(g.leadCap,3);click('[data-action="start"]');
 g.gdp=100;g.breaks=8;g.end();click('[data-action="shop"]');assert.match(document.querySelector('[data-action="shop-next"]').textContent,/Continue to Day 3/);click('[data-action="shop-next"]');assert.equal(g.day,3);click('[data-action="start"]');
 click('#pause');click('[data-action="home"]');click('[data-action="daily"]');click('[data-action="start"]');g.end();assert.equal(document.querySelectorAll('[data-action="retry"]').length,0);assert.equal(document.querySelectorAll('[data-action="report-next"]').length,1);
 console.log(`${width}px ${bundle?'standalone':'source'} UI: title, guide, orientation, report, Day 1, pause/resume passed`);
}
(async()=>{await run(1440);await run(390);if(!process.argv.includes('--source-only'))await run(390,true);})().catch(e=>{console.error(e);process.exit(1)});
