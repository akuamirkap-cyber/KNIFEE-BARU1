/**
 * Original, resolution-independent target art. All targets share a true circular
 * collision rim, but their interiors are individually drawn — not recoloured
 * copies of the same wheel. Works on a browser canvas and on Skia in proof.ts.
 */
import { TAU } from '../config';
import type { TargetKind } from '../levels';
import { circle, label, line, noise, poly, radial, ring, star } from './primitives';

export const TARGET_TINT: Record<TargetKind, string> = {
  orange: '#ffb65c', wood: '#d49c68', watermelon: '#ff6c89', lime: '#b5ed77', lemon: '#ffe381',
  apple: '#ff8290', durian: '#d5d57d', kiwi: '#b8e88b', pineapple: '#ffc865', coconut: '#e1c8a0',
  soccer: '#e2e9ef', basketball: '#ffa462', tennis: '#d8ed7c', baseball: '#f8e9d9', bowling: '#b79aea',
  dartboard: '#f0c79e', carrom: '#ebc08b', casino: '#e8bd65', eightball: '#c1cbd7', target: '#ff838e',
  moon: '#c6d5e5', mars: '#e4a384', jupiter: '#e4bf97', pluto: '#b4e2ee', ufo: '#8bf5dc',
  disco: '#b6b9ff', peppermint: '#ffb2b9', friedegg: '#ffe38b', pearl: '#d6dcff', boss: '#c49aff',
};

/** Draw centred on (0, 0), with a radius supplied by the caller. */
export function drawTarget(c: CanvasRenderingContext2D, kind: TargetKind, radius = 112, level = 1): void {
  c.save(); c.scale(radius / 100, radius / 100);
  // A dark edge is the physical rim. The interior is clipped to it.
  circle(c, 0, 3, 101, '#050b16');
  circle(c, 0, 0, 100, TARGET_TINT[kind]);
  c.save(); circle(c, 0, 0, 99); c.clip();
  switch (kind) {
    case 'orange': citrus(c, '#c75a1a', '#ffc65b', '#ff921d', '#ffdf93', 10); break;
    case 'lime': citrus(c, '#3e7e36', '#ccec90', '#8fcb45', '#e5f7b4', 9); break;
    case 'lemon': citrus(c, '#be9b2d', '#fff099', '#f1d04a', '#fff6c1', 8); break;
    case 'wood': wood(c); break;
    case 'watermelon': watermelon(c); break;
    case 'apple': apple(c); break;
    case 'durian': durian(c); break;
    case 'kiwi': kiwi(c); break;
    case 'pineapple': pineapple(c); break;
    case 'coconut': coconut(c); break;
    case 'soccer': soccer(c); break;
    case 'basketball': basketball(c); break;
    case 'tennis': tennis(c); break;
    case 'baseball': baseball(c); break;
    case 'bowling': bowling(c); break;
    case 'carrom': carrom(c); break;
    case 'casino': casino(c); break;
    case 'eightball': eightball(c); break;
    case 'dartboard': dartboard(c); break;
    case 'target': bullseye(c); break;
    case 'moon': planet(c, '#aabbd0', '#687c98', false); break;
    case 'mars': planet(c, '#ce8869', '#934f3d', true); break;
    case 'pluto': planet(c, '#b2d5e2', '#799caf', false); pluto(c); break;
    case 'jupiter': jupiter(c); break;
    case 'ufo': ufo(c); break;
    case 'disco': disco(c); break;
    case 'peppermint': peppermint(c); break;
    case 'friedegg': friedegg(c); break;
    case 'pearl': pearl(c); break;
    case 'boss': boss(c, level); break;
  }
  // Shared edge lighting, not a material replacement: the art underneath stays
  // recognisable, and a bevel makes the disc read at phone size.
  const shade = c.createLinearGradient(-70, -100, 80, 100);
  shade.addColorStop(0, 'rgba(255,255,255,.20)'); shade.addColorStop(.35, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,0,.28)');
  circle(c, 0, 0, 100, shade);
  c.restore();
  ring(c, 98.5, 'rgba(255,255,255,.25)', 2.5);
  ring(c, 100, '#07111e', 2);
  c.restore();
}

