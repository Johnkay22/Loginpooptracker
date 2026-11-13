export const DESKS=[{x:600,y:620,w:160,h:80},{x:1040,y:620,w:160,h:80},{x:600,y:1100,w:160,h:80},{x:1040,y:1100,w:160,h:80}];
export const LOBBY_FURNITURE=[{x:470,y:580,w:260,h:110},{x:470,y:1110,w:260,h:110},{x:1080,y:570,w:85,h:180},{x:1255,y:570,w:85,h:180},{x:1080,y:1050,w:85,h:180},{x:1255,y:1050,w:85,h:180}];
export const furnitureFor=id=>id===2?LOBBY_FURNITURE:DESKS;
export function resolveFurniture(p,r=17,obstacles=DESKS){for(let o of obstacles){let nx=Math.max(o.x,Math.min(o.x+o.w,p.x)),ny=Math.max(o.y,Math.min(o.y+o.h,p.y));let dx=p.x-nx,dy=p.y-ny,d=Math.hypot(dx,dy);if(d>0&&d<r){p.x=nx+dx/d*r;p.y=ny+dy/d*r;}else if(d===0){let edges=[{d:p.x-o.x,x:o.x-r,y:p.y},{d:o.x+o.w-p.x,x:o.x+o.w+r,y:p.y},{d:p.y-o.y,x:p.x,y:o.y-r},{d:o.y+o.h-p.y,x:p.x,y:o.y+o.h+r}].sort((a,b)=>a.d-b.d);p.x=edges[0].x;p.y=edges[0].y;}}}
// The stage art is cached once. Image branding is drawn from the supplied logo
// and official Herman sprite, while all navigable furniture matches collisions.
function painter(c,assets){
 const box=(x,y,w,h,color,r=0)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
 const line=(x,y,a,b,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.stroke();};
 const ellipse=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
 const label=(s,x,y,size,color)=>{c.font=`800 ${size}px Arial`;c.textAlign='center';c.fillStyle=color;c.fillText(s,x,y);};
 const grad=(x,y,a,b,colors)=>{const g=c.createLinearGradient(x,y,a,b);colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));return g;};
 const mascot=(x,y,w,h,alpha=1)=>{let img=assets.herman;if(!img?.naturalWidth)return;c.save();c.globalAlpha=alpha;c.beginPath();c.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);c.clip();box(x,y,w,h,'#07162e');let ratio=Math.min(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*ratio,ih=img.naturalHeight*ratio;c.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);c.restore();};
 const plaque=(x,y,w,h,light=false)=>{box(x+5,y+9,w,h,'#0004',8);box(x,y,w,h,light?'#c1a26b':'#728286',8);box(x+3,y+3,w-6,h-6,'#0b1a32',6);mascot(x+w/2-(h-8)/2,y+4,h-8,h-8);};
 const plant=(x,y,r=27)=>{ellipse(x+10,y+14,r+8,r*.65,'#0003');ellipse(x,y,r*.72,r*.7,'#b4a893');ellipse(x,y-3,r*.64,r*.6,'#5a4a3b');for(let i=0;i<9;i++){let a=i*2.4;c.save();c.translate(x+Math.cos(a)*r*.35,y+Math.sin(a)*r*.32-7);c.rotate(a);ellipse(0,-r*.35,r*.32,r*.85,i%2?'#45785b':'#285844');line(0,0,0,-r,'#86a27266',1);c.restore();}ellipse(x-5,y-10,8,10,'#729a65');};
 const frame=(x,y,w,h)=>{box(x+7,y+9,w,h,'#0003',4);box(x,y,w,h,'#baa16c',3);box(x+5,y+5,w-10,h-10,'#0a2236',2);mascot(x+9,y+10,w-18,h-20);};
 const border=()=>{box(0,0,1800,28,'#17252f');box(0,1772,1800,28,'#17252f');box(0,0,28,1800,'#17252f');box(1772,0,28,1800,'#17252f');line(32,32,1768,32,'#d5b777',3);line(32,1768,1768,1768,'#d5b777',3);};
 return{box,line,ellipse,label,grad,mascot,plaque,plant,frame,border};
}
export function paintOffice(c,assets={}){
 const {box,line,ellipse,label,grad,mascot,plaque,plant,frame,border}=painter(c,assets);
 box(0,0,1800,1800,'#405365');
 // Woven blue carpet, soft speckle and alternating tile direction.
 for(let y=30;y<1770;y+=60)for(let x=30;x<1770;x+=60){let alt=((x+y)/60)%2;box(x,y,59,59,alt?'#4c6072':'#465b6c');for(let i=0;i<8;i++){let d=i*7;line(x+4,y+d+3,x+54,y+d+3,alt?'#70808a12':'#0d2a3518');}box(x+13,y+20,1,1,'#dce5dd55');}
 // Cream circulation paths distinguish the ordinary office from the marble lobby.
 for(let y of [400,900,1400]){box(30,y-64,1740,128,'#9c9a86');line(30,y-63,1770,y-63,'#d0c9a6',3);line(30,y+63,1770,y+63,'#716f61',3);for(let x=40;x<1760;x+=90)line(x,y-60,x,y+60,'#66695833');}
 box(755,310,290,1180,'#253f55',5);line(762,310,762,1490,'#8198a877',2);line(1038,310,1038,1490,'#8198a877',2);
 // Actual brand imagery on a printed mat, in sight of the player's start.
 box(790,750,220,98,'#172f45',12);box(796,756,208,86,'#0b2035',8);mascot(858,758,84,84,.35);
 function workstation(o){let{x,y,w,h}=o;
  box(x+9,y+15,w,h,'#07172570',7);box(x,y,w,h,'#3c3028',6);
  box(x,y-6,w,h,grad(x,y,x,y+h,['#c6a175','#a57f56']),6);line(x+5,y-3,x+w-5,y-3,'#ead0a0',2);
  for(let i=0;i<6;i++)line(x+5,y+i*12,x+w-5,y+i*12,'#7f56301b');
  // Slim upholstered cubicle partition stays inside the existing footprint.
  box(x-1,y-16,w+2,12,'#20384a',3);box(x+3,y-14,w-6,5,'#7795a8',2);
  box(x+53,y+5,64,30,'#10202d',3);box(x+57,y+8,56,23,grad(0,y,0,y+30,['#3c95aa','#214959']),2);
  for(let i=0;i<3;i++)line(x+63,y+13+i*5,x+91+i*5,y+13+i*5,'#97d5d666');
  box(x+78,y+35,13,5,'#29313a',2);box(x+54,y+47,58,15,'#b7c6c5',3);for(let i=0;i<7;i++)line(x+59+i*7,y+49,x+59+i*7,y+58,'#637681');
  box(x+11,y+24,25,35,'#f1e8d0',1);mascot(x+12,y+24,23,23);line(x+15,y+31,x+31,y+31,'#5d7f8b');line(x+15,y+38,x+29,y+38,'#9fa392');
  ellipse(x+w-24,y+43,10,9,'#284c61');ellipse(x+w-24,y+40,8,7,'#ebd4a5');ellipse(x+w-24,y+40,5,4,'#5e3b24');
  box(x+56,y+h+12,46,14,'#0004',8);box(x+56,y+h+7,46,16,'#58717d',7);
 }
 for(const o of DESKS)workstation(o);
 for(let x of [165,400,1240,1480])for(let y of [120,1560])workstation({x,y,w:160,h:80});
 // Boardroom wood flooring and an oval walnut table.
 box(650,45,510,230,'#74604a',7);for(let y=50;y<270;y+=17){line(655,y,1155,y,'#b5a08033');line(850,y,850,y+17,'#483c2a22');}
 box(702,93,410,120,'#0004',50);box(692,83,410,120,grad(692,83,1102,203,['#a88457','#684f36']),48);line(735,145,1060,145,'#d0ac7066',2);
 for(let x=730;x<1100;x+=85){box(x,53,44,25,'#273a45',8);box(x,212,44,25,'#273a45',8);box(x+8,107,27,35,'#e1dccb',2);}
 plaque(790,225,215,60);label('THE DAILY GRIND',900,310,16,'#d5d7c7');
 // Break-room kitchenette, framed character posters and coffee machine.
 box(730,1585,340,120,'#0003',7);box(720,1575,340,115,'#a39270',7);box(720,1575,340,25,'#d0c5a6',5);
 for(let x=725;x<1050;x+=83){box(x,1605,77,78,'#7f7056',2);line(x+52,1615,x+67,1615,'#c8bc9a',3);}
 box(748,1530,63,61,'#1a2f3b',6);box(756,1540,47,24,'#9eadad',3);ellipse(780,1578,12,7,'#ded3b6');
 label('BREAK ROOM',900,1535,15,'#d7d7b9');
 for(let x of [84,1602])for(let y of [600,1080])frame(x,y,110,140);
 for(let y of [320,740,1220,1480]){plant(105,y,24);plant(1680,y,24);}
 // Paper trails, floor sockets and windows enrich the space without new collisions.
 for(let i=0;i<25;i++){let x=240+(i*193)%1300,y=330+(i*347)%1190;if(x>750&&x<1050)continue;c.save();c.translate(x,y);c.rotate(i*.73);box(-7,-9,14,18,'#dfddc782',1);line(-4,-4,4,-4,'#627981');line(-4,1,3,1,'#627981');c.restore();}
 for(let y=170;y<1650;y+=270){box(13,y,20,170,'#102a3b',2);box(18,y+5,12,160,'#aad1db',2);box(34,y,160,170,grad(34,0,194,0,['#d6e9d824','#d6e9d800']));line(18,y+85,30,y+85,'#2a4e61',5);}
 // A large mascot welcome board decorates the far wall.
 frame(1630,812,115,156);border();
}
export function paintLobby(c,assets={}){
 const{box,line,ellipse,label,grad,mascot,plaque,plant,frame,border}=painter(c,assets);
 box(0,0,1800,1800,'#c2c3b8');
 // Bright large marble slabs with restrained veins, brass joints and reflections.
 for(let y=30;y<1770;y+=160)for(let x=30;x<1770;x+=160){let alt=((x+y-60)/160)%2;box(x,y,158,158,alt?'#ccd0c5':'#d8d8ca');c.save();c.beginPath();c.rect(x,y,158,158);c.clip();for(let i=0;i<3;i++){let off=i*45+(x+y)%53;c.strokeStyle=i%2?'#ffffff30':'#6e8e8b24';c.lineWidth=i+1;c.beginPath();c.moveTo(x-15,y+off);c.bezierCurveTo(x+43,y+off+12,x+66,y+off-14,x+175,y+off+67);c.stroke();}c.restore();}
 for(let x of [110,1690]){box(x,40,9,1720,'#8c784d');box(x+3,40,2,1720,'#ecda9f');}
 for(let y of [320,1480]){box(40,y,1720,9,'#9a885e');box(40,y+3,1720,2,'#f1e0ad');}
 // Inlaid black-stone central medallion: visually unlike the office's carpet.
 ellipse(900,900,225,225,'#a79263');ellipse(900,900,217,217,'#193544');ellipse(900,900,199,199,'#274553');
 c.strokeStyle='#d0b67788';c.lineWidth=2;c.beginPath();c.arc(900,900,185,0,Math.PI*2);c.stroke();
 for(let i=0;i<16;i++){let a=i*Math.PI/8;line(900+Math.cos(a)*205,900+Math.sin(a)*205,900+Math.cos(a)*215,900+Math.sin(a)*215,'#f3d896',3);}
 // Brand images appear as a floor medallion and nearby reception signage.
 mascot(780,780,240,240,.3);
 // Reception islands are dark walnut with brass fronts and polished ivory tops.
 for(const o of LOBBY_FURNITURE){let{x,y,w,h}=o;box(x+12,y+17,w,h,'#1829384d',10);
  if(w>100){box(x,y,w,h,grad(x,y,x,y+h,['#74593e','#342c26']),12);for(let i=10;i<w-10;i+=12)line(x+i,y+20,x+i,y+h-5,'#b5935a66',2);box(x,y-7,w,h-28,grad(x,y,x+w,y+65,['#efead7','#aaa99b']),11);line(x+7,y-4,x+w-7,y-4,'#fffbed',3);box(x+55,y+8,78,32,'#122632',3);box(x+60,y+12,68,23,'#426d7b',2);mascot(x+83,y+12,24,24);box(x+180,y+12,30,35,'#faf0d6',2);mascot(x+w/2-10,y+h-25,20,20);}
  else{box(x,y,w,h,grad(x,y,x+w,y,['#3c525a','#afbab6','#38525b']),9);box(x+9,y+9,w-18,h-18,'#193b47',6);box(x+16,y+15,w-32,35,'#0c242e',3);ellipse(x+w/2,y+30,5,5,'#81e0c0');line(x+12,y+80,x+w-12,y+80,'#e5dfbf',5);line(x+w/2,y+60,x+w/2,y+103,'#eee8d2',5);line(x+8,y+9,x+8,y+h-10,'#f0da9c',2);}
 }
 // Three visible elevator banks at the far end, bronze frames and steel doors.
 for(let x of [600,830,1060]){box(x+5,55,165,175,'#0004',5);box(x,48,165,175,'#756443',5);box(x+7,55,151,161,grad(x,0,x+165,0,['#334755','#96a5a6','#425866']));line(x+82,55,x+82,216,'#132731',3);box(x+46,27,72,19,'#1a2f3b',3);label('↑  '+(12+(x-600)/230),x+82,41,12,'#edcd88');line(x+8,214,x+157,214,'#ffdf93',3);}
 plaque(760,250,280,70,true);
 // Plush lounge seating against the perimeter, with planters framing open lanes.
 for(let x of [240,520,1140,1420])for(let y of [165,1570]){box(x+9,y+10,160,65,'#122c3933',12);box(x,y,160,65,'#4c3b2d',12);box(x+5,y+4,150,46,grad(0,y,0,y+45,['#c09a65','#916d47']),9);for(let i=1;i<3;i++)line(x+i*53,y+9,x+i*53,y+45,'#6c5138',2);box(x+4,y+8,12,49,'#76583c',5);box(x+144,y+8,12,49,'#76583c',5);}
 for(let y of [490,780,1120,1360]){plant(200,y,37);plant(1595,y,37);}
 frame(95,860,110,145);frame(1600,860,110,145);
 // Glass frontage and angled soft daylight, rendered below all actors.
 for(let y=390;y<1440;y+=210){box(21,y,18,170,'#20434c');box(25,y+3,10,164,'#d3edf0');line(25,y+85,35,y+85,'#647d81',4);c.fillStyle='#f5f3d828';c.beginPath();c.moveTo(40,y);c.lineTo(320,y+90);c.lineTo(320,y+240);c.lineTo(40,y+160);c.fill();}
 label('RECEPTION',600,735,12,'#6c6249');label('SECURITY',1210,795,12,'#6c6249');
 // Architectural lighting around a broad, unobstructed entrance.
 box(730,1600,340,130,'#1d3d49',8);for(let x=738;x<1070;x+=83){box(x,1606,75,117,'#658c92',3);line(x+37,1610,x+37,1720,'#c6d8cb',2);}mascot(860,1508,80,80);border();
}
