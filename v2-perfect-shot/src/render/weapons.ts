/** Original top-down launcher and projectile art; every muzzle is on x = 0. */
import { TAU } from '../config';
import type { Shape, Weapon } from '../weapons';
import { box, circle, line, poly, radial, ring, star } from './primitives';

/** Centre at the grip; the muzzle is always exactly (0, -116). */
export function drawLauncher(c: CanvasRenderingContext2D, w: Weapon, recoil = 0): void {
  c.save(); c.translate(0, recoil * 14);
  const color = `rgb(${w.rgb})`;
  const metal = c.createLinearGradient(-32, 0, 32, 0);
  metal.addColorStop(0,'#182c3e');metal.addColorStop(.3,'#476377');metal.addColorStop(.53,'#718894');metal.addColorStop(.6,'#3a5368');metal.addColorStop(1,'#142737');
  const light = c.createLinearGradient(-18,0,18,0);
  light.addColorStop(0,'#647b8d');light.addColorStop(.47,'#d0e1df');light.addColorStop(.52,'#7994a2');light.addColorStop(1,'#324e63');
  c.lineJoin='round';

  // A ground shadow and centred grip anchor all ten silhouettes to the aim line.
  c.save();c.translate(3,5);box(c,-18,-4,36,68,11,'rgba(0,0,0,.4)');c.restore();
  box(c,-16,-1,32,59,8,'#152638','#74838c');box(c,-11,7,22,43,5,w.style==='ranger'?'#735140':'#253b50');
  for(let i=0;i<5;i++)line(c,-8,15+i*6,8,15+i*6,'rgba(0,0,0,.3)',2);
  circle(c,0,47,2,'#9cabb0');

  switch(w.style){
    case 'bow': {
      c.strokeStyle='#152b2e';c.lineWidth=11;c.beginPath();c.moveTo(-9,-113);c.bezierCurveTo(-78,-104,-66,2,-10,20);c.moveTo(9,-113);c.bezierCurveTo(78,-104,66,2,10,20);c.stroke();
      c.strokeStyle='#b5a677';c.lineWidth=6;c.beginPath();c.moveTo(-9,-113);c.bezierCurveTo(-78,-104,-66,2,-10,20);c.moveTo(9,-113);c.bezierCurveTo(78,-104,66,2,10,20);c.stroke();
      c.strokeStyle='#d3e4be';c.lineWidth=1.4;c.beginPath();c.moveTo(-9,-113);c.lineTo(0,-10+recoil*15);c.lineTo(-10,20);c.moveTo(9,-113);c.lineTo(0,-10+recoil*15);c.lineTo(10,20);c.stroke();
      box(c,-6,-84,12,79,4,'#365348','#92be89');line(c,0,-116,0,4,color,3);poly(c,[[0,-122],[7,-109],[-7,-109]],color);break;
    }
    case 'revolver': {
      box(c,-12,-113,24,87,4,metal,'#9daca9');box(c,-6,-108,12,71,2,'#243b48');
      box(c,-34,-42,68,51,13,'#1b3142','#90a2a5');box(c,-29,-39,58,43,10,metal);
      for(let i=0;i<5;i++){box(c,-24+i*10,-34,7,29,3,i%2?'#20384a':'#6a7c80');line(c,-22+i*10,-31,-22+i*10,-8,'#a5b3a8',1);}
      box(c,-16,-117,32,7,2,'#d3b978','#f4d996');box(c,-21,4,42,11,4,'#283f4c');circle(c,0,-19,8,'#ab8f5c');circle(c,0,-19,4,'#4d4533');break;
    }
    case 'martian': {
      poly(c,[[-13,-105],[-27,-75],[-35,-32],[-24,5],[24,5],[35,-32],[27,-75],[13,-105]],metal,'#7ca688',2);
      circle(c,0,-39,23,'#172f2a');circle(c,0,-39,17,radial(c,-4,-45,70,[[0,'#e2ffba'],[.4,color],[1,'#245a3a']]));
      box(c,-10,-113,20,53,5,'#315941','#9fe68d');
      for(let i=0;i<3;i++)box(c,-18,-103+i*14,36,6,3,'#72bf6d','#b4f59b');
      box(c,-19,-119,38,9,4,color,'#e1ffd0');circle(c,0,-115,3,'#efffde');
      for(const s of [-1,1]){line(c,s*29,-32,s*35,-65,'#add58e',3);circle(c,s*34,-68,4,color);}break;
    }
    case 'diamond': {
      poly(c,[[-13,-106],[-24,-62],[-31,-21],[-17,9],[17,9],[31,-21],[24,-62],[13,-106]],'#d9edef','#7aaac1',2);
      poly(c,[[-8,-96],[-13,-43],[0,-14],[13,-43],[8,-96]],'#4e8fa9');line(c,0,-102,0,-17,'#aaffff',3);
      for(const s of [-1,1])poly(c,[[s*13,-62],[s*28,-42],[s*24,-13],[s*12,-27]],'#a9d9e7','#efffff',1);
      // Bright crystal directly over the bore, not a dark or offset decoration.
      projectile(c,'diamond',1.1,w.rgb,0,-116);
      circle(c,0,-4,6,'#baffff');circle(c,0,-4,3,'#f7ffff');break;
    }
    case 'disc': {
      box(c,-17,-113,34,33,7,metal,'#a0a3c6');
      poly(c,[[-21,-95],[-42,-66],[-42,-20],[-24,8],[24,8],[42,-20],[42,-66],[21,-95]],'#27354f','#727b9b',2);
      circle(c,0,-48,31,'#172b43');circle(c,0,-48,10,color);
      // The ring's local coordinates are centred, hence the separate transform.
      c.save();c.translate(0,-48);ring(c,25,color,3);ring(c,17,'#617292',2);star(c,0,0,12,'#c9c6ff',4,.35);c.restore();
      box(c,-22,-118,44,8,3,color,'#e7ddff');break;
    }
    case 'cannon': {
      box(c,-28,-115,56,97,9,metal,'#ad8d76');box(c,-36,-119,72,14,5,'#614b42','#e6ae76');box(c,-29,-117,58,6,3,'#1c2832');
      for(let i=0;i<4;i++)for(const s of [-1,1])box(c,s>0?12:-23,-96+i*17,11,7,2,color);
      box(c,-42,-24,84,32,9,'#2a3e4c','#9a9181');box(c,-17,-90,34,69,3,'#273f50');line(c,0,-92,0,-33,'#f3b16f',3);
      circle(c,-31,-9,4,'#cc9661');circle(c,31,-9,4,'#cc9661');break;
    }
    case 'ninja': {
      poly(c,[[-11,-111],[-23,-85],[-31,-25],[-23,8],[23,8],[31,-25],[23,-85],[11,-111]],'#263049','#a58caf',2);
      for(const s of [-1,1])poly(c,[[s*21,-78],[s*48,-37],[s*41,-12],[s*20,-25]],'#3f3b58','#b18ac4',1.5);
      box(c,-8,-114,16,68,4,'#111e36');line(c,0,-110,0,-50,color,4);box(c,-18,-118,36,7,3,'#c2a1df');
      c.save();c.translate(0,-23);star(c,0,0,24,color,4,.32);circle(c,0,0,7,'#17263d');c.restore();break;
    }
    case 'nova': {
      poly(c,[[-10,-110],[-20,-79],[-22,-20],[-16,10],[16,10],[22,-20],[20,-79],[10,-110]],metal,'#d9c38a',2);
      for(const s of [-1,1])poly(c,[[s*17,-81],[s*43,-47],[s*48,-12],[s*27,-27],[s*20,-12]],'#bca36b','#ffe8aa',1.5);
      box(c,-6,-111,12,62,4,color);box(c,-17,-118,34,8,3,'#f8e3a3');
      circle(c,0,-27,18,'#493e31');circle(c,0,-27,13,color);circle(c,0,-27,7,'#fff8d2');
      for(const s of [-1,1])circle(c,s*34,-40,3,color);break;
    }
    case 'neon':
    case 'ranger': {
      const neon=w.style==='neon';
      box(c,-13,-113,26,91,5,metal,'#91a7ae');box(c,-7,-109,14,77,2,'#203847');line(c,-4,-104,-4,-38,'#9dbec5',1.5);
      poly(c,[[-13,-57],[-30,-34],[-33,-6],[-19,8],[19,8],[33,-6],[30,-34],[13,-57]],metal,'#738d9c',1.5);
      box(c,-17,-118,34,8,3,neon?color:'#afc9cd');box(c,-24,-20,48,16,4,'#183346','#5c7c8c');circle(c,0,-12,5,color);
      for(const s of [-1,1]){box(c,s>0?20:-26,-37,6,27,2,neon?color:'#687f86');circle(c,s*24,-3,2,'#c3d5d1');}
      if(neon)for(const s of [-1,1]){poly(c,[[s*15,-84],[s*32,-68],[s*33,-46],[s*19,-57]],'#2f596b',color,1);line(c,s*17,-80,s*28,-62,color,2);}
      break;
    }
  }
  // Same central sight on every gun: rotation and visual posture both upright.
  if(w.style!=='bow'&&w.style!=='diamond')box(c,-2,-109,4,9,1,'#e9f7de');
  c.restore();
}