function citrus(c: CanvasRenderingContext2D, rind: string, pulp: string, dark: string, pith: string, segments: number): void {
  circle(c, 0, 0, 100, rind); circle(c, 0, 0, 92, pith); circle(c, 0, 0, 86, pulp);
  for (let i = 0; i < segments; i++) {
    const a = i * TAU / segments;
    c.save(); c.rotate(a);
    c.beginPath(); c.moveTo(4, 3); c.arc(0, 0, 83, .032, TAU / segments - .032); c.closePath();
    c.fillStyle = i % 2 ? pulp : dark; c.fill(); c.strokeStyle = pith; c.lineWidth = 2.4; c.stroke();
    for (let j = 0; j < 7; j++) {
      const ra = .13 + noise(i * 13 + j) * (TAU / segments - .2), rr = 22 + noise(i * 17 + j) * 52;
      c.save(); c.translate(Math.cos(ra) * rr, Math.sin(ra) * rr); c.rotate(ra);
      c.fillStyle = 'rgba(255,255,220,.24)'; c.beginPath(); c.ellipse(0, 0, 6, 1.4, 0, 0, TAU); c.fill(); c.restore();
    }
    if (i % 3 === 1) {
      c.fillStyle = pith; c.beginPath(); c.ellipse(34, 12, 6, 2.7, .4, 0, TAU); c.fill();
    }
    c.restore();
  }
  circle(c, 0, 0, 8, pith);
  for (let i = 0; i < 60; i++) {
    const a = i * TAU / 60;
    circle(c, Math.cos(a) * 96, Math.sin(a) * 96, .8, 'rgba(255,230,174,.5)');
  }
}

function wood(c: CanvasRenderingContext2D): void {
  circle(c, 0, 0, 100, '#573b29'); circle(c, 0, 0, 90, '#d8a56c');
  for (let i = 0; i < 14; i++) {
    c.beginPath();
    for (let j = 0; j <= 100; j++) {
      const a = j * TAU / 100, r = 9 + i * 5.6 + Math.sin(a * 4 + i * .7) * 1.8;
      const x = Math.cos(a) * r + 5, y = Math.sin(a) * r - 3;
      if (!j) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.strokeStyle = i % 3 === 0 ? '#a76c3e' : 'rgba(124,75,38,.35)'; c.lineWidth = i % 3 === 0 ? 1.8 : .9; c.stroke();
  }
  for (let i = 0; i < 26; i++) {
    c.save(); c.rotate(i * TAU / 26);
    line(c, 88, -2, 99, -3, i % 2 ? '#3d291f' : '#a67343', 3); c.restore();
  }
  c.strokeStyle = '#9b623b'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-65, -56); c.lineTo(-40, -25); c.lineTo(-47, -5); c.stroke();
  c.beginPath(); c.moveTo(68, 60); c.lineTo(43, 35); c.lineTo(48, 24); c.stroke();
  c.save(); c.translate(25, -30); c.scale(1, .55); ring(c, 10, '#a16c43', 2); ring(c, 5, '#a16c43', 1.5); c.restore();
}

