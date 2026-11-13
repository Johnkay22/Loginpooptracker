import {paintOffice,DESKS,resolveFurniture} from './scene.mjs';

// A crop of the real Office Floor, including its two upper desks and central aisle.
export const PRACTICE_VIEW={x:570,y:550,w:660,h:412.5};
export const PRACTICE_SIZE={w:480,h:300};
const ratio=PRACTICE_SIZE.w/PRACTICE_VIEW.w;
export const PRACTICE_DESKS=DESKS.filter(o=>o.y<PRACTICE_VIEW.y+PRACTICE_VIEW.h).map(o=>({
 x:(o.x-PRACTICE_VIEW.x)*ratio,y:(o.y-PRACTICE_VIEW.y)*ratio,w:o.w*ratio,h:o.h*ratio,
}));
export function resolvePracticeFurniture(player){resolveFurniture(player,12,PRACTICE_DESKS);}
export function paintPracticeFloor(canvas,portrait){
 const ctx=canvas.getContext('2d');
 canvas.width=960;canvas.height=600;
 ctx.setTransform(canvas.width/PRACTICE_VIEW.w,0,0,canvas.height/PRACTICE_VIEW.h,0,0);
 ctx.translate(-PRACTICE_VIEW.x,-PRACTICE_VIEW.y);
 paintOffice(ctx,{herman:portrait});
}
