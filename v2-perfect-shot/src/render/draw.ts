/** A complete arcade scene. No DOM, assets, timers, or sound in the renderer. */
import { BASE, CX, CY, GH, GW, INK, MUZZLE, RADIUS, TAU, clamp, easeOut } from '../config';
import { multiplier, readiness, type Scene } from '../game';
import { CAMPAIGN, patternLabel } from '../levels';
import { box, circle, label, line, noise, poly, radial, ring, star } from './primitives';
import { drawTarget, TARGET_TINT } from './targets';
import { drawLauncher, projectile } from './weapons';
import type { SpriteCache } from './cache';

export interface DrawOptions { home?: boolean; best?: number; reducedMotion?: boolean; cache?: SpriteCache }
const MINT = '#83f6d2';

export function draw(c: CanvasRenderingContext2D, s: Scene, options: DrawOptions = {}): void {
  c.save();
  const background = options.cache?.get(`sky:${s.level.palette.id}`, GW, GH, (ctx) => backdrop(ctx, s, true));
  if (background) c.drawImage(background, 0, 0, GW, GH);
  else backdrop(c, s, options.reducedMotion);
  c.save();
  if (!options.reducedMotion && s.shake > .05) c.translate(Math.sin(s.time * 97 + s.endT * 83) * s.shake * .45, Math.cos(s.time * 71 + s.endT * 109) * s.shake * .35);
  halo(c, s, !!options.home);
  wheel(c, s, !!options.home, options.cache);
  if (!options.home) {
    aim(c, s);
    launcher(c, s, options.cache);
    for (const shot of s.shots) {
      const t = clamp(shot.t, 0, 1), y = MUZZLE + (CY + RADIUS - MUZZLE) * t;
      // A gradient trail ends precisely at the projectile, never at a tilted gun.
      const trail = c.createLinearGradient(CX, y, CX, y + 110);
      trail.addColorStop(0, `rgba(${shot.rgb},.65)`);trail.addColorStop(1, `rgba(${shot.rgb},0)`);
      poly(c, [[CX-4,y+5],[CX+4,y+5],[CX+1,y+105],[CX-1,y+105]],trail);
      c.save();c.translate(CX,y);
      if (shot.shape==='disc'||shot.shape==='star') c.rotate(shot.spin);
      c.shadowBlur=12;c.shadowColor=`rgba(${shot.rgb},.7)`;projectile(c,shot.shape,.85,shot.rgb);c.restore();
    }
    impact(c,s);
  }
  particles(c,s,!!options.reducedMotion);
  c.restore();
  if (!options.home) {
    hud(c,s,options.best ?? 0);
    if (s.intro>0) intro(c,s);
    if (s.status!=='play') endBurst(c,s);
  } else {
    label(c, s.level.name.toUpperCase(), CX, 544, 12, 'rgba(220,239,235,.55)', 700);
    label(c, '30 LEVEL  /  3 BOSS  /  ENDLESS RUN', CX, 566, 9, 'rgba(159,184,196,.48)', 700);
  }
  floatTexts(c,s);
  if (s.juice.flash>.01 && !options.reducedMotion) {
    c.fillStyle=`rgba(${s.juice.flashColor},${s.juice.flash*.20})`;c.fillRect(0,0,GW,GH);
  }
  if (s.juice.damage>.01) {
    const g=c.createRadialGradient(CX,GH*.5,GW*.2,CX,GH*.5,GH*.65);
    g.addColorStop(0,'rgba(200,42,67,0)');g.addColorStop(1,`rgba(200,42,67,${s.juice.damage*.65})`);
    c.fillStyle=g;c.fillRect(0,0,GW,GH);
  }
  c.restore();
}