function watermelon(c: CanvasRenderingContext2D): void {
  circle(c, 0, 0, 100, '#266f50');
  for (let i = 0; i < 22; i++) { c.save(); c.rotate(i * TAU / 22); poly(c, [[-4,-100],[3,-100],[0,-84],[-4,-87]], '#75b868'); c.restore(); }
  circle(c, 0, 0, 88, '#dbefaa'); circle(c, 0, 0, 81, '#ff6577'); circle(c, 0, 0, 73, '#fa5369');
  for (let i = 0; i < 20; i++) {
    const a = i * 2.4, r = 25 + noise(i) * 42;
    c.save(); c.translate(Math.cos(a)*r, Math.sin(a)*r); c.rotate(a - Math.PI/2);
    c.fillStyle = '#452b32'; c.beginPath(); c.ellipse(0,0,2.6,5.5,0,0,TAU); c.fill();
    line(c, -.5, -3, -.5, 0, '#97635a', .7); c.restore();
  }
}
function apple(c: CanvasRenderingContext2D): void {
  circle(c, 0, 0, 100, '#be3e52'); circle(c, 0, 0, 91, '#fbd6a5'); circle(c, 0, 0, 84, '#ffe6bb');
  for (let i=0; i<5; i++) { c.save(); c.rotate(i*TAU/5); c.fillStyle='#f2c68e'; c.beginPath(); c.ellipse(0,-23,14,30,0,0,TAU); c.fill(); c.fillStyle='#6f4535'; c.beginPath(); c.ellipse(0,-27,3.5,7,.25,0,TAU); c.fill(); c.restore(); }
  circle(c,0,0,6,'#fff1c9');
  for(let i=0;i<34;i++){const a=i*2.4,r=60+noise(i)*22;circle(c,Math.cos(a)*r,Math.sin(a)*r,.8,'#e7bf91');}
}
function durian(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#777844');
  for(let i=0;i<65;i++){const a=i*2.4,r=Math.sqrt((i+.5)/65)*96;c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r);c.rotate(a);poly(c,[[-9,7],[0,-10],[10,7]],i%2?'#adb267':'#909856','#5c693b',.8);c.restore();}
  for(let i=0;i<3;i++){c.save();c.rotate(i*TAU/3);c.fillStyle='#f1dfa0';c.beginPath();c.ellipse(0,-32,20,38,0,0,TAU);c.fill();line(c,-5,-49,-5,-17,'#d8bc76',2);c.restore();}
}
function kiwi(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#8f6545');circle(c,0,0,91,'#cee98e');circle(c,0,0,83,'#8ec94f');
  for(let i=0;i<48;i++){const a=i*TAU/48;c.save();c.rotate(a);line(c,0,18,0,83,'rgba(222,255,148,.6)',i%3?1:2);c.restore();}
  c.fillStyle='#edf2bf';c.beginPath();c.ellipse(0,0,18,25,0,0,TAU);c.fill();
  for(let i=0;i<35;i++){const a=i*TAU/35,r=34+noise(i)*15;c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r);c.rotate(a);c.fillStyle='#29392b';c.beginPath();c.ellipse(0,0,3.5,1.7,0,0,TAU);c.fill();c.restore();}
}
function pineapple(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#8a8c40');circle(c,0,0,92,'#e5ad43');
  for(let y=-100;y<110;y+=25)for(let x=-100;x<110;x+=28){const xx=x+(Math.round(y/25)%2)*14;poly(c,[[xx,y-16],[xx+14,y],[xx,y+16],[xx-14,y]],'#e7b64e','#aa7b30',1.5);poly(c,[[xx-6,y+3],[xx,y-5],[xx+6,y+3]],'#b9852d');circle(c,xx-3,y-7,1.5,'#ffe493');}
  ring(c,90,'#e1c66a',3);
}
function coconut(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#714c35');
  for(let i=0;i<70;i++){const a=i*2.4,r=88+noise(i)*9;c.save();c.rotate(a);line(c,r,-2,r+6,2,'#b48a5c',1);c.restore();}
  circle(c,0,0,84,'#f6edce');circle(c,0,0,56,radial(c,-15,-20,74,[[0,'#54402e'],[1,'#9e7754']]));ring(c,59,'#ddd2b4',5);ring(c,84,'#d8c39b',2);
}