/** Centred silhouette, tip up. Its own colour never comes from another gun. */
export function projectile(c: CanvasRenderingContext2D, kind: Shape, scale: number, rgb: string, x = 0, y = 0): void {
  c.save();c.translate(x,y);c.scale(scale,scale);const color=`rgb(${rgb})`;
  switch(kind){
    case 'knife': {
      poly(c,[[0,-28],[-5,-9],[-4,4],[4,4],[5,-9]],color,'#203a4b',1);
      poly(c,[[0,-28],[0,4],[4,4],[5,-9]],'#8eaebb');line(c,-1,-20,-2,2,'#f4ffff',1);
      box(c,-7,3,14,3,1,'#b6a176');box(c,-3,6,6,18,2,'#38495a');for(let i=0;i<3;i++)line(c,-3,9+i*4,3,9+i*4,'#73959e',1);break;
    }
    case 'arrow': {
      box(c,-1.3,-27,2.6,48,1,'#b9a17a');poly(c,[[0,-34],[-7,-21],[0,-24],[7,-21]],color,'#375849',.7);
      for(const s of [-1,1])poly(c,[[0,9],[s*7,16],[s*7,24],[0,20]],color);break;
    }
    case 'bullet': {
      c.beginPath();c.moveTo(0,-22);c.bezierCurveTo(8,-16,6,-6,6,6);c.lineTo(-6,6);c.bezierCurveTo(-6,-6,-8,-16,0,-22);c.closePath();c.fillStyle=color;c.fill();
      box(c,-6,4,12,13,1,'#b78649');line(c,-3,-12,-3,12,'#fff3c2',1.5);box(c,-7,14,14,3,1,'#efcb84');break;
    }
    case 'disc': {
      circle(c,0,0,14,'#373e65');ring(c,11,color,3);circle(c,0,0,5,color);
      for(let i=0;i<4;i++){c.save();c.rotate(i*TAU/4);poly(c,[[-3,-11],[0,-21],[5,-13]],'#d6dafa',color,.6);c.restore();}break;
    }
    case 'spark': {
      circle(c,0,0,13,`rgba(${rgb},.22)`);circle(c,0,0,8,color);circle(c,-2,-2,4,'#efffe3');
      for(let i=0;i<3;i++){c.save();c.rotate(i*TAU/3);line(c,0,-13,0,-20,color,2);c.restore();}break;
    }
    case 'diamond': {
      poly(c,[[-10,-10],[0,-18],[10,-10],[0,15]],'#baffff','#f1ffff',1);
      poly(c,[[-10,-10],[0,-9],[0,15]],'#4fbedf');poly(c,[[10,-10],[0,-9],[0,15]],'#98eafa');
      poly(c,[[0,-18],[-4,-10],[4,-10]],'#ffffff');line(c,-10,-10,10,-10,'#f1ffff',1);line(c,0,-9,0,15,'#e9ffff',1);break;
    }
    case 'star': {
      star(c,0,0,22,color,4,.3);star(c,0,0,16,'#c2bddb',4,.25);circle(c,0,0,4,'#2c3850');break;
    }
    case 'bolt': {
      poly(c,[[4,-27],[-9,-4],[-2,-3],[-6,22],[12,-6],[3,-5]],color,'#fff5ce',.7);break;
    }
  }
  c.restore();
}