function backdrop(c: CanvasRenderingContext2D,s:Scene,reduced=false):void {
  const p=s.level.palette,t=reduced?0:s.time+s.endT;
  const sky=c.createLinearGradient(0,0,0,GH);sky.addColorStop(0,p.sky0);sky.addColorStop(1,p.sky1);
  c.fillStyle=sky;c.fillRect(0,0,GW,GH);
  const glow=c.createRadialGradient(CX,CY,20,CX,CY,310);
  glow.addColorStop(0,p.glow);glow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=glow;c.fillRect(0,0,GW,GH);
  // A quiet starfield with a handful of drawn constellations.
  for(let i=0;i<56;i++){
    const x=20+noise(i+31)*440,y=75+noise(i+57)*595,r=i%9===0?1.7:.8;
    c.globalAlpha=.22+(.5+.5*Math.sin(t*.5+i))*.4;circle(c,x,y,r,p.dust);
    if(i%17===0){line(c,x-3,y,x+3,y,p.dust,.6);line(c,x,y-3,x,y+3,p.dust,.6);}
  }c.globalAlpha=1;
  line(c,35,228,66,207,'rgba(139,206,203,.09)');line(c,66,207,79,253,'rgba(139,206,203,.09)');
  line(c,402,168,437,198,'rgba(139,206,203,.09)');line(c,437,198,408,224,'rgba(139,206,203,.09)');
  // Distant terrain and a perspective floor ground the launcher.
  poly(c,[[0,624],[48,593],[90,634],[145,605],[211,638],[273,600],[339,627],[401,586],[480,632],[480,960],[0,960]],p.hill0);
  poly(c,[[0,702],[65,671],[129,710],[203,679],[283,717],[367,672],[429,703],[480,677],[480,960],[0,960]],p.hill1);
  const floor=c.createLinearGradient(0,690,0,960);floor.addColorStop(0,'rgba(7,17,31,0)');floor.addColorStop(1,'rgba(3,10,22,.8)');
  c.fillStyle=floor;c.fillRect(0,690,GW,270);
  for(let i=-4;i<=4;i++)line(c,CX+i*22,722,CX+i*110,960,'rgba(112,171,177,.055)');
  for(const y of [742,769,805,853,918])line(c,0,y,GW,y,'rgba(112,171,177,.055)');
  // Framing lines keep the board intentional instead of an empty gradient.
  line(c,18,84,18,677,'rgba(137,210,209,.06)');line(c,462,84,462,677,'rgba(137,210,209,.06)');
  for(const x of [18,462])for(const y of [154,676]){line(c,x-3,y,x+3,y,'rgba(137,210,209,.25)');line(c,x,y-3,x,y+3,'rgba(137,210,209,.25)');}
}

function halo(c:CanvasRenderingContext2D,s:Scene,home:boolean):void {
  c.save();c.translate(CX,CY);
  const color=s.level.boss?'#b6a0ff':MINT;
  const pool=c.createRadialGradient(0,0,RADIUS*.8,0,0,RADIUS+75);
  pool.addColorStop(0,'rgba(92,222,190,.08)');pool.addColorStop(1,'rgba(92,222,190,0)');circle(c,0,0,RADIUS+75,pool);
  ring(c,RADIUS+42,'rgba(145,207,205,.09)',1);
  for(let i=0;i<60;i++){
    const a=i*TAU/60;
    line(c,Math.cos(a)*(RADIUS+35),Math.sin(a)*(RADIUS+35),Math.cos(a)*(RADIUS+(i%5?39:44)),Math.sin(a)*(RADIUS+(i%5?39:44)),i%5?'rgba(138,194,200,.14)':'rgba(138,194,200,.35)',i%5?1:1.7);
  }
  ring(c,RADIUS+51,'rgba(141,201,199,.07)',1,-Math.PI*.9,Math.PI*.05);
  ring(c,RADIUS+51,'rgba(141,201,199,.07)',1,Math.PI*.1,Math.PI*.9);
  const progress=home?.18+.08*Math.sin(s.time*.5):s.hits/s.level.aim;
  ring(c,RADIUS+42,color,2.6,-Math.PI/2,-Math.PI/2+TAU*Math.max(.004,progress));
  // Four tiny brackets and a moving bearing on the outer ring.
  for(let i=0;i<4;i++){c.save();c.rotate(i*TAU/4);line(c,RADIUS+58,-6,RADIUS+58,6,'rgba(143,223,211,.5)',2);line(c,RADIUS+58,0,RADIUS+65,0,'rgba(143,223,211,.5)',2);c.restore();}
  const a=s.rot*.35-Math.PI/2;circle(c,Math.cos(a)*(RADIUS+42),Math.sin(a)*(RADIUS+42),3,color);
  if(s.status==='win'){const r=RADIUS+s.endT*130;c.globalAlpha=Math.max(0,1-s.endT/1.3);ring(c,r,color,2);c.globalAlpha=1;}
  c.restore();
}

