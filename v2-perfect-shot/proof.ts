/** Rules + actual rendered frames. Run `npm run proof -- /tmp/psv2-full`. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { Sfx } from './src/audio';
import { COLLIDE, END_HOLD, GH, GW, HITS_TO_WIN, LIVES, SCORE, TAU } from './src/config';
import { Game, angleDelta, multiplier } from './src/game';
import { Juice } from './src/juice';
import { CAMPAIGN, levelConfig, speedAt } from './src/levels';
import { defaultSave, loadSave, normaliseSave, purchase, SAVE_KEY, saveSave } from './src/persist';
import { draw, drawLauncher, drawTarget } from './src/render/draw';
import { label } from './src/render/primitives';
import { createSpriteCache, type Surface } from './src/render/cache';
import { WEAPONS, weaponById } from './src/weapons';

let passed=0,failed=0;
function test(name:string,fn:()=>void):void {
  try{fn();passed++;console.log(`  ok  ${name}`);}catch(error){failed++;console.error(` FAIL ${name}\n`,error);}
}
export function advance(g:Game,seconds:number):void {
  let remaining=seconds;
  while(remaining>1e-8){const dt=Math.min(1/120,remaining);g.update(dt);remaining-=dt;}
}
function clearAngle(g:Game,avoidTokens=false):number {
  for(let a=0;a<TAU;a+=.013){
    if(g.scene.stuck.every(k=>Math.abs(angleDelta(k.angle,a))>.30)
      &&(!avoidTokens||g.scene.tokens.every(t=>Math.abs(angleDelta(t.angle,a))>.24)))return a;
  }
  throw new Error('No clear slot');
}
function settleReady(g:Game):void { advance(g,Math.max(g.scene.intro,g.scene.hurt,g.scene.cooldown)+.015); }
/** Aim a clear slot and hold the wheel during flight, not the scoring rules. */
function shotAt(g:Game,angle:number):void {
  settleReady(g);g.scene.rot=Math.PI/2-angle;
  const spin=g.spinAt;g.spinAt=()=>0;
  assert.equal(g.fire(),true);advance(g,g.flight+.006);g.spinAt=spin;
}
export function cleanShot(g:Game,avoidTokens=false):void {
  settleReady(g);shotAt(g,clearAngle(g,avoidTokens));
}
export function clearLevel(g:Game):void {
  while(g.scene.status==='play'&&g.scene.hits<g.scene.level.aim)cleanShot(g);
  assert.equal(g.scene.status,'win');
}
const fresh=(level=1)=>new Game('knife',{level,intro:false});

