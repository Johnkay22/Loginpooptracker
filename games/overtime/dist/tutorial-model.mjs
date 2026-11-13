import {resolvePracticeFurniture} from './tutorial-scene.mjs';
// A deliberately isolated practice room: no Game instance, saves, rewards or audio.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class Practice {
 constructor(step=0){
  this.step=step;this.x=step===1?120:240;this.y=140;this.distance=0;this.complete=false;
  this.cash=0;this.choice=null;this.hp=60;this.bomb=null;this.cooldown=0;
  this.warning=null;this.result='';this.coins=[{x:210,y:140,value:2},{x:290,y:140,value:2},{x:360,y:145,value:1}];
 }
 move(dx,dy,dt){
  if(![0,1,2,4].includes(this.step)||this.choice)return;
  const length=Math.max(1,Math.hypot(dx,dy)),oldX=this.x,oldY=this.y;
  this.x=clamp(this.x+dx/length*145*dt,28,452);this.y=clamp(this.y+dy/length*145*dt,24,272);
  resolvePracticeFurniture(this);
  this.distance+=Math.hypot(this.x-oldX,this.y-oldY);
  if(this.step===0&&this.distance>=70)this.complete=true;
  if(this.step===1){this.coins=this.coins.filter(c=>{if(Math.hypot(c.x-this.x,c.y-this.y)<36){this.cash+=c.value;return false;}return true;});}
 }
 choose(key){if(this.step!==1||this.cash<5||this.choice||!['plunger','speed'].includes(key))return false;this.choice=key;this.complete=true;return true;}
 deploy(){if(this.step!==2||this.cooldown>0)return false;this.bomb={x:this.x-25,y:this.y,left:3};this.cooldown=12;this.result='lure';return true;}
 heal(kind){if(this.step!==3||this.complete)return;if(kind==='kit'){this.hp=76;this.complete=true;this.result='healed';}else this.result='coffee';}
 attack(){if(this.step!==4||this.warning)return false;this.warning={x:this.x,y:this.y,left:1.1};this.result='warning';this.complete=false;return true;}
 tick(dt){
  this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.bomb){this.bomb.left-=dt;if(this.bomb.left<=0){this.bomb=null;this.result='blast';this.complete=true;}}
  if(this.warning){this.warning.left-=dt;if(this.warning.left<=0){this.complete=Math.hypot(this.x-this.warning.x,this.y-this.warning.y)>65;this.result=this.complete?'dodged':'hit';this.warning=null;}}
 }
}
