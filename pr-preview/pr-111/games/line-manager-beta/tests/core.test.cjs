const test=require('node:test');const assert=require('node:assert/strict');const C=require('../js/core.js');const rects=require('./office-geometry.cjs');const nav=new C.Nav(rects);
function setup(day=1,upgrades={}){const s=C.defaults();s.day=day;s.upgrades={...s.upgrades,...upgrades};const g=new C.Game(s,nav);g.start('career',day);return g;}
function until(g,fn,max=60){for(let t=0;t<max*60;t++){if(fn())return;g.tick(1/60);}assert.ok(fn(),'Expected state not reached');}
test('All ten desks connect to every stall and the supply shelf',()=>{for(const d of C.DESKS){for(let i=1;i<=5;i++){assert.ok(nav.path(d,{x:i+.5,y:1.1}),d.name+' to '+i);}assert.ok(nav.path(d,{x:7.15,y:1.18}));}});
test('Pathfinding refuses disconnected destinations',()=>{const blocked=new C.Nav([[0,5,16,6]]);assert.equal(blocked.path({x:2,y:2},{x:2,y:8}),null);});
test('A pickup, walk, stall entry and return complete without teleporting',()=>{const g=setup();g.employees.forEach(e=>e.rest=999);const e=g.employees[0];e.state='needing';g.enqueue('pickup',e.id);until(g,()=>e.state==='following');g.enqueue('stall',1);until(g,()=>e.state==='entering');assert.ok(e.path.length);until(g,()=>e.state==='inStall');assert.equal(g.stalls[0].paper,2);until(g,()=>g.breaks===1);assert.ok(g.gdp>0);assert.equal(g.stalls[0].occupant,null);until(g,()=>e.state==='working');assert.equal(e.x,e.home.x);});
test('Paper can top up a nonempty dispenser',()=>{const g=setup();g.employees.forEach(e=>e.rest=999);g.stalls[0].paper=1;g.enqueue('paper');g.enqueue('stall',1);until(g,()=>g.restocked===1);assert.equal(g.stalls[0].paper,3);assert.equal(g.herman.carrying,false);});
test('Heated seat has the approved 1.5 duration and 1.25 GDP rate',()=>{const p=C.heatPreview();assert.ok(Math.abs(p.heatedSeconds/p.normalSeconds-1.5)<1e-9);assert.ok(Math.abs(p.heatedGDP/p.normalGDP-1.875)<1e-9);assert.equal(C.gdpRate('sales',true)/C.gdpRate('sales',false),1.25);});
test('HR stops at three complaints with a recoverable award',()=>{const g=setup();g.employees.slice(0,3).forEach(e=>{e.state='needing';e.urgency=.9999;});g.tick(.1);assert.equal(g.screen,'report');assert.equal(g.report.complaints,3);assert.ok(g.report.credited>=8);});
test('Repeated end calls and replays cannot duplicate budget awards',()=>{const g=setup();g.breaks=8;g.gdp=100;g.end();const earned=g.save.budget;g.end();assert.equal(g.save.budget,earned);g.start('career',1);g.breaks=8;g.gdp=100;g.end();assert.equal(g.save.budget,earned);g.start('career',1);g.breaks=12;g.gdp=160;g.end();assert.equal(g.save.budget,g.report.award);});
test('Checkpoint resumes exact state and deterministic demand',()=>{const g=setup();for(let i=0;i<240;i++)g.tick(1/60);g.enqueue('pickup','jamie');g.pause();const s=C.copy(g.save),other=new C.Game(s,nav);assert.ok(other.restore());assert.deepEqual(other.snapshot(),g.snapshot());other.screen='play';g.screen='play';for(let i=0;i<120;i++){g.tick(1/60);other.tick(1/60);}assert.deepEqual(other.snapshot(),g.snapshot());});
test('Daily play leaves a paused career checkpoint and budget intact',()=>{const g=setup();g.tick(.1);g.pause();const cp=C.copy(g.save.checkpoint),budget=g.save.budget;g.start('daily',7);g.gdp=150;g.breaks=10;g.end();assert.equal(g.save.budget,budget);assert.deepEqual(g.save.checkpoint,cp);assert.ok(g.save.daily[C.dateKey()]);});
test('Save recovery uses a valid backup and rejects malformed JSON',()=>{const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};const store=new C.Store(storage),s=C.defaults();s.budget=12;store.write(s);s.budget=20;store.write(s);data.set(C.SAVE_KEY,'{broken');assert.equal(store.load().budget,12);assert.equal(store.recovered,true);});
test('Shop enforces levels, prices and unlock days',()=>{const g=setup();g.save.budget=999;assert.equal(g.buy('lead'),false);assert.equal(g.buy('shoes'),true);assert.equal(g.save.budget,971);assert.equal(g.buy('shoes'),true);assert.equal(g.buy('shoes'),false);});
test('Seven introductory days cap at ten employees',()=>{const g=setup();for(let d=1;d<=12;d++){g.loadDay('career',d);assert.equal(g.employees.length,Math.min(10,3+d));}});
test('Closing Day 1 saves Day 2 as unlocked before any menu action',()=>{
 const g=setup();g.gdp=80;g.breaks=8;g.clock=g.duration-.05;g.employees.forEach(e=>e.rest=999);g.tick(.1);
 assert.equal(g.screen,'report');assert.equal(g.report.day,1);assert.equal(g.save.day,2);assert.equal(g.save.checkpoint,null);
 const memory=new Map(),store=new C.Store({getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)});store.write(g.save);
 const saved=store.load(),budget=saved.budget;assert.equal(saved.day,2);assert.equal(saved.lastReport.day,1);
 const resumed=new C.Game(saved,nav);resumed.loadDay('career',saved.lastReport.day);resumed.next();assert.equal(resumed.day,2);assert.equal(resumed.employees.length,5);assert.equal(saved.budget,budget);
 resumed.start('career',1);resumed.end();assert.equal(saved.day,2,'Replaying Day 1 must not unlock Day 3');
});
test('Old completed-day saves recover the next day without altering awards or upgrades',()=>{
 const old=C.defaults();old.records[1]={gdp:80,stars:2};old.budget=70;old.upgrades.shoes=1;old.awards[1]=70;
 const fixed=C.cleanSave(old);assert.equal(fixed.day,2);assert.equal(fixed.tutorialDone,true);assert.equal(fixed.budget,70);assert.deepEqual(fixed.upgrades,old.upgrades);assert.deepEqual(fixed.awards,old.awards);
 old.records={};old.lastReport={mode:'career',day:1};assert.equal(C.cleanSave(old).day,2);
 const daily=C.defaults();daily.daily[C.dateKey()]={gdp:300,stars:3};daily.lastReport={mode:'daily',day:7};assert.equal(C.cleanSave(daily).day,1);
});
test('Identical daily challenge starts have identical state',()=>{const a=setup(),b=setup(7,{shoes:2,lead:2,paper:2,stall:3});a.start('daily',7);b.start('daily',7);assert.deepEqual(a.snapshot(),b.snapshot());});
test('Leaving the main menu does not erase a paused career checkpoint',()=>{const g=setup();g.tick(.1);g.pause();const cp=C.copy(g.save.checkpoint);g.screen='title';g.persist();assert.deepEqual(g.save.checkpoint,cp);});
test('A complete guided orientation reaches its report',()=>{const g=setup();g.start('orientation',1);until(g,()=>g.employees[0].state==='needing');g.enqueue('pickup','jamie');g.enqueue('stall',1);until(g,()=>g.instruction===3);g.enqueue('paper');g.enqueue('stall',1);until(g,()=>g.instruction===4);until(g,()=>g.employees[1].state==='needing');g.enqueue('pickup','riley');g.enqueue('stall',1);until(g,()=>g.screen==='report');assert.equal(g.report.breaks,2);assert.equal(g.save.tutorialDone,true);assert.equal(g.save.budget,12);});
test('Leadership level two batches followers into nearby stalls',()=>{const g=setup(5,{lead:2,stall:1});g.employees.forEach(e=>e.rest=999);g.employees.slice(0,2).forEach(e=>e.state='needing');g.enqueue('pickup','jamie');until(g,()=>g.followers.length===1);g.enqueue('pickup','riley');g.enqueue('stall',1);until(g,()=>g.breaks===2);assert.equal(g.complaints,0);});