console.log('Perfect Shot v2 / rules');
test('new run: 3 lives, zero score, opening blades, 3 collectible tokens',()=>{
  const g=fresh();assert.equal(g.scene.status,'play');assert.equal(g.scene.lives,LIVES);
  assert.equal(g.scene.score,0);assert.equal(g.scene.stuck.length,g.scene.level.obstacles);assert.equal(g.scene.tokens.length,3);
});
test('intro blocks firing, then releases it',()=>{
  const g=new Game();assert.equal(g.fire(),false);advance(g,1.3);assert.equal(g.fire(),true);
});
test('spin is deterministic and keeps turning',()=>{
  const a=fresh(),b=fresh();advance(a,2);advance(b,2);assert.equal(a.scene.rot,b.scene.rot);assert.ok(Math.abs(a.scene.rot)>1);
});
test('all five spin patterns are finite; reverse and boss really reverse',()=>{
  const seen=new Set<string>();
  for(let n=1;n<=CAMPAIGN;n++){const l=levelConfig(n);seen.add(l.pattern);for(let t=0;t<12;t+=.1)assert.ok(Number.isFinite(speedAt(l,t)));}
  assert.equal(seen.size,5);assert.ok(speedAt({...levelConfig(1),pattern:'reverse'},5)<0);
  assert.ok(speedAt(levelConfig(10),3)<0);assert.equal(speedAt(levelConfig(10),4.3),0);
});
test('30-stage campaign, three bosses, endless laps and input sanitisation',()=>{
  assert.equal(CAMPAIGN,30);assert.deepEqual(Array.from({length:30},(_,i)=>i+1).filter(n=>levelConfig(n).boss),[10,20,30]);
  assert.equal(levelConfig(31).lap,2);assert.equal(levelConfig(31).target,levelConfig(1).target);
  assert.ok(levelConfig(31).base>levelConfig(1).base);assert.equal(levelConfig(NaN).n,1);assert.equal(levelConfig(-9).n,1);
});
test('opening obstacles and tokens never overlap',()=>{
  for(let n=1;n<=90;n++){const g=fresh(n);for(const t of g.scene.tokens)assert.ok(g.scene.stuck.every(k=>Math.abs(angleDelta(t.angle,k.angle))>.35));assert.ok(g.scene.stuck.length<=5);}
});
test('a shot flies, lands, sticks, scores and emits exactly one landing',()=>{
  const g=fresh(),before=g.scene.stuck.length;cleanShot(g,true);
  assert.equal(g.scene.shots.length,0);assert.equal(g.scene.stuck.length,before+1);assert.equal(g.scene.hits,1);assert.equal(g.scene.score,SCORE.hit);
  const events=g.takeEvents();assert.equal(events.filter(e=>e.type==='fire').length,1);assert.equal(events.filter(e=>e.type==='land').length,1);assert.deepEqual(g.takeEvents(),[]);
});
test('mashing is rate-limited, every cooldown exceeds the flight',()=>{
  for(const w of WEAPONS){assert.ok(w.cooldown>.16);const g=new Game(w.id,{intro:false});assert.equal(g.fire(),true);assert.equal(g.fire(),false);advance(g,w.cooldown+.02);assert.equal(g.fire(),true);}
});
test('weapon swaps do not mutate a projectile in flight or bypass cooldown',()=>{
  const g=fresh();g.fire();g.setWeapon('plasma');assert.equal(g.scene.shots[0].shape,'knife');assert.equal(g.scene.weapon.shape,'spark');assert.equal(g.fire(),false);
});
test('only Diamond Gun shoots diamonds; Martian plasma is green',()=>{
  assert.deepEqual(WEAPONS.filter(w=>w.shape==='diamond').map(w=>w.id),['diamond']);
  const [r,g,b]=weaponById('plasma').rgb.split(',').map(Number);assert.ok(g>r&&g>b);
  assert.equal(weaponById('unknown').id,'knife');assert.equal(WEAPONS.length,10);
});
test('a collision costs one life, adds no hit, breaks combo and gives recovery time',()=>{
  const g=fresh();cleanShot(g);const before=g.scene.stuck.length;shotAt(g,g.scene.stuck[0].angle);
  assert.equal(g.scene.status,'play');assert.equal(g.scene.lives,2);assert.equal(g.scene.hits,1);assert.equal(g.scene.stuck.length,before);
  assert.equal(g.scene.combo,0);assert.ok(g.scene.hurt>0);assert.equal(g.fire(),false);assert.equal(g.scene.outcome,null);
});
test('third collision ends the run and reports gameover once',()=>{
  const g=fresh();for(let i=0;i<3;i++)shotAt(g,g.scene.stuck[0].angle);
  assert.equal(g.scene.status,'lose');assert.equal(g.scene.lives,0);assert.equal(g.fire(),false);
  assert.equal(g.takeEvents().filter(e=>e.type==='gameover').length,1);assert.equal(g.clearOutcome(),'lose');assert.equal(g.clearOutcome(),null);
});
test('angular collision is symmetric and wraps through zero',()=>{
  assert.equal(angleDelta(1,1),0);assert.ok(Math.abs(angleDelta(.01,TAU-.01)-.02)<1e-9);
  assert.ok(Math.abs(angleDelta(TAU-.01,.01)+.02)<1e-9);assert.ok(COLLIDE>0&&COLLIDE<.3);
});
test('combo raises scoring and caps at ×4',()=>{
  assert.equal(multiplier(1),1);assert.equal(multiplier(5),2);assert.equal(multiplier(999),4);
  const g=fresh();cleanShot(g,true);cleanShot(g,true);assert.equal(g.scene.score,100+125);assert.equal(g.scene.maxCombo,2);
});
test('a rim token gives +5 bonus coins exactly once',()=>{
  const g=fresh(),t=g.scene.tokens[0];shotAt(g,t.angle);assert.equal(t.collected,true);assert.equal(g.scene.runCoins,1+SCORE.token);
  const land=g.takeEvents().find(e=>e.type==='land');assert.ok(land?.type==='land'&&land.token&&land.points===350);
});
test('10 clean hits clear, award PERFECT and conserve score/coin events',()=>{
  const g=fresh();clearLevel(g);assert.equal(g.scene.hits,HITS_TO_WIN);assert.equal(g.scene.stuck.length,g.scene.level.obstacles+10);
  assert.equal(g.scene.reward?.perfect,true);assert.equal(g.scene.reward?.stars,3);assert.equal(g.scene.outcome,'win');
  const events=g.takeEvents(),land=events.filter(e=>e.type==='land');
  assert.equal(land.length,10);assert.equal(events.filter(e=>e.type==='clear').length,1);
  assert.equal(g.scene.runCoins,land.reduce((n,e)=>n+e.coins,0)+g.scene.reward!.coins);
  assert.equal(g.scene.score,land.reduce((n,e)=>n+e.points,0)+g.scene.reward!.score);
  assert.equal(g.nextLevel(),false);advance(g,END_HOLD+.01);assert.equal(g.ended,true);
});
test('a non-perfect clear gets two stars and no perfect bonus',()=>{
  const g=fresh();shotAt(g,g.scene.stuck[0].angle);clearLevel(g);
  assert.equal(g.scene.reward?.perfect,false);assert.equal(g.scene.reward?.stars,2);assert.equal(g.scene.reward?.coins,SCORE.coinsPerLevel);
});
test('next level preserves run stats; resets target, tokens and hits',()=>{
  const g=fresh();clearLevel(g);advance(g,END_HOLD+.01);const {score,runCoins,lives,combo}=g.scene;
  assert.equal(g.nextLevel(),true);assert.equal(g.scene.level.n,2);assert.equal(g.scene.score,score);assert.equal(g.scene.runCoins,runCoins);
  assert.equal(g.scene.lives,lives);assert.equal(g.scene.combo,combo);assert.equal(g.scene.hits,0);assert.equal(g.scene.outcome,null);assert.ok(g.scene.intro>0);
});
test('boss clear restores a life but cannot exceed three',()=>{
  for(const lives of [1,2,3]){const g=fresh(10);g.scene.lives=lives;clearLevel(g);assert.equal(g.scene.lives,Math.min(3,lives+1));assert.equal(g.scene.reward?.healed,lives<3);}
});
test('all 30 stages are clearable; no impossible opening layouts',()=>{
  for(let n=1;n<=30;n++){const g=fresh(n);clearLevel(g);assert.equal(g.scene.lives,3);}
});
test('restart preserves gun but resets lives, combo, level and score',()=>{
  const g=new Game('disc',{level:9,intro:false});cleanShot(g);g.restart(undefined,{intro:false});assert.equal(g.scene.weapon.id,'disc');
  assert.equal(g.scene.level.n,1);assert.equal(g.scene.score,0);assert.equal(g.scene.lives,3);assert.equal(g.scene.combo,0);
});
test('invalid delta is ignored; huge delta is clamped',()=>{
  const g=fresh();g.update(NaN);g.update(-1);g.update(Infinity);assert.equal(g.scene.time,0);g.update(10);assert.ok(g.scene.time<=.1+1e-9);
});
test('juice is bounded and all effects expire',()=>{
  const j=new Juice();j.burst(0,0,9999,'255,255,255');assert.equal(j.particles.length,300);
  for(let i=0;i<100;i++)j.text(0,0,'score','#fff');assert.ok(j.texts.length<=25);j.update(2);assert.equal(j.particles.length,0);assert.equal(j.texts.length,0);
});
test('save normalisation handles null, malformed data, negatives and unowned guns',()=>{
  assert.deepEqual(normaliseSave(null),defaultSave());assert.deepEqual(normaliseSave({v:99}),defaultSave());
  const s=normaliseSave({v:1,coins:-5,best:NaN,bestLevel:0,owned:['nope','neon','neon'],gun:'diamond',stars:{'1':99,'0':3,'__proto__':2,'31':3}});
  assert.equal(s.coins,0);assert.equal(s.best,0);assert.equal(s.bestLevel,1);assert.equal(s.gun,'knife');assert.ok(s.owned.includes('knife')&&s.owned.includes('neon'));
  assert.equal(s.owned.filter(id=>id==='neon').length,1);assert.deepEqual(s.stars,{'1':3});
});
test('armory transactions cannot overspend or double-charge',()=>{
  const s=defaultSave();assert.equal(purchase(s,'neon'),'insufficient');assert.equal(s.coins,0);s.coins=120;
  assert.equal(purchase(s,'neon'),'bought');assert.equal(s.coins,0);assert.equal(s.gun,'neon');assert.equal(purchase(s,'neon'),'equipped');
  assert.equal(s.owned.filter(id=>id==='neon').length,1);assert.equal(purchase(s,'unknown'),'unknown');assert.equal(purchase(s,'arrow'),'equipped');
});
test('storage is isolated, round-trips, and degrades safely when blocked',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');const data=new Map<string,string>();data.set('v1-save','keep me');
  try{
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
    const s=defaultSave();s.coins=54;saveSave(s);assert.equal(loadSave().coins,54);assert.equal(data.get('v1-save'),'keep me');assert.ok(data.has(SAVE_KEY));
    data.set(SAVE_KEY,'broken {');assert.deepEqual(loadSave(),defaultSave());
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('denied');}});
    assert.deepEqual(loadSave(),defaultSave());assert.doesNotThrow(()=>saveSave(s));
  }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
});
test('sound gracefully degrades without an AudioContext',()=>{
  const s=new Sfx();assert.doesNotThrow(()=>{s.unlock();s.play('fire');s.thud();s.setMuted(true);s.suspend();s.destroy();});
});

