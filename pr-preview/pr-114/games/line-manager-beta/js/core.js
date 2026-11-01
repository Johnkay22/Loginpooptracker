(function(root){
'use strict';
const LAYOUT=4;
const VERSION=2, SAVE_KEY='poop-profit-line-manager-beta-v2';
const copy=x=>JSON.parse(JSON.stringify(x));
const STATS={intern:{label:'Intern',hourly:16.5,patience:37,breakTime:5,rest:39},sales:{label:'Sales Rep',hourly:38,patience:33,breakTime:7.2,rest:36},manager:{label:'Manager',hourly:72,patience:32,breakTime:11,rest:42}};
const DESKS=[
 {id:'jamie',name:'Jamie',kind:'intern',x:2.2,y:7.85},
 {id:'riley',name:'Riley',kind:'intern',x:4.2,y:7.85},
 {id:'chris',name:'Chris',kind:'sales',x:8.7,y:1.82},
 {id:'sam',name:'Sam',kind:'intern',x:2.6,y:10.05},
 {id:'alex',name:'Alex',kind:'sales',x:10.7,y:1.82},
 {id:'jordan',name:'Jordan',kind:'sales',x:8.7,y:4.82},
 {id:'pat',name:'Pat',kind:'manager',x:14.58,y:2.66},
 {id:'quinn',name:'Quinn',kind:'intern',x:4.6,y:10.05},
 {id:'taylor',name:'Taylor',kind:'sales',x:10.7,y:4.82},
 {id:'morgan',name:'Morgan',kind:'manager',x:14.58,y:7.66}
];
const EVENTS=[
 {name:'Opening day',desc:'Meet the team. Get your first breaks on the books.',demand:1},
 {name:'Growing pains',desc:'One new desk. Plan a group trip to the restroom.',demand:1.02},
 {name:'Taco Tuesday',desc:'The lunch rush is stronger. Stock your stalls before noon.',demand:1.02,lunch:1.6},
 {name:'Plumbing inspection',desc:'A full dispenser adds 8 Facilities credits at closing.',demand:1.06,inspection:true},
 {name:'Board visit',desc:'Your first manager joins the floor. Leave time for the longer walk.',demand:1.02},
 {name:'Casual Friday',desc:'Everyone gets 20% more patience. Build a smooth-operation streak.',demand:1.08,patience:1.2},
 {name:'The full house',desc:'Ten desks. One very proud CEO. Put your upgrades to work.',demand:1.08}
];
const UPGRADES=[
 {id:'stall',name:'New stall',icon:'▥',prices:[42,66,96],day:1,desc:'Another gold toilet. More room for the line.'},
 {id:'paper',name:'Bigger dispensers',icon:'◉',prices:[30,60],day:1,desc:'Adds two paper uses to every stall.'},
 {id:'shoes',name:'Running shoes',icon:'➚',prices:[28,62],day:1,desc:'Faster trips across the floor. Same proud waddle.'},
 {id:'lead',name:'Leadership seminar',icon:'♙',prices:[36,82],day:2,desc:'Level 1: +1 follower, half-speed urgency in line. Level 2: +1 follower and nearby batch seating.'},
 {id:'heat',name:'Heated seat',icon:'≈',prices:[32],day:3,desc:'50% longer breaks, 25% higher Bathroom GDP rate. Heated completions count double toward the service budget.'}
];
function defaults(){return {version:VERSION,day:1,budget:0,tutorialDone:false,muted:false,upgrades:{stall:0,paper:0,shoes:0,lead:0,heat:0},heated:1,records:{},daily:{},awards:{},checkpoint:null,lastReport:null};}
function cleanSave(raw){
 if(!raw||typeof raw!=='object'||raw.version!==VERSION) throw new Error('Invalid save');
 const s={...defaults(),...raw};
 s.day=Math.max(1,Math.min(9999,Math.floor(Number(s.day)||1)));
 s.budget=Math.max(0,Math.min(1e8,Number(s.budget)||0));
 s.upgrades={...defaults().upgrades};
 for(const u of UPGRADES)s.upgrades[u.id]=Math.max(0,Math.min(u.prices.length,Math.floor(Number(raw.upgrades?.[u.id])||0)));
 for(const k of ['records','daily','awards'])if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))s[k]={};
 // Older saves only unlocked tomorrow after visiting the shop. Recover completed days.
 const completed=Object.keys(s.records).map(Number).filter(d=>Number.isInteger(d)&&d>=1&&d<9999);
 if(s.lastReport?.mode==='career'&&Number.isInteger(s.lastReport.day)&&s.lastReport.day>=1&&s.lastReport.day<9999)completed.push(s.lastReport.day);
 if(completed.length){s.day=Math.max(s.day,...completed.map(d=>d+1));s.tutorialDone=true;}
 if(s.checkpoint && (!Array.isArray(s.checkpoint.employees)||!Array.isArray(s.checkpoint.stalls)||!s.checkpoint.herman||!Number.isFinite(s.checkpoint.clock)))s.checkpoint=null;
 return s;
}
class Store{
 constructor(storage){this.storage=storage;this.ok=true;this.recovered=false;}
 load(){for(const key of [SAVE_KEY,SAVE_KEY+':backup']){try{const raw=this.storage.getItem(key);if(raw){const s=cleanSave(JSON.parse(raw));if(key.endsWith(':backup'))this.recovered=true;return s;}}catch(e){this.recovered=true;}}return defaults();}
 write(save){try{const value=JSON.stringify(save),old=this.storage.getItem(SAVE_KEY);if(old){try{cleanSave(JSON.parse(old));this.storage.setItem(SAVE_KEY+':backup',old);}catch(e){}}this.storage.setItem(SAVE_KEY,value);this.ok=true;return true;}catch(e){this.ok=false;return false;}}
}
function dateKey(d=new Date()){return d.toISOString().slice(0,10);}
function seedOf(str){let h=2166136261;for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rand(g){let t=g.rng+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
class Nav{
 constructor(rects){this.unit=.125;this.w=128;this.h=120;this.rects=rects;this.radius=.25;this.open=new Uint8Array(this.w*this.h);
  for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++){const p=this.point(y*this.w+x);this.open[y*this.w+x]=p.x>.3&&p.x<15.7&&p.y>1.03&&p.y<14.7&&!rects.some(r=>p.x>r[0]-this.radius&&p.x<r[2]+this.radius&&p.y>r[1]-this.radius&&p.y<r[3]+this.radius)?1:0;}
 }
 point(i){return {x:(i%this.w+.5)*this.unit,y:(Math.floor(i/this.w)+.5)*this.unit};}
 index(p){return Math.max(0,Math.min(this.h-1,Math.floor(p.y/this.unit)))*this.w+Math.max(0,Math.min(this.w-1,Math.floor(p.x/this.unit)));}
 nearest(p){const idx=this.index(p);if(this.open[idx])return idx;let best=-1,dist=.8;const xx=idx%this.w,yy=Math.floor(idx/this.w);for(let y=Math.max(0,yy-6);y<=Math.min(this.h-1,yy+6);y++)for(let x=Math.max(0,xx-6);x<=Math.min(this.w-1,xx+6);x++){const i=y*this.w+x;if(!this.open[i])continue;const q=this.point(i),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<dist){dist=d;best=i;}}return best;}
 path(a,b){const start=this.nearest(a),end=this.nearest(b);if(start<0||end<0)return null;if(start===end)return [this.point(end)];
  const prev=new Int32Array(this.open.length).fill(-1),q=new Int32Array(this.open.length);let tail=1,head=0;q[0]=start;prev[start]=start;
  while(head<tail){const i=q[head++];if(i===end)break;const x=i%this.w;for(const n of [x>0?i-1:-1,x<this.w-1?i+1:-1,i-this.w,i+this.w]){if(n<0||n>=this.open.length||!this.open[n]||prev[n]!==-1)continue;prev[n]=i;q[tail++]=n;}}
  if(prev[end]===-1)return null;
  const nodes=[];for(let i=end;i!==start;i=prev[i])nodes.push(this.point(i));nodes.reverse();
  // Keep corners and the first cell, never replace an unreachable route with a straight line.
  return nodes.filter((p,i)=>i===0||i===nodes.length-1||((p.x-nodes[i-1].x)!==(nodes[i+1].x-p.x)||(p.y-nodes[i-1].y)!==(nodes[i+1].y-p.y)));
 }
 length(a,b){const p=this.path(a,b);if(!p)return Infinity;let d=0,last=a;for(const v of p){d+=Math.hypot(v.x-last.x,v.y-last.y);last=v;}return d;}
}
function move(actor,dt,speed){actor.trace=[];let left=dt*speed,moved=false;while(left>0&&actor.path.length){const p=actor.path[0],dx=p.x-actor.x,dy=p.y-actor.y,d=Math.hypot(dx,dy);if(d<=left){actor.x=p.x;actor.y=p.y;actor.path.shift();left-=d;}else{actor.x+=dx/d*left;actor.y+=dy/d*left;left=0;}if(d>.001){actor.trace.push({x:actor.x,y:actor.y});actor.facing=Math.atan2(dy,dx);moved=true;}}actor.moving=moved;return !actor.path.length;}
function gdpRate(kind,heated){return STATS[kind].hourly*(8/180)*(heated?1.25:1);}
function heatPreview(){const sec=STATS.sales.breakTime;return {normalSeconds:sec,heatedSeconds:sec*1.5,normalGDP:gdpRate('sales',false)*sec,heatedGDP:gdpRate('sales',true)*sec*1.5};}
function awardFor(g){const raw=g.gdp*.16+g.breaks*4.2+g.heatedBreaks*4.2+g.streakBonus+(g.goalMet?10:0)+(g.event.inspection&&g.stalls.some(s=>s.paper===g.paperMax)?8:0);return Math.max(g.breaks>0?28:8,Math.round(raw*Math.max(.4,1-g.complaints*.15)));}
function starsFor(g){return g.gdp>=g.target?(g.complaints===0&&g.goalMet?3:2):g.breaks>0?1:0;}
class Game{
 constructor(save,nav,hooks={}){this.save=save;this.nav=nav;this.hooks=hooks;this.screen='title';this.mode='career';this.loadDay('career',save.day);this.screen='title';}
 get speed(){return 3.3+this.upgrades.shoes*.65;}
 get paperMax(){return 3+this.upgrades.paper*2;}
 get leadCap(){return 2+this.upgrades.lead;}
 get followers(){return this.employees.filter(e=>e.state==='following').sort((a,b)=>(a.followOrder||0)-(b.followOrder||0));}
 get goalMet(){return this.objective==='group'?this.maxGroup>=2:this.objective==='service'?this.breaks>=8:this.objective==='streak'?this.bestStreak>=4:this.complaints===0&&this.breaks>=4;}
 emit(type,data){this.hooks[type]?.(data);}
 say(text){this.message=text;this.messageTime=3.5;this.emit('message',text);}
 loadDay(mode='career',day=1){
  this.mode=mode;this.day=day;this.dailyKey=dateKey();this.rng=seedOf(mode==='daily'?this.dailyKey:'career-'+day);this.upgrades=mode==='daily'?{stall:2,paper:1,shoes:1,lead:1,heat:1}:copy(this.save.upgrades);
  this.event=copy(EVENTS[mode==='daily'?seedOf(this.dailyKey)%7:day<=7?day-1:[2,3,5,6][(day-8)%4]]);
  this.duration=mode==='orientation'?80:180;this.clock=0;this.gdp=0;this.breaks=0;this.complaints=0;this.heatedBreaks=0;this.streak=0;this.bestStreak=0;this.streakBonus=0;this.maxGroup=0;this.restocked=0;this.instruction=0;
  this.target=mode==='orientation'?15:mode==='daily'?240:[60,95,120,155,185,210,240][Math.min(day-1,6)];
  this.objective=mode==='orientation'?'service':['clean','group','service','clean','group','streak','service'][(day-1)%7];
  this.layout=LAYOUT;this.lineSerial=0;this.herman={x:5.4,y:6.55,path:[],facing:1.6,carrying:false,moving:false};this.queue=[];this.active=null;this.message='';this.messageTime=0;this.effects=[];this.report=null;this.autosave=0;this.batch=[];
  this.stalls=Array.from({length:2+this.upgrades.stall},(_,k)=>({i:k+1,paper:this.paperMax,occupant:null,heated:!!this.upgrades.heat&&(k+1===(mode==='daily'?1:this.save.heated))}));
  const n=mode==='orientation'?2:mode==='daily'?10:Math.min(10,3+day);
  this.employees=DESKS.slice(0,n).map((d,i)=>({...copy(d),home:{x:d.x,y:d.y},path:[],state:'working',urgency:0,rest:mode==='orientation'?(i?999:1.5):5+i*7+rand(this)*2,breakLeft:0,earned:0,facing:1,moving:false,followId:null,followClock:0}));
  for(const a of [this.herman,...this.employees]){const i=this.nav.nearest(a);if(i>=0){Object.assign(a,this.nav.point(i));if(a.home)a.home={x:a.x,y:a.y};}}
  this.screen='brief';
 }
 begin(){this.screen='play';this.say(this.mode==='orientation'?'Tap Jamie to pick up your first employee.':'Good morning, team.');this.persist();}
 start(mode='career',day=this.save.day){this.loadDay(mode,day);this.begin();}
 route(actor,p){const path=this.nav.path(actor,p);if(!path)return false;actor.path=path;return true;}
 enqueue(kind,id){
  if(this.screen!=='play')return false;
  const c={kind,id};
  if(kind==='pickup'){
   const e=this.employees.find(e=>e.id===id);
   if(!e||e.state!=='needing'||this.active?.kind==='pickup'&&this.active.id===id)return false;
   if(this.followers.length>=this.leadCap){this.say('Your line is full. Seat the team first.');return false;}
  }
  if(kind==='paper'&&this.herman.carrying){this.say('Paper in hand. Tap a stall to top it up.');return false;}
  if(kind==='stall'){
   const stall=this.stalls.find(s=>s.i===id);
   if(!stall)return false;
   if(stall.occupant&&stall.paper>0&&!this.herman.carrying){this.say('That stall is occupied.');return false;}
   if(stall.paper>0&&!this.herman.carrying&&!this.followers.length&&this.active?.kind!=='pickup'&&this.active?.kind!=='paper'){this.say('Pick up an employee first, or collect paper.');return false;}
   // A stall tap during pickup chooses where to go after collecting that person.
   if(this.active&&['pickup','paper'].includes(this.active.kind)){
    this.queue=[c];this.batch=[];return true;
   }
  }
  if(kind==='walk'&&(!Number.isFinite(id?.x)||!Number.isFinite(id?.y)||!this.nav.open[this.nav.index(id)])){
   this.say('Tap a clear spot on the floor.');return false;
  }
  // A pickup interrupts travel now, retaining only the chosen stall as the next stop.
  const onward=kind==='pickup'?(this.active?.kind==='stall'?this.active:this.queue.find(q=>q.kind==='stall')):null;
  let dest=kind==='pickup'?this.employees.find(e=>e.id===id):kind==='paper'?{x:7.15,y:1.18}:kind==='stall'?{x:id+.5,y:1.12}:id;
  if(!dest||!this.nav.path(this.herman,dest)){this.say('No clear route. Choose another destination.');return false;}
  this.active=null;this.herman.path=[];this.herman.moving=false;this.batch=[];
  this.queue=[c,...(onward?[onward]:[])];this.pump();return !!this.active;
 }
 cancel(){this.queue=[];this.active=null;this.batch=[];this.herman.path=[];this.herman.moving=false;this.say('Route cleared. Your line is still with you.');}
 pump(){if(this.active||this.screen!=='play')return;while(this.queue.length){const c=this.queue.shift();let dest;
  if(c.kind==='pickup'){const e=this.employees.find(e=>e.id===c.id);if(!e||e.state!=='needing')continue;if(this.followers.length>=this.leadCap){this.say('Your line is full. Seat the team first.');continue;}dest=e;}
  else if(c.kind==='paper')dest={x:7.15,y:1.18};
  else if(c.kind==='stall'){const s=this.stalls.find(s=>s.i===c.id);if(!s)continue;if(s.occupant&&s.paper>0&&!this.herman.carrying){this.say('That stall is occupied.');continue;}if(s.paper>0&&!this.herman.carrying&&!this.followers.length){this.say('Pick up an employee first, or collect paper.');continue;}if(!s.paper&&!this.herman.carrying){const supply={x:7.15,y:1.18};if(!this.route(this.herman,supply)){this.say('No clear route to the supply shelf.');continue;}this.queue.unshift(c);this.active={kind:'paper'};this.say('Collecting paper for stall '+s.i+'.');return;}dest={x:s.i+.5,y:1.12};}
  else if(c.kind==='walk')dest=c.id;
  else continue;
  if(!this.route(this.herman,dest)){this.say('No clear route. Choose another destination.');continue;}this.active=c;this.emit('action',c);return;
 }}
 arrive(){const c=this.active;if(!c)return;this.active=null;
  if(c.kind==='pickup'){const e=this.employees.find(e=>e.id===c.id);if(e?.state==='needing'&&this.followers.length<this.leadCap){const line=this.followers;e.state='following';e.followId=line.length?line[line.length-1].id:'herman';e.followOrder=++this.lineSerial;e.followFresh=true;this.route(e,line.length?line[line.length-1]:this.herman);e.followClock=0;this.maxGroup=Math.max(this.maxGroup,this.followers.length);this.say(line.length?'You too, come on!':'Right this way!');this.emit('pickup',e);if(this.mode==='orientation'&&this.instruction===0){this.instruction=1;this.say('Nice. Tap a green stall to escort Jamie inside.');}}}
  else if(c.kind==='paper'){this.herman.carrying=true;this.say('Paper acquired. Tap a stall to refill it.');this.emit('paper');}
  else if(c.kind==='stall'){const s=this.stalls.find(s=>s.i===c.id);if(s){if(this.herman.carrying&&s.paper<this.paperMax){s.paper=this.paperMax;this.herman.carrying=false;this.restocked++;this.emit('restock');this.say('Stall '+s.i+' restocked.');if(!s.occupant&&this.followers.length)this.seat(s);if(this.mode==='orientation'&&this.instruction===3){this.instruction=4;this.employees[1].rest=1;this.say('Riley needs a break next. Pick up, then seat.');}}
   else if(!s.occupant&&s.paper&&this.followers.length){this.seat(s);if(this.upgrades.lead>=2){this.batch=this.stalls.filter(t=>t.i!==s.i&&!t.occupant&&t.paper&&Math.abs(t.i-s.i)<=2).map(t=>t.i);}}}}
  if(this.batch.length&&this.followers.length){this.queue.unshift({kind:'stall',id:this.batch.shift()});}else this.batch=[];
  this.pump();
 }
 seat(s){const e=this.followers[0];if(!e||s.occupant||!s.paper)return;const dest={x:s.i+.5,y:1.1};if(!this.route(e,dest)){this.say('That employee cannot reach this stall.');return;}s.occupant=e.id;e.state='entering';e.stall=s.i;e.followId=null;e.urgency=0;this.relink();}
 relink(){const line=this.followers;line.forEach((e,i)=>{const lead=i?line[i-1]:this.herman,newId=i?lead.id:'herman';if(e.followId!==newId){e.followId=newId;this.route(e,lead);e.followFresh=true;}});}
 follow(dt){
  for(const e of this.followers){
   const lead=e.followId==='herman'?this.herman:this.employees.find(v=>v.id===e.followId);
   if(!lead){e.moving=false;e.trace=[];continue;}
   if(e.followFresh)e.followFresh=false;
   else for(const p of lead.trace||[]){const last=e.path.at(-1)||e;if(Math.hypot(p.x-last.x,p.y-last.y)>.0001)e.path.push({x:p.x,y:p.y});}
   let distance=0,prev=e;for(const p of e.path){distance+=Math.hypot(p.x-prev.x,p.y-prev.y);prev=p;}
   const allowed=Math.max(0,distance-1.2);
   move(e,Math.min(dt,allowed/(this.speed*1.08)),this.speed*1.08);
  }
 }
 finish(e){const s=this.stalls.find(s=>s.i===e.stall);if(!s)return;s.occupant=null;this.gdp+=e.earned;this.breaks++;if(s.heated)this.heatedBreaks++;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);if(this.streak%3===0){this.streakBonus+=4;this.say('Smooth operation! +4 Facilities credits.');}else this.say(['Another break on the books.','Excellent work, team.','Your comfort is our core competency.'][this.breaks%3]);this.effects.push({x:s.i+.5,y:1,t:0,text:'+$'+e.earned.toFixed(2)});e.x=s.i+.5;e.y=1.1;e.state='returning';this.route(e,e.home);this.emit('finish',e);if(this.mode==='orientation'&&this.instruction===1){this.instruction=3;s.paper=0;this.say('The dispenser is empty. Tap Get paper, then this stall.');}if(this.mode==='orientation'&&this.breaks>=2&&this.restocked){this.end();}}
 complaint(e){e.state='returning';e.urgency=0;e.followId=null;this.route(e,e.home);this.relink();this.complaints++;this.streak=0;this.say(this.complaints===2?'Two complaints. One more closes the office.':e.name+' is telling HR.');this.emit('complaint',e);if(this.complaints>=3)this.end();}
 tick(dt){if(this.screen!=='play')return;dt=Math.min(.1,dt);this.clock+=dt;this.autosave+=dt;this.messageTime=Math.max(0,this.messageTime-dt);this.effects=this.effects.filter(f=>(f.t+=dt)<1.8);
  if(move(this.herman,dt,this.speed)&&this.active)this.arrive();this.pump();this.follow(dt);
  const hour=9+8*this.clock/this.duration;const lunch=hour>=12&&hour<13.5;const demand=this.event.demand*(lunch?(this.event.lunch||1.22):1);
  for(const e of this.employees){const stat=STATS[e.kind];
   if(e.state==='working'){e.rest-=dt*demand;if(e.rest<=0){e.state='needing';e.urgency=0;this.emit('need',e);}}
   else if(e.state==='needing'||e.state==='following'){
    if(this.mode!=='orientation')e.urgency+=dt/(stat.patience*(this.day<=2?1.3:1)*(this.event.patience||1))*(e.state==='following'&&this.upgrades.lead?0.5:1);

    if(e.urgency>=1)this.complaint(e);
   }else if(e.state==='entering'){if(move(e,dt,this.speed)){const s=this.stalls.find(s=>s.i===e.stall);e.state='inStall';s.paper=Math.max(0,s.paper-1);e.breakLeft=stat.breakTime*(s.heated?1.5:1);e.earned=0;this.emit('seat',e);}}
   else if(e.state==='inStall'){const s=this.stalls.find(s=>s.i===e.stall),elapsed=Math.min(dt,e.breakLeft);e.breakLeft-=elapsed;e.earned+=gdpRate(e.kind,s.heated)*elapsed;if(e.breakLeft<.00001)this.finish(e);}
   else if(e.state==='returning'){if(move(e,dt,3.25)){e.x=e.home.x;e.y=e.home.y;e.state='working';e.rest=stat.rest*(.85+rand(this)*.3);e.urgency=0;}}
   if(this.screen!=='play')break;
  }
  if(this.screen==='play'&&this.clock>=this.duration){if(this.mode==='orientation'){this.clock=this.duration-10;}else this.end();}
  if(this.autosave>2){this.autosave=0;this.persist();}
 }
 snapshot(){const keys=['layout','lineSerial','mode','day','dailyKey','rng','upgrades','event','duration','clock','gdp','breaks','complaints','heatedBreaks','streak','bestStreak','streakBonus','maxGroup','restocked','instruction','target','objective','herman','queue','active','stalls','employees','batch'];const s={};for(const k of keys)s[k]=copy(this[k]);return s;}
 persist(){if((this.mode==='career'||this.mode==='orientation')&&(this.screen==='play'||this.screen==='pause')){this.save.checkpoint=this.snapshot();}this.emit('save',this.save);}
 restore(){if(!this.save.checkpoint)return false;Object.assign(this,copy(this.save.checkpoint));if(this.save.checkpoint.layout!==LAYOUT){this.layout=LAYOUT;this.lineSerial=0;this.active=null;this.queue=[];this.batch=[];for(const a of [this.herman,...this.employees]){const i=this.nav.nearest(a);if(i>=0)Object.assign(a,this.nav.point(i));a.path=[];if(a.home){a.home={x:DESKS.find(d=>d.id===a.id)?.x||a.home.x,y:DESKS.find(d=>d.id===a.id)?.y||a.home.y};const j=this.nav.nearest(a.home);if(j>=0)a.home=this.nav.point(j);}if(a.state==='entering')this.route(a,{x:a.stall+.5,y:1.1});if(a.state==='returning')this.route(a,a.home);if(a.state==='working'||a.state==='needing')Object.assign(a,a.home);if(a.state==='following'){a.followOrder=++this.lineSerial;a.followId=null;}}this.relink();}this.effects=[];this.messageTime=0;this.autosave=0;this.screen='pause';return true;}
 pause(){if(this.screen==='play'){this.screen='pause';this.persist();}}
 end(){if(this.screen!=='play')return;this.screen='report';const stars=starsFor(this);let award=awardFor(this),credited=0;
  if(this.mode==='orientation'){this.save.tutorialDone=true;award=12;credited=Math.max(0,award-(this.save.awards.orientation||0));this.save.awards.orientation=award;this.save.budget+=credited;}
  else if(this.mode==='career'){const key=String(this.day),old=this.save.records[key];credited=Math.max(0,award-(this.save.awards[key]||0));this.save.awards[key]=Math.max(award,this.save.awards[key]||0);this.save.budget+=credited;this.save.records[key]={gdp:Math.max(this.gdp,old?.gdp||0),stars:Math.max(stars,old?.stars||0)};this.save.day=Math.max(this.save.day,this.day+1);this.save.tutorialDone=true;}
  else{const old=this.save.daily[this.dailyKey];this.save.daily[this.dailyKey]={gdp:Math.max(this.gdp,old?.gdp||0),stars:Math.max(stars,old?.stars||0)};}
  this.report={day:this.day,mode:this.mode,gdp:this.gdp,breaks:this.breaks,complaints:this.complaints,stars,award,credited,goal:this.goalMet,streak:this.bestStreak,early:this.complaints>=3};
  if(this.mode!=='daily'){this.save.checkpoint=null;this.save.lastReport=copy(this.report);}this.emit('save',this.save);this.emit('end',this.report);
 }
 next(){if(this.mode==='orientation'){this.loadDay('career',1);}else if(this.mode==='daily'){this.loadDay('daily',7);}else{this.save.day=Math.max(this.save.day,this.day+1);this.loadDay('career',this.day+1);}this.save.lastReport=null;this.emit('save',this.save);}
 buy(id){if(this.mode==='daily')return false;const item=UPGRADES.find(u=>u.id===id);if(!item)return false;const lvl=this.save.upgrades[id],price=item.prices[lvl];if(price===undefined||this.save.budget<price||this.save.day<item.day)return false;this.save.budget-=price;this.save.upgrades[id]++;this.emit('save',this.save);return true;}
}
const API={VERSION,SAVE_KEY,STATS,DESKS,EVENTS,UPGRADES,defaults,cleanSave,Store,Nav,Game,copy,dateKey,seedOf,heatPreview,gdpRate,awardFor,starsFor};if(typeof module!=='undefined')module.exports=API;else root.LMCore=API;
})(typeof window!=='undefined'?window:globalThis);