function wheel(c:CanvasRenderingContext2D,s:Scene,home:boolean,cache?:SpriteCache):void {
  const texture = cache?.get(`target:${s.level.target}:${s.level.boss?s.level.n%30:0}`,512,512,(ctx)=>{
    ctx.translate(256,256);drawTarget(ctx,s.level.target,RADIUS*2,s.level.n);
  });
  const body = () => { if(texture)c.drawImage(texture,-128,-128,256,256);else drawTarget(c,s.level.target,RADIUS,s.level.n); };
  c.save();c.translate(CX,CY);
  const squash=1+s.bump*.045;c.scale(1/squash,squash);
  c.save();c.translate(0,8);circle(c,0,0,RADIUS+4,'rgba(0,0,0,.3)');c.restore();
  if(s.status==='win'){
    const t=Math.max(0,s.endT-.07);
    for(let i=0;i<4;i++){
      const a=i*TAU/4+Math.PI/4;
      c.save();c.translate(Math.cos(a)*t*95,Math.sin(a)*t*65+t*t*155);c.rotate(s.rot+Math.sin(a)*t*.9);
      c.globalAlpha=clamp(1-t*.9,0,1);c.beginPath();c.moveTo(0,0);c.arc(0,0,RADIUS+3,i*TAU/4,(i+1)*TAU/4);c.closePath();c.clip();
      body();c.restore();
    }
  }else{c.save();c.rotate(s.rot);body();c.restore();}

  if(s.status==='play'){
    for(const token of s.tokens){
      if(token.collected)continue;const a=token.angle+s.rot;
      c.save();c.translate(Math.cos(a)*(RADIUS-9),Math.sin(a)*(RADIUS-9));
      c.shadowColor='#ffcf68';c.shadowBlur=9;circle(c,0,0,9,'#75582c');circle(c,0,0,7.6,'#ffdb82');c.shadowBlur=0;
      ring(c,5.7,'#b77f32',1);star(c,0,0,4,'#b87e34',4,.42);c.restore();
    }
  }
  for(const k of s.stuck){
    const pop=easeOut((s.time-k.born)/.13),a=k.angle+s.rot;
    const flying=s.status==='win'?s.endT*70:0;
    c.save();c.translate(Math.cos(a)*(RADIUS+7+flying),Math.sin(a)*(RADIUS+7+flying)+(s.status==='win'?s.endT*s.endT*180:0));
    c.rotate(a-Math.PI/2+(s.status==='win'?s.endT*2:0));c.scale(.72+.15*pop,.72+.15*pop);
    if(s.status==='win')c.globalAlpha=clamp(1-s.endT*.9,0,1);
    c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=4;c.shadowOffsetY=2;
    projectile(c,k.shape,1,k.rgb);c.restore();
  }
  if(home){c.save();c.rotate(-s.rot*.5);ring(c,27,'rgba(255,255,255,.05)',1);c.restore();}
  c.restore();
}

function aim(c:CanvasRenderingContext2D,s:Scene):void {
  c.save();const ready=readiness(s);
  c.strokeStyle=`rgba(156,219,211,${.09+ready*.07})`;c.lineWidth=1;c.setLineDash([3,11]);c.lineDashOffset=-s.time*20;
  c.beginPath();c.moveTo(CX,CY+RADIUS+48);c.lineTo(CX,MUZZLE-35);c.stroke();c.setLineDash([]);
  // A small landing reticle makes the exact contact point unambiguous.
  const y=CY+RADIUS+5;line(c,CX-8,y+2,CX-4,y-2,'rgba(195,255,231,.6)',1.5);line(c,CX+8,y+2,CX+4,y-2,'rgba(195,255,231,.6)',1.5);
  c.restore();
}