test('sprite cache reuses art, evicts LRU entries and releases bitmap memory',()=>{
  const made:Surface[]=[];const cache=createSpriteCache(()=>{const s=createCanvas(1,1) as unknown as Surface;made.push(s);return s;},2048);
  let paints=0;const paint=()=>{paints++;};cache.get('a',16,16,paint);cache.get('a',16,16,paint);assert.equal(paints,1);
  cache.get('b',16,16,paint);assert.equal(cache.bytes,2048);cache.get('c',16,16,paint);assert.equal(cache.bytes,2048);assert.equal(made[0].width,1);
  cache.get('oversized',64,64,paint);assert.ok(cache.bytes<=2048);cache.clear();assert.equal(cache.bytes,0);
});
test('cached renderer handles a whole campaign within its 24 MiB budget',()=>{
  const cache=createSpriteCache(()=>createCanvas(1,1) as unknown as Surface);
  const canvas=createCanvas(GW,GH),ctx=canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  for(let n=1;n<=30;n++){draw(ctx,fresh(n).scene,{cache});assert.equal(ctx.getImageData(240,360,1,1).data[3],255);assert.ok(cache.bytes<=24*1024*1024);}
  cache.clear();assert.equal(cache.bytes,0);
});

console.log('\nRendered proof / actual engine frames');
const outDir=process.argv[2]??'/tmp/psv2-full';mkdirSync(outDir,{recursive:true});
const canvas=createCanvas(GW,GH),ctx=canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
function frame(name:string,g:Game,home=false):void {
  draw(ctx,g.scene,{home,best:14250});writeFileSync(`${outDir}/${name}.png`,canvas.toBuffer('image/png'));
}
test('renders every target, launcher, outcome and in-flight projectile',()=>{
  const home=fresh();advance(home,1.2);frame('01-home-arena',home,true);
  const g=fresh();advance(g,.4);frame('02-play',g);
  g.fire();advance(g,g.flight*.5);frame('03-flight',g);
  const mid=fresh(3);mid.setWeapon('arrow');for(let i=0;i<6;i++)cleanShot(mid);frame('04-combo',mid);
  shotAt(mid,mid.scene.stuck[0].angle);frame('05-lost-life',mid);
  const win=fresh();clearLevel(win);advance(win,.55);frame('06-perfect-burst',win);
  const boss=fresh(10);boss.setWeapon('nova');advance(boss,.7);frame('07-boss',boss);
  const disco=fresh(16);disco.setWeapon('neon');advance(disco,.6);frame('08-disco',disco);
  const mars=fresh(22);mars.setWeapon('plasma');advance(mars,.4);frame('09-martian',mars);
  const pearl=fresh(19);pearl.setWeapon('diamond');advance(pearl,.5);frame('10-diamond',pearl);
  const ufo=fresh(25);ufo.setWeapon('disc');advance(ufo,.5);frame('11-ufo',ufo);
  const end=fresh();for(let i=0;i<3;i++)shotAt(end,end.scene.stuck[0].angle);advance(end,.8);frame('12-game-over',end);
  for(let n=1;n<=30;n++){const g=fresh(n);draw(ctx,g.scene);assert.equal(ctx.getImageData(240,360,1,1).data[3],255);}
  for(const w of WEAPONS){const g=new Game(w.id,{intro:false});g.fire();advance(g,g.flight/2);draw(ctx,g.scene);}
});

