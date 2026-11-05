import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { initialAppVersion } from '../src/appVersion';
import { Game, angleDelta, multiplier } from '../v2-perfect-shot/src/game';
import { CAMPAIGN, levelConfig, speedAt } from '../v2-perfect-shot/src/levels';
import { defaultSave, normaliseSave, purchase, SAVE_KEY } from '../v2-perfect-shot/src/persist';
import { WEAPONS } from '../v2-perfect-shot/src/weapons';

const read=(p:string)=>readFileSync(path.join(process.cwd(),p),'utf8');
const tick=(g:Game,seconds:number)=>{for(let t=0;t<seconds;t+=1/120)g.update(1/120);};
function hit(g:Game,angle:number):void {
  tick(g,Math.max(g.scene.intro,g.scene.cooldown,g.scene.hurt)+.02);g.spinAt=()=>0;g.scene.rot=Math.PI/2-angle;
  assert.equal(g.fire(),true);tick(g,.18);
}

test('v1 remains default: no saved v2 choice; only explicit ?v=2 opts in',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
  try{
    for(const [search,expected] of [['','v1'],['?v=2','v2'],['?v=1','v1'],['?v=unknown','v1']] as const){
      Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{search}}});assert.equal(initialAppVersion(),expected);
    }
  }finally{if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');}
});

test('v2 shell is lazy, boot-gated, and freezes v1 only when v2 is selected',()=>{
  const app=read('src/App.tsx');
  assert.match(app,/const PerfectShotV2 = lazy\(\(\) => import\('\.\/components\/PerfectShotV2'\)\)/);
  assert.match(app,/hasBooted && appVersion === 'v2'/);
  assert.match(app,/if \(appVersion === 'v2'\) \{[\s\S]*?setHasBooted\(true\)/,'direct v2 URL must open the boot gate');
  assert.match(app,/active=\{pageVisible && !loading && appVersion === 'v1'\}/);
  assert.match(app,/if \(appVersion === 'v2'\) return;/,'do not start v1 audio behind v2');
});

test('in-app v2 and ZIP use the same complete shell; taps reach the native canvas',()=>{
  const host=read('src/components/PerfectShotV2.tsx'),main=read('v2-perfect-shot/src/main.ts');
  assert.match(host,/v2-perfect-shot\/src\/ui\/arcade/);assert.match(main,/createArcade/);
  assert.match(host,/onPointerDown=\{/);assert.doesNotMatch(host,/onPointerDownCapture=\{/);
  assert.match(host,/href="\.\/perfect-shot-v2\.zip"/);assert.match(host,/aria-label="Unduh ZIP v2"/);
  assert.match(host,/arcade\.destroy\(\)/);assert.match(host,/setActive\(active\)/);
});

test('v2 source is standalone and never imports v1 game code',()=>{
  const visit=(dir:string):void=>{
    for(const item of readdirSync(dir,{withFileTypes:true})){
      const p=path.join(dir,item.name);if(item.isDirectory())visit(p);
      else if(/\.ts$/.test(p))assert.doesNotMatch(readFileSync(p,'utf8'),/from\s+['"][^'"]*(?:src\/games|\.\.\/\.\.\/\.\.\/src)/,p);
    }
  };
  visit(path.join(process.cwd(),'v2-perfect-shot/src'));assert.equal(SAVE_KEY,'perfect-shot.v2.save');
});

test('v2 has a complete 30-stage campaign, three bosses and five distinct patterns',()=>{
  assert.equal(CAMPAIGN,30);const levels=Array.from({length:30},(_,i)=>levelConfig(i+1));
  assert.equal(new Set(levels.map(l=>l.pattern)).size,5);assert.deepEqual(levels.filter(l=>l.boss).map(l=>l.n),[10,20,30]);
  assert.ok(new Set(levels.map(l=>l.target)).size>=25);assert.equal(levelConfig(31).lap,2);
  assert.ok(speedAt(levelConfig(10),3)<0);assert.equal(speedAt(levelConfig(10),4.3),0);assert.ok(levelConfig(31).base>levelConfig(1).base);
});

test('collisions cost a heart first, and three collisions end the run only once',()=>{
  const g=new Game('knife',{intro:false});const angle=g.scene.stuck[0].angle;
  hit(g,angle);assert.equal(g.scene.status,'play');assert.equal(g.scene.lives,2);assert.equal(g.scene.hits,0);
  hit(g,angle);hit(g,angle);assert.equal(g.scene.status,'lose');assert.equal(g.scene.lives,0);
  assert.equal(g.takeEvents().filter(e=>e.type==='gameover').length,1);assert.deepEqual(g.takeEvents(),[]);
});

test('clears advance levels without discarding score, coins, hearts or combo',()=>{
  const g=new Game('knife',{intro:false});
  for(let i=0;i<10;i++){
    let angle:number|undefined;for(let a=0;a<Math.PI*2;a+=.02)if(g.scene.stuck.every(k=>Math.abs(angleDelta(a,k.angle))>.3)){angle=a;break;}
    assert.notEqual(angle,undefined);hit(g,angle!);
  }
  assert.equal(g.scene.status,'win');assert.equal(g.scene.reward?.perfect,true);assert.equal(g.scene.reward?.stars,3);tick(g,1.5);
  const {score,runCoins,lives,combo}=g.scene;assert.equal(g.nextLevel(),true);assert.equal(g.scene.level.n,2);
  assert.equal(g.scene.score,score);assert.equal(g.scene.runCoins,runCoins);assert.equal(g.scene.lives,lives);assert.equal(g.scene.combo,combo);assert.equal(g.scene.hits,0);assert.equal(multiplier(100),4);
});

test('armory has 3 free guns and real coin unlocks; no double-spending',()=>{
  assert.equal(WEAPONS.length,10);assert.equal(WEAPONS.filter(w=>w.price===0).length,3);
  assert.deepEqual(WEAPONS.filter(w=>w.shape==='diamond').map(w=>w.id),['diamond']);
  const save=defaultSave();assert.equal(purchase(save,'neon'),'insufficient');save.coins=120;assert.equal(purchase(save,'neon'),'bought');
  assert.equal(save.coins,0);assert.equal(purchase(save,'neon'),'equipped');assert.equal(save.owned.filter(w=>w==='neon').length,1);
});

test('corrupt/partial saves cannot remove free guns or equip an unowned gun',()=>{
  assert.deepEqual(normaliseSave(null),defaultSave());const save=normaliseSave({v:1,coins:-500,owned:['unknown'],gun:'nova',bestLevel:NaN});
  assert.equal(save.coins,0);assert.equal(save.gun,'knife');assert.equal(save.owned.length,3);assert.equal(save.bestLevel,1);
});