function launcher(c:CanvasRenderingContext2D,s:Scene,cache?:SpriteCache):void {
  c.save();c.translate(CX,BASE+60);c.scale(1,.25);
  circle(c,0,0,82,radial(c,0,0,82,[[0,'rgba(99,218,205,.12)'],[1,'rgba(99,218,205,0)']]));
  ring(c,67,'rgba(116,231,210,.16)',2);ring(c,55,'rgba(116,231,210,.08)',1);c.restore();
  const texture=cache?.get(`gun:${s.weapon.id}`,320,440,(ctx)=>{ctx.translate(160,296);ctx.scale(2,2);drawLauncher(ctx,s.weapon);});
  c.save();c.translate(CX,BASE+s.recoil*14);
  if(texture)c.drawImage(texture,-80,-148,160,220);else drawLauncher(c,s.weapon);c.restore();
  const ready=readiness(s);
  if(s.status==='play'&&!s.shots.length&&ready>.98&&s.hurt===0){
    c.save();c.translate(CX,MUZZLE-20);c.globalAlpha=.75;c.shadowBlur=9;c.shadowColor=`rgb(${s.weapon.rgb})`;
    projectile(c,s.weapon.shape,.55,s.weapon.rgb);c.restore();
  }
  label(c,s.weapon.name.toUpperCase(),CX,662,11,`rgba(${s.weapon.rgb},.8)`,700);
  box(c,CX-37,678,74,3,1.5,'rgba(180,227,223,.12)');
  if(ready>0)box(c,CX-37,678,74*ready,3,1.5,`rgba(${s.weapon.rgb},.75)`);
}

function impact(c:CanvasRenderingContext2D,s:Scene):void {
  if(s.flash<.02)return;
  const y=CY+RADIUS,r=20+s.flash*38;const g=c.createRadialGradient(CX,y,0,CX,y,r);
  g.addColorStop(0,`rgba(246,255,219,${s.flash*.65})`);g.addColorStop(1,'rgba(246,255,219,0)');
  c.fillStyle=g;c.fillRect(CX-r,y-r,r*2,r*2);
}

function heart(c:CanvasRenderingContext2D,x:number,y:number,full:boolean):void {
  c.save();c.translate(x,y);c.beginPath();c.moveTo(0,8);c.bezierCurveTo(-21,-4,-8,-16,0,-7);c.bezierCurveTo(8,-16,21,-4,0,8);
  c.fillStyle=full?'#ff8d9c':'rgba(186,157,171,.14)';c.fill();c.strokeStyle=full?'#ffc0c5':'rgba(186,157,171,.23)';c.lineWidth=1;c.stroke();
  if(full)line(c,-7,-5,-4,-7,'#ffe0dd',1.5);c.restore();
}
function hud(c:CanvasRenderingContext2D,s:Scene,best:number):void {
  label(c,'SCORE',30,95,10,'#94aebd',700,'left');label(c,s.score.toLocaleString('en-US'),30,122,26,'#e5f5ed',800,'left');
  label(c,'BEST',450,95,10,'#94aebd',700,'right');label(c,Math.max(best,s.score).toLocaleString('en-US'),450,121,18,'#c5d7d9',700,'right');
  for(let i=0;i<3;i++)heart(c,CX+(i-1)*27,113,i<s.lives);
  const stage=(s.level.n-1)%CAMPAIGN+1;
  box(c,CX-49,153,98,25,8,s.level.boss?'rgba(180,135,255,.14)':'rgba(91,226,188,.10)',s.level.boss?'rgba(183,139,255,.4)':'rgba(126,235,204,.23)');
  label(c,`${s.level.boss?'BOSS':'LEVEL'} ${String(stage).padStart(2,'0')}${s.level.lap>1?` · L${s.level.lap}`:''}`,CX,166,11,s.level.boss?'#d3b8ff':MINT,800);
  label(c,s.level.name.replace('Boss: ','').toUpperCase(),CX,190,13,'#d3e6df',700);
  const spin=patternLabel(s.level,s.time);label(c,`${s.level.pattern==='reverse'?'↔':'↻'}  ${spin}`,CX,538,10,'#9bb7bd',700);
  const pw=20,gap=6,span=s.level.aim*pw+(s.level.aim-1)*gap;
  for(let i=0;i<s.level.aim;i++){
    const done=i<s.hits;box(c,CX-span/2+i*(pw+gap),562,pw,7,3,done?MINT:'rgba(152,209,200,.14)');
  }
  label(c,`${String(s.hits).padStart(2,'0')} / ${s.level.aim}`,CX,590,19,'#d9eee3',800);
  if(s.combo>1){
    box(c,CX-69,610,138,27,10,'rgba(113,245,207,.08)','rgba(113,245,207,.18)');
    label(c,`${s.combo} COMBO   ×${multiplier(s.combo).toFixed(2).replace(/0$/,'')}`,CX,624,11,MINT,800);
  }else label(c,'CARI CELAH. JAGA IRAMA.',CX,623,9,'rgba(163,190,193,.45)',700);
  if(s.hurt>0)label(c,'TENANG… COBA CELAH LAIN',CX,699,10,'#ff9eaa',700);
}