// Visual QA sheets are not runtime assets and never go in the ZIP.
const atlas=createCanvas(1200,1440),ac=atlas.getContext('2d') as unknown as CanvasRenderingContext2D;
ac.fillStyle='#0b1728';ac.fillRect(0,0,1200,1440);
for(let i=0;i<30;i++){const l=levelConfig(i+1),x=(i%5)*240+120,y=Math.floor(i/5)*240+109;ac.save();ac.translate(x,y);drawTarget(ac,l.target,85,l.n);ac.restore();label(ac,`${i+1}. ${l.name}`,x,y+108,12,'#d4e7db');}
writeFileSync(`${outDir}/targets-qa.png`,atlas.toBuffer('image/png'));
const guns=createCanvas(1200,560),gc=guns.getContext('2d') as unknown as CanvasRenderingContext2D;
gc.fillStyle='#0b1728';gc.fillRect(0,0,1200,560);
WEAPONS.forEach((w,i)=>{const x=(i%5)*240+120,y=Math.floor(i/5)*280+165;gc.save();gc.translate(x,y);drawLauncher(gc,w);gc.restore();label(gc,w.name,x,y+86,13,'#d4e7db');});
writeFileSync(`${outDir}/armory-qa.png`,guns.toBuffer('image/png'));
console.log(`  Frames: ${outDir}`);
console.log(`\n${passed} passed / ${failed} failed`);
if(failed)process.exitCode=1;