test('A pickup interrupts stall travel immediately, then resumes that stall',()=>{
 const g=setup();g.start('orientation',1);g.employees.forEach(e=>{e.rest=999;e.state='needing';});
 g.enqueue('pickup','jamie');until(g,()=>g.followers.length===1);g.enqueue('stall',1);g.tick(.1);
 assert.equal(g.enqueue('pickup','riley'),true);assert.equal(g.active.kind,'pickup');assert.equal(g.active.id,'riley');assert.deepEqual(g.queue,[{kind:'stall',id:1}]);
 until(g,()=>g.employees[1].state==='following');assert.equal(g.active.kind,'stall');assert.equal(g.active.id,1);assert.equal(g.followers.length,2);
});
test('New stall replaces old stall; clear floor cancels it and preserves followers',()=>{
 const g=setup();g.start('orientation',1);g.employees[0].state='needing';g.enqueue('pickup','jamie');until(g,()=>g.followers.length===1);
 g.enqueue('stall',1);g.enqueue('stall',2);assert.equal(g.active.id,2);assert.equal(g.queue.length,0);
 const dest=nav.point(nav.nearest({x:6,y:7}));g.enqueue('walk',dest);assert.equal(g.active.kind,'walk');assert.equal(g.followers.length,1);assert.equal(g.queue.length,0);
 until(g,()=>!g.active);assert.equal(g.followers.length,1);
});
test('Tapping furniture does not replace the current valid destination',()=>{
 const g=setup();g.enqueue('walk',nav.point(nav.nearest({x:6,y:7})));const c=C.copy(g.active);
 assert.equal(g.enqueue('walk',{x:3,y:7.9}),false);assert.deepEqual(g.active,c);
});
test('Every desk route maintains body clearance at corners and along walls',()=>{
 for(const d of C.DESKS)for(const target of [{x:7.15,y:1.18},...Array.from({length:5},(_,i)=>({x:i+1.5,y:1.1}))]){
  const start=nav.point(nav.nearest(d)),route=nav.path(start,target);let a=start;
  for(const b of route){const n=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/.025);for(let k=0;k<=n;k++){
   const t=n?k/n:0,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
   assert.ok(!rects.some(r=>x>r[0]-.249&&x<r[2]+.249&&y>r[1]-.249&&y<r[3]+.249),d.id+' clips furniture');
  }a=b;}
 }
});
test('Redirecting mid-walk does not move Herman through a corner',()=>{
 const g=setup(7);g.start('orientation',1);g.employees.forEach(e=>e.rest=999);
 const points=[{x:9,y:1.82},{x:11,y:4.82},{x:2.2,y:7.85},{x:14.58,y:2.66},{x:1.5,y:1.1}];
 for(let n=0;n<500;n++){if(n%7===0)g.enqueue('walk',nav.point(nav.nearest(points[Math.floor(n/7)%points.length])));const before={...g.herman};g.tick(.05);assert.ok(Math.hypot(g.herman.x-before.x,g.herman.y-before.y)<=g.speed*.05+.0001);assert.ok(!rects.some(r=>g.herman.x>r[0]-.2&&g.herman.x<r[2]+.2&&g.herman.y>r[1]-.2&&g.herman.y<r[3]+.2));}
});
test('Old layout checkpoints discard stale routes but preserve shift progress',()=>{
 const g=setup();g.gdp=30;g.breaks=2;g.enqueue('walk',{x:6,y:7});g.pause();delete g.save.checkpoint.layout;
 const restored=new C.Game(g.save,nav);assert.equal(restored.restore(),true);assert.equal(restored.gdp,30);assert.equal(restored.breaks,2);assert.equal(restored.active,null);assert.equal(restored.queue.length,0);assert.equal(restored.herman.path.length,0);assert.equal(restored.screen,'pause');
});