function intro(c:CanvasRenderingContext2D,s:Scene):void {
  const alpha=clamp(s.intro/.22,0,1);
  c.save();c.globalAlpha=alpha;
  box(c,65,CY-56,350,113,17,'rgba(8,18,34,.93)',s.level.boss?'rgba(190,148,255,.6)':'rgba(132,244,209,.4)');
  label(c,s.level.boss?'BOSS INCOMING':`LEVEL ${String(s.level.n).padStart(2,'0')}`,CX,CY-26,11,s.level.boss?'#c9a9ff':MINT,800);
  label(c,s.level.name.replace('Boss: ',''),CX,CY+2,24,'#eff7e9',800);
  label(c,`${s.level.aim} TEMBAKAN BERSIH UNTUK LANJUT`,CX,CY+31,10,'#a2bec0',700);
  c.restore();
}

function endBurst(c:CanvasRenderingContext2D,s:Scene):void {
  const alpha=easeOut((s.endT-.25)/.3);
  if(alpha<=0)return;c.save();c.globalAlpha=alpha;
  if(s.status==='win'){
    c.save();c.translate(CX,CY-5);const sc=.85+.15*easeOut(s.endT/.6);c.scale(sc,sc);
    label(c,s.reward?.perfect?'PERFECT!':'LEVEL CLEAR',0,0,s.reward?.perfect?43:35,MINT,900);
    for(let i=0;i<3;i++)star(c,(i-1)*31,42,12,i<(s.reward?.stars??1)?INK.gold:'rgba(255,255,255,.16)');
    label(c,`+${s.reward?.coins??0} KOIN`,0,78,14,'#ffdc92',800);c.restore();
  }else{
    box(c,100,515,280,101,14,'rgba(12,20,36,.9)','rgba(255,134,156,.3)');
    label(c,'RUN OVER',CX,552,34,'#ff99a7',900);label(c,'MASIH ADA RUN BERIKUTNYA.',CX,585,10,'#a8b9c4',700);
  }c.restore();
}

function particles(c:CanvasRenderingContext2D,s:Scene,reduced:boolean):void {
  const list=reduced?s.juice.particles.slice(0,30):s.juice.particles;
  for(const p of list){
    c.save();c.translate(p.x,p.y);c.rotate(p.rot);c.globalAlpha=clamp(p.life/p.max,0,1);
    c.fillStyle=`rgb(${p.rgb})`;
    if(p.shard)c.fillRect(-p.size*.5,-p.size,p.size,p.size*2);else circle(c,0,0,p.size,`rgb(${p.rgb})`);
    c.restore();
  }
}
function floatTexts(c:CanvasRenderingContext2D,s:Scene):void {
  for(const t of s.juice.texts){c.save();c.globalAlpha=clamp(t.life/.25,0,1);label(c,t.text,t.x,t.y,t.size,t.color,800);c.restore();}
}

/** Exported for the armory and campaign previews; the host doesn't copy art. */
export { drawLauncher, drawTarget, TARGET_TINT };
