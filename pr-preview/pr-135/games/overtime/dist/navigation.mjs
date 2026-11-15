// Visibility graph around inflated furniture corners. Used only by the single boss.
import {resolveFurniture} from './scene.mjs';
export function clearSegment(a,b,obstacles,r=30){
 for(const o of obstacles){let lo=0,hi=1;for(const [v,d,min,max] of [[a.x,b.x-a.x,o.x-r,o.x+o.w+r],[a.y,b.y-a.y,o.y-r,o.y+o.h+r]]){if(Math.abs(d)<1e-9){if(v<min||v>max){lo=2;break;}}else{let t1=(min-v)/d,t2=(max-v)/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);}}if(lo<=hi&&lo<=1&&hi>=0)return false;}
 return true;
}
export function bossPath(start,target,obstacles,r=30){
 let goal={x:target.x,y:target.y};for(let i=0;i<3;i++)resolveFurniture(goal,r+2,obstacles);
 if(clearSegment(start,goal,obstacles,r))return [goal];
 const nodes=[{x:start.x,y:start.y},goal];
 for(const o of obstacles)for(const x of [o.x-r-8,o.x+o.w+r+8])for(const y of [o.y-r-8,o.y+o.h+r+8])if(x>=65&&x<=1735&&y>=65&&y<=1735&&clearSegment({x,y},{x,y},obstacles,r))nodes.push({x,y});
 const costs=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),done=new Set();costs[0]=0;
 for(let k=0;k<nodes.length;k++){let u=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(u<0||costs[i]<costs[u]))u=i;if(u<0||!Number.isFinite(costs[u]))break;if(u===1){const route=[];for(let v=1;v!==0;v=prev[v])route.unshift(nodes[v]);return route;}done.add(u);for(let v=0;v<nodes.length;v++)if(!done.has(v)&&clearSegment(nodes[u],nodes[v],obstacles,r)){let next=costs[u]+Math.hypot(nodes[v].x-nodes[u].x,nodes[v].y-nodes[u].y);if(next<costs[v]){costs[v]=next;prev[v]=u;}}}
 return [];
}
