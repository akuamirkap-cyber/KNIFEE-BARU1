/**
 * Boots the REAL standalone page on a small DOM (linkedom) + real Skia canvases.
 * Exercises pointer/keyboard input, pause, rewards, next level, shop, map, saves
 * and teardown. No browser binary, network, or production test hooks required.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { parseHTML } from 'linkedom';
import { angleDelta, type Game } from './src/game';
import { SAVE_KEY } from './src/persist';

const out=process.argv[2]??'/tmp/psv2-smoke';mkdirSync(out,{recursive:true});
const {window,document}=parseHTML('<!doctype html><html><body><div id="app"></div></body></html>');
const backings=new WeakMap<HTMLCanvasElement,Canvas>();
let hidden=false,focused:Element|null=null,now=0,sequence=0;
const callbacks=new Map<number,FrameRequestCallback>();
const storage=new Map<string,string>([['v1-save','untouched']]);
const local={getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v);},removeItem:(k:string)=>{storage.delete(k);}};
const raf=(cb:FrameRequestCallback)=>{const id=++sequence;callbacks.set(id,cb);return id;};
const cancel=(id:number)=>{callbacks.delete(id);};
function backing(el:HTMLCanvasElement):Canvas {
  let c=backings.get(el);
  if(!c){
    c=createCanvas(el.width||300,el.height||150);backings.set(el,c);
    // Canvas sprites in the real driver are DOM elements. Skia needs the actual
    // backing canvas, exactly the bridge a browser supplies natively.
    const ctx=c.getContext('2d'),original=ctx.drawImage;
    ctx.drawImage=function(image: unknown,...args: number[]){
      return Reflect.apply(original,ctx,[backings.get(image as HTMLCanvasElement)??image,...args]);
    };
  }
  return c;
}
Object.defineProperties(window.HTMLCanvasElement.prototype,{
  width:{configurable:true,get(){return Number(this.getAttribute('width'))||300;},set(v:number){this.setAttribute('width',String(v));const c=backings.get(this);if(c)c.width=v;}},
  height:{configurable:true,get(){return Number(this.getAttribute('height'))||150;},set(v:number){this.setAttribute('height',String(v));const c=backings.get(this);if(c)c.height=v;}},
  getContext:{configurable:true,value(this:HTMLCanvasElement,type:string){return type==='2d'?backing(this).getContext('2d'):null;}},
  getBoundingClientRect:{configurable:true,value(){return {x:0,y:0,left:0,top:0,right:480,bottom:960,width:480,height:960};}},
});
Object.defineProperties(window.HTMLElement.prototype,{
  clientWidth:{configurable:true,get(){return 480;}},clientHeight:{configurable:true,get(){return 960;}},
  focus:{configurable:true,value(){focused=this;}},blur:{configurable:true,value(){if(focused===this)focused=null;}},
});
Object.defineProperties(document,{
  hidden:{configurable:true,get:()=>hidden},visibilityState:{configurable:true,get:()=>hidden?'hidden':'visible'},activeElement:{configurable:true,get:()=>focused},
});
Object.assign(window,{devicePixelRatio:1,requestAnimationFrame:raf,cancelAnimationFrame:cancel,matchMedia:()=>({matches:false}),localStorage:local});
Object.assign(globalThis,{window,document,localStorage:local,requestAnimationFrame:raf,cancelAnimationFrame:cancel});

let passed=0;
function check(name:string,fn:()=>void):void {fn();passed++;console.log(`  ok  ${name}`);}
function step(frames:number):void {
  for(let i=0;i<frames;i++){now+=1000/60;const jobs=[...callbacks.values()];callbacks.clear();for(const cb of jobs)cb(now);}
}
function click(selector:string):void {
  const el=document.querySelector<HTMLElement>(selector);assert.ok(el,`Missing ${selector}`);
  assert.ok(!(el as HTMLButtonElement).disabled,`Disabled ${selector}`);
  el.dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));
}
function key(code:string,repeat=false):void {
  const event=new window.Event('keydown',{bubbles:true,cancelable:true});Object.assign(event,{code,key:code==='Escape'?'Escape':code,repeat});window.dispatchEvent(event);
}
function tap():void {
  const event=new window.Event('pointerdown',{bubbles:true,cancelable:true});Object.assign(event,{isPrimary:true});
  document.querySelector('.ps-board')!.dispatchEvent(event);
}
function aim(g:Game):void {
  // The proof tests the spin. The smoke holds the wheel to make UI sequences
  // reproducible and collect all three visible bonus tokens on each stage.
  g.spinAt=()=>0;
  const token=g.scene.tokens.find(t=>!t.collected&&g.scene.stuck.every(k=>Math.abs(angleDelta(k.angle,t.angle))>.3));
  let angle=token?.angle;
  if(angle===undefined)for(let a=0;a<Math.PI*2;a+=.02)if(g.scene.stuck.every(k=>Math.abs(angleDelta(k.angle,a))>.3)){angle=a;break;}
  assert.notEqual(angle,undefined);g.scene.rot=Math.PI/2-angle!;
}
function finishLevel(g:Game):void {
  step(85);
  while(g.scene.status==='play'){aim(g);tap();step(21);}
  assert.equal(g.scene.status,'win');step(90);
}

console.log('Perfect Shot v2 / real shell smoke');
const {arcade}=await import('./src/main');
const root=document.getElementById('app')!;
let second:ReturnType<typeof import('./src/ui/arcade')['createArcade']>|undefined;
try{
  check('boots complete home, not the old demo',()=>{
    assert.equal(arcade.screen,'home');assert.equal(root.dataset.view,'home');assert.equal(root.querySelector('[data-ui="home"]')?.hasAttribute('hidden'),false);
    assert.equal(arcade.profile.owned.length,3);assert.equal(callbacks.size,1);
  });
  step(20);writeFileSync(`${out}/01-home-arena.png`,backing(root.querySelector<HTMLCanvasElement>('.ps-board')!).toBuffer('image/png'));
  check('start opens a run, gives 3 lives and an intro',()=>{click('[data-action="start"]');assert.equal(arcade.screen,'play');assert.equal(arcade.game.scene.lives,3);assert.ok(arcade.game.scene.intro>0);});
  step(85);const g=arcade.game;
  check('a real pointer event fires, lands and credits the wallet',()=>{
    aim(g);tap();step(21);assert.equal(g.scene.hits,1);assert.equal(arcade.profile.coins,6);assert.equal(arcade.profile.hits,1);
  });
  check('Space fires once; repeated keydown does not auto-fire',()=>{
    aim(g);key('Space');key('Space',true);step(21);assert.equal(g.scene.hits,2);
  });
  check('the accessible fire button uses the same engine',()=>{
    aim(g);click('[data-action="fire"]');step(21);assert.equal(g.scene.hits,3);
  });
  writeFileSync(`${out}/02-mid-run.png`,backing(root.querySelector<HTMLCanvasElement>('.ps-board')!).toBuffer('image/png'));
  check('pause freezes simulation, Escape resumes without a huge dt',()=>{
    click('[data-action="pause"]');const t=g.scene.time;step(120);assert.equal(arcade.screen,'pause');assert.equal(g.scene.time,t);assert.equal(callbacks.size,0);
    key('Escape');assert.equal(arcade.screen,'play');step(1);assert.ok(g.scene.time-t<.05);
  });
  check('host inactivity auto-pauses and does not silently resume a run',()=>{
    arcade.setActive(false);assert.equal(arcade.screen,'pause');const t=g.scene.time;step(60);assert.equal(g.scene.time,t);
    arcade.setActive(true);assert.equal(arcade.screen,'pause');click('[data-action="resume"]');assert.equal(arcade.screen,'play');
  });
  check('background visibility also pauses safely',()=>{
    hidden=true;document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(arcade.screen,'pause');assert.equal(callbacks.size,0);
    hidden=false;document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(arcade.screen,'pause');click('[data-action="resume"]');
  });
  check('armory lists 10 real previews; unaffordable purchase is disabled',()=>{
    click('[data-action="pause"]');click('[data-panel="pause"] [data-action="armory"]');assert.equal(arcade.screen,'armory');
    assert.equal(root.querySelectorAll('[data-preview]').length,10);click('[data-weapon="neon"]');
    assert.equal((root.querySelector('[data-ui="equip"]') as HTMLButtonElement).disabled,true);
    const before=g.scene.hits;key('Space');step(25);assert.equal(g.scene.hits,before);
  });
  check('equipping an owned weapon preserves the run and saves the choice',()=>{
    click('[data-weapon="bullet"]');click('[data-action="equip"]');assert.equal(g.scene.weapon.id,'bullet');assert.equal(arcade.profile.gun,'bullet');assert.equal(g.scene.hits,3);
    click('[data-panel="armory"] [data-action="back"]');assert.equal(arcade.screen,'pause');click('[data-action="resume"]');
  });
  check('a life loss is recoverable, not an instant gameover',()=>{
    step(50);g.spinAt=()=>0;g.scene.rot=Math.PI/2-g.scene.stuck[0].angle;tap();step(20);
    assert.equal(g.scene.lives,2);assert.equal(g.scene.status,'play');assert.equal(arcade.screen,'play');step(50);
  });
  check('clear shows a reward screen once and unlocks the next level',()=>{
    finishLevel(g);assert.equal(arcade.screen,'result');assert.equal(arcade.profile.bestLevel,2);assert.equal(arcade.profile.stars['1'],2);
    assert.ok(root.querySelector('[data-action="next"]'));assert.equal(arcade.profile.cleared,1);
    const coins=arcade.profile.coins;step(120);assert.equal(arcade.profile.coins,coins);assert.equal(arcade.profile.cleared,1);
  });
  check('next level carries score and lives, then awards PERFECT',()=>{
    const score=g.scene.score;click('[data-action="next"]');assert.equal(arcade.screen,'play');assert.equal(g.scene.level.n,2);assert.equal(g.scene.lives,2);assert.equal(g.scene.score,score);
    finishLevel(g);assert.equal(arcade.screen,'result');assert.equal(arcade.profile.bestLevel,3);assert.equal(arcade.profile.stars['2'],3);assert.equal(arcade.profile.perfects,1);
  });
  check('earned coins buy a gun exactly once and it equips immediately',()=>{
    assert.ok(arcade.profile.coins>=120);click('[data-panel="result"] [data-action="armory"]');click('[data-weapon="neon"]');const before=arcade.profile.coins;
    click('[data-action="equip"]');assert.equal(arcade.profile.coins,before-120);assert.equal(arcade.profile.gun,'neon');assert.equal(g.scene.weapon.id,'neon');
    assert.equal((root.querySelector('[data-ui="equip"]') as HTMLButtonElement).disabled,true);assert.ok(JSON.parse(storage.get(SAVE_KEY)!).owned.includes('neon'));
    click('[data-panel="armory"] [data-action="back"]');assert.equal(arcade.screen,'result');
  });
  check('campaign map has 30 targets, ratings and genuinely locked nodes',()=>{
    click('[data-panel="result"] [data-action="home"]');click('[data-action="map"]');assert.equal(arcade.screen,'map');assert.equal(root.querySelectorAll('[data-target-level]').length,30);
    assert.equal((root.querySelector('[data-level="3"]') as HTMLButtonElement).disabled,false);
    assert.equal((root.querySelector('[data-level="4"]') as HTMLButtonElement).disabled,true);
  });
  check('replaying an unlocked level starts a fresh run without losing wallet',()=>{
    const coins=arcade.profile.coins;click('[data-level="2"]');assert.equal(arcade.screen,'play');assert.equal(g.scene.level.n,2);assert.equal(g.scene.score,0);assert.equal(g.scene.lives,3);assert.equal(arcade.profile.coins,coins);
  });
  check('mute setting and aria label persist',()=>{
    key('KeyM');assert.equal(arcade.profile.muted,true);assert.equal(root.querySelector('[data-action="sound"]')?.getAttribute('aria-pressed'),'false');
    assert.equal(JSON.parse(storage.get(SAVE_KEY)!).muted,true);
  });
  check('records and how-to screens are navigable',()=>{
    click('[data-action="pause"]');click('[data-panel="pause"] [data-action="home"]');click('[data-action="records"]');assert.equal(arcade.screen,'records');assert.equal(root.querySelectorAll('.ps-badge-row').length,6);
    click('[data-panel="records"] [data-action="back"]');click('[data-action="help"]');assert.equal(arcade.screen,'help');assert.equal(root.querySelectorAll('.ps-rule').length,5);arcade.back();assert.equal(arcade.screen,'home');
  });
  check('teardown cancels rAF and removes the entire scoped shell',()=>{
    arcade.destroy();assert.equal(callbacks.size,0);assert.equal(root.children.length,0);assert.equal(root.classList.contains('ps-v2'),false);assert.equal(storage.get('v1-save'),'untouched');
  });
  const {createArcade}=await import('./src/ui/arcade');second=createArcade(root);
  check('re-mount restores gun, coins, level, stars and mute',()=>{
    assert.equal(second!.screen,'home');assert.equal(second!.profile.gun,'neon');assert.equal(second!.profile.bestLevel,3);assert.equal(second!.profile.muted,true);assert.equal(second!.profile.stars['1'],2);assert.equal(second!.profile.stars['2'],3);
  });
  check('host deactivation stops menu animation too',()=>{
    second!.setActive(false);assert.equal(callbacks.size,0);second!.setActive(true);assert.equal(callbacks.size,1);
  });
  second.destroy();second=undefined;
  check('blocked storage does not prevent the real page from booting',()=>{
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Storage blocked');}});
    second=createArcade(root);assert.equal(second.screen,'home');assert.equal(second.profile.coins,0);assert.equal(second.profile.owned.length,3);second.destroy();second=undefined;
  });
  console.log(`\n${passed} shell checks passed / frames: ${out}`);
}finally{arcade.destroy();second?.destroy();}