function soccer(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#e3e8e4');
  const pent=(x:number,y:number,r:number,rot=0)=>{const pts:[number,number][]=[];for(let i=0;i<5;i++){const a=i*TAU/5-Math.PI/2+rot;pts.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}poly(c,pts,'#243342','#10202b',2);};
  pent(0,0,29);
  for(let i=0;i<5;i++){const a=i*TAU/5-Math.PI/2;const x=Math.cos(a)*84,y=Math.sin(a)*84;pent(x,y,27,a);line(c,Math.cos(a)*29,Math.sin(a)*29,Math.cos(a)*59,Math.sin(a)*59,'#8c9c9c',1.4);const b=a+TAU/10;line(c,Math.cos(b)*46,Math.sin(b)*46,Math.cos(b)*104,Math.sin(b)*104,'#8c9c9c',1.4);}
}
function basketball(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#d57638');
  for(let i=0;i<300;i++){const a=i*2.4,r=Math.sqrt((i+.5)/300)*99;circle(c,Math.cos(a)*r,Math.sin(a)*r,.75,'rgba(91,47,28,.23)');}
  line(c,-102,0,102,0,'#3e2a23',3.7);line(c,0,-102,0,102,'#3e2a23',3.7);
  c.strokeStyle='#3e2a23';c.lineWidth=3.7;
  for(const sign of [-1,1]){c.beginPath();c.moveTo(sign*70,-86);c.bezierCurveTo(sign*14,-42,sign*14,42,sign*70,86);c.stroke();}
  ring(c,94,'rgba(255,206,141,.28)',1);
}
function tennis(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#bdcf62');
  for(let i=0;i<220;i++){const a=i*2.4,r=Math.sqrt((i+.5)/220)*98;circle(c,Math.cos(a)*r,Math.sin(a)*r,1.2,'rgba(240,248,160,.2)');}
  c.strokeStyle='#e9edc0';c.lineWidth=8;
  for(const s of [-1,1]){c.beginPath();c.moveTo(s*66,-84);c.bezierCurveTo(-s*4,-48,-s*4,48,s*66,84);c.stroke();}
}
function baseball(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#e5ddc7');
  for(const s of [-1,1]){
    c.strokeStyle='#ba6a62';c.lineWidth=2;c.beginPath();c.moveTo(s*70,-82);c.bezierCurveTo(s*32,-35,s*32,35,s*70,82);c.stroke();
    for(let i=0;i<15;i++){const y=-74+i*10.5,x=s*(42+Math.pow(y/80,2)*24);line(c,x-5,y-3,x+5,y+3,'#ae4c4b',2);}
  }
}
function bowling(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,radial(c,-38,-40,147,[[0,'#8a78b6'],[.45,'#4b4375'],[1,'#1c233e']]));
  for(let i=0;i<8;i++){c.save();c.rotate(i*.6);c.strokeStyle='rgba(197,177,242,.17)';c.lineWidth=7;c.beginPath();c.arc(22,18,30+i*7,0,2.1);c.stroke();c.restore();}
  for(const [x,y,r] of [[-17,-27,10],[16,-29,10],[2,2,13]]){circle(c,x,y,r+2,'#9185aa');circle(c,x,y+2,r,'#172035');circle(c,x-2,y+3,r*.55,'#080f1f');}
  c.fillStyle='rgba(255,255,255,.28)';c.beginPath();c.ellipse(-45,-52,20,9,-.6,0,TAU);c.fill();
}
function carrom(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#845630');circle(c,0,0,90,'#ebc391');
  c.strokeStyle='#a35c43';c.lineWidth=2;c.strokeRect(-58,-58,116,116);c.strokeRect(-51,-51,102,102);
  for(const x of [-64,64])for(const y of [-64,64]){circle(c,x,y,11,'#8f623f');circle(c,x,y,7,'#263135');}
  ring(c,28,'#a95a41',1.8);ring(c,21,'#a95a41',1);star(c,0,0,19,'#c8644d',8,.35);circle(c,0,0,6,'#793e35');
  for(const s of [-1,1]){line(c,-36,s*54,36,s*54,'#d79061',3);line(c,s*54,-36,s*54,36,'#d79061',3);}
}
function casino(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#73552e');circle(c,0,0,94,'#e6bd69');
  for(let i=0;i<20;i++){const a=i*TAU/20;c.beginPath();c.moveTo(0,0);c.arc(0,0,87,a,a+TAU/20);c.closePath();c.fillStyle=i===0?'#2b806e':i%2?'#b64d50':'#26313e';c.fill();c.strokeStyle='#d1ad63';c.lineWidth=1;c.stroke();c.save();c.rotate(a+TAU/40);label(c,String((i*7)%37),0,-73,9,'#ffefd1',700);c.restore();}
  circle(c,0,0,51,'#a37a40');ring(c,46,'#e8c477',3);circle(c,0,0,38,'#59442d');
  for(let i=0;i<8;i++){c.save();c.rotate(i*TAU/8);line(c,0,10,0,35,'#e3bc73',4);c.restore();}circle(c,0,0,12,'#e4c88c');circle(c,0,0,6,'#98723b');
}
function eightball(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,radial(c,-34,-40,146,[[0,'#4c5a70'],[.4,'#202d41'],[1,'#070e1b']]));
  circle(c,8,-7,43,'#dfe4df');label(c,'8',8,-3,62,'#172234',900);c.fillStyle='rgba(255,255,255,.27)';c.beginPath();c.ellipse(-42,-53,22,10,-.5,0,TAU);c.fill();
}
function dartboard(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#172c34');
  for(let i=0;i<20;i++){
    const a=i*TAU/20;for(const [r0,r1,t] of [[0,77,0],[75,82,1],[43,49,1]] as const){c.beginPath();c.arc(0,0,r1,a,a+TAU/20);c.arc(0,0,r0,a+TAU/20,a,true);c.closePath();c.fillStyle=t?(i%2?'#b94c52':'#39816d'):(i%2?'#ddcb9c':'#293c3d');c.fill();c.strokeStyle='#9d9c77';c.lineWidth=.65;c.stroke();}
    c.save();c.rotate(a+TAU/40);label(c,String([20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5][i]),0,-91,8,'#d9d6b6',700);c.restore();
  }circle(c,0,0,12,'#3a816f');circle(c,0,0,6,'#be5358');
}
function bullseye(c: CanvasRenderingContext2D): void {
  for(let i=0;i<7;i++)circle(c,0,0,100-i*14,i%2?'#e7ddce':'#bb4b58');
  line(c,-100,0,100,0,'rgba(42,40,49,.35)',1);line(c,0,-100,0,100,'rgba(42,40,49,.35)',1);
}