test('The line preserves pickup order and clears the recorded restroom-side route',()=>{
 const g=setup(7,{lead:2});g.mode='orientation';g.employees.forEach(e=>e.rest=999);
 for(const id of ['alex','pat','jordan']){const e=g.employees.find(e=>e.id===id);e.state='needing';g.enqueue('pickup',id);until(g,()=>e.state==='following');}
 assert.deepEqual(g.followers.map(e=>e.id),['alex','pat','jordan']);
 for(const target of [{x:6.5,y:4.5},{x:6.5,y:6.5},{x:4.5,y:6.5},{x:4.5,y:2}]){
  g.enqueue('walk',nav.point(nav.nearest(target)));
  for(let n=0;n<1200;n++){
   const actors=[g.herman,...g.followers],before=actors.map(a=>({x:a.x,y:a.y}));g.tick(1/60);
   actors.forEach((a,i)=>{assert.ok(Math.hypot(a.x-before[i].x,a.y-before[i].y)<=g.speed*1.08/60+.0001,'No teleporting');assert.ok(!rects.some(r=>a.x>r[0]-.2&&a.x<r[2]+.2&&a.y>r[1]-.2&&a.y<r[3]+.2),'Every follower clears solid furniture');});
   if(!g.active&&n>80)break;
  }
 }
 for(const e of g.followers){let distance=0,prev=e;for(const p of e.path){distance+=Math.hypot(p.x-prev.x,p.y-prev.y);prev=p;}assert.ok(distance>=1.19,'Follower retains a gap along the route');}
});
test('An empty stall requests paper, remembers its number, and refills it',()=>{
 const g=setup();g.employees.forEach(e=>e.rest=999);g.stalls[1].paper=0;
 assert.equal(g.enqueue('stall',2),true);assert.equal(g.active.kind,'paper');assert.deepEqual(g.queue,[{kind:'stall',id:2}]);until(g,()=>g.restocked===1);assert.equal(g.stalls[1].paper,g.paperMax);assert.equal(g.herman.carrying,false);
});
test('An occupied-stall rejection preserves the valid trip already in progress',()=>{
 const g=setup();g.employees.forEach(e=>e.rest=999);g.stalls[1].occupant='busy';g.enqueue('walk',nav.point(nav.nearest({x:6.5,y:6.5})));const command=C.copy(g.active),route=C.copy(g.herman.path);
 assert.equal(g.enqueue('stall',2),false);assert.deepEqual(g.active,command);assert.deepEqual(g.herman.path,route);
});
test('Restocking with a follower refills before escorting them inside',()=>{
 const g=setup();g.mode='orientation';g.employees.forEach(e=>e.rest=999);g.employees[0].state='needing';g.enqueue('pickup','jamie');until(g,()=>g.followers.length===1);g.stalls[1].paper=0;g.enqueue('stall',2);until(g,()=>g.employees[0].state==='inStall');assert.equal(g.restocked,1);assert.equal(g.stalls[1].paper,g.paperMax-1);
});