function planet(c: CanvasRenderingContext2D, light: string, dark: string, rusty: boolean): void {
  circle(c,0,0,100,light);
  for(let i=0;i<32;i++){
    const a=i*2.4,r=Math.sqrt(noise(i+23))*88,rr=4+noise(i+18)*13,x=Math.cos(a)*r,y=Math.sin(a)*r;
    circle(c,x,y,rr+1,'rgba(255,248,227,.18)');circle(c,x,y+2,rr,dark);circle(c,x+1,y+3,rr*.75,light);circle(c,x-rr*.28,y-rr*.2,rr*.55,dark);
  }
  if(rusty){c.save();c.rotate(.4);c.fillStyle='rgba(248,186,128,.35)';c.beginPath();c.ellipse(6,48,65,9,0,0,TAU);c.fill();c.beginPath();c.ellipse(-24,-36,40,7,0,0,TAU);c.fill();c.restore();}
}
function pluto(c: CanvasRenderingContext2D): void {
  c.save();c.translate(-4,-7);c.rotate(-.3);c.fillStyle='#e2e5d8';c.beginPath();c.moveTo(0,39);c.bezierCurveTo(-69,0,-26,-42,0,-13);c.bezierCurveTo(31,-46,67,1,0,39);c.fill();c.restore();
}
function jupiter(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#d5b391');
  const colors=['#e7c7a1','#bd9576','#f0d6b3','#b87d61','#d9ae88','#b8876c','#eed1aa'];
  for(let i=0;i<17;i++){const y=-104+i*13;c.fillStyle=colors[i%colors.length];c.beginPath();c.moveTo(-110,y);for(let x=-110;x<=110;x+=10)c.lineTo(x,y+Math.sin(x*.05+i)*3);c.lineTo(110,y+16);c.lineTo(-110,y+16);c.closePath();c.fill();}
  c.fillStyle='#b57354';c.beginPath();c.ellipse(33,31,32,17,-.15,0,TAU);c.fill();c.fillStyle='#d39b71';c.beginPath();c.ellipse(34,29,23,10,-.15,0,TAU);c.fill();
}
function ufo(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#354c60');ring(c,91,'#6f95a0',9);circle(c,0,0,78,'#22384b');
  for(let i=0;i<12;i++){c.save();c.rotate(i*TAU/12);line(c,0,44,0,77,'#557b89',2);circle(c,0,-87,5,'#96ffcf');circle(c,0,-87,2,'#efffe6');c.restore();}
  circle(c,0,0,52,'#7e9da7');circle(c,0,0,45,radial(c,-15,-20,64,[[0,'#a4ffe7'],[.45,'#49baa6'],[1,'#1a5468']]));
  poly(c,[[-16,6],[-7,-8],[0,-13],[7,-8],[16,6],[9,19],[-9,19]],'#397765');
  for(const s of [-1,1]){c.fillStyle='#142f3b';c.beginPath();c.ellipse(s*8,2,5,8,-s*.4,0,TAU);c.fill();}
}
function disco(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#4b4c78');
  for(let y=-100;y<100;y+=17)for(let x=-100;x<100;x+=17){const n=noise(x*3+y);c.fillStyle=n<.25?'#899dcc':n<.5?'#cfbfeb':n<.75?'#7a76ad':'#e1dced';c.fillRect(x+1,y+1,15,15);c.fillStyle='rgba(255,255,255,.2)';c.fillRect(x+1,y+1,15,2);}
  star(c,-35,-39,17,'#ffffff',4,.12);star(c,47,17,11,'#f0eaff',4,.14);star(c,-12,65,8,'#f0eaff',4,.14);
}
function peppermint(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#f0e4d6');
  for(let i=0;i<10;i++){c.save();c.rotate(i*TAU/10);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(45,-6,76,-38,107,-25);c.lineTo(107,9);c.bezierCurveTo(66,-4,39,11,0,0);c.fillStyle='#c95165';c.fill();c.restore();}
  circle(c,0,0,7,'#f5eadc');ring(c,93,'rgba(255,255,255,.4)',3);
}
function friedegg(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,'#ac854a');circle(c,0,0,96,'#f1e4bf');
  for(let i=0;i<12;i++){const a=i*TAU/12;circle(c,Math.cos(a)*73,Math.sin(a)*73,20+noise(i)*7,'#fff5db');}
  circle(c,-4,3,45,'#e1a53c');circle(c,-4,-1,41,radial(c,-16,-19,64,[[0,'#ffe98a'],[.5,'#ffc64c'],[1,'#ed9632']]));
  c.fillStyle='rgba(255,255,218,.48)';c.beginPath();c.ellipse(-15,-19,14,7,-.4,0,TAU);c.fill();
  for(let i=0;i<35;i++){const a=i*2.4,r=54+noise(i)*30;circle(c,Math.cos(a)*r,Math.sin(a)*r,.7,'#b6a07b');}
}
function pearl(c: CanvasRenderingContext2D): void {
  circle(c,0,0,100,radial(c,-35,-39,155,[[0,'#fff8e8'],[.35,'#e4dcea'],[.65,'#b3bedb'],[.87,'#808cb6'],[1,'#4d6286']]));
  for(let i=0;i<12;i++)ring(c,91-i*4,`rgba(${i%2?'255,220,227':'213,238,255'},.14)`,2,.2,3.4);
  c.fillStyle='rgba(255,255,255,.4)';c.beginPath();c.ellipse(-28,-35,32,19,-.6,0,TAU);c.fill();star(c,-44,-44,11,'#fff9ec',4,.16);
}
function boss(c: CanvasRenderingContext2D, level: number): void {
  const hot=level%30===0;const glow=hot?'#ff8e87':level%20===0?'#78d6f4':'#bc92ff';
  circle(c,0,0,100,'#26334b');ring(c,91,'#77809c',10);ring(c,82,'#101a2f',6);circle(c,0,0,77,'#141e35');
  for(let i=0;i<12;i++){c.save();c.rotate(i*TAU/12);poly(c,[[-8,-98],[8,-98],[11,-83],[-11,-83]],'#404c67','#9ba0b6',1);circle(c,0,-89,2,'#121b2c');line(c,0,-76,0,-59,glow,3);line(c,0,-59,12,-47,'#556079',2);c.restore();}
  const pts:[number,number][]=[];for(let i=0;i<6;i++){const a=i*TAU/6-Math.PI/2;pts.push([Math.cos(a)*52,Math.sin(a)*52]);}
  poly(c,pts,'#25304b',glow,3);circle(c,0,0,35,radial(c,-8,-12,47,[[0,'#eee3ff'],[.3,glow],[1,'#41416d']]));
  poly(c,[[-23,-4],[-9,-12],[0,-5],[9,-12],[23,-4],[12,8],[0,3],[-12,8]],'#1b2540');
  line(c,-11,19,11,19,glow,3);circle(c,-7,-1,3,glow);circle(c,7,-1,3,glow);
}
