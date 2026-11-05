/**
 * Shared full-game shell for both the standalone ZIP and the React host.
 * No React dependency, no network requests, and no duplicate gameplay UI.
 */
import { Sfx } from '../audio';
import { GH, GW } from '../config';
import { Game, type GameEvent, type Outcome } from '../game';
import { CAMPAIGN, levelConfig } from '../levels';
import { loadSave, purchase, saveSave, type SaveData } from '../persist';
import { mount, type Mounted } from '../render/attach';
import { drawLauncher, drawTarget } from '../render/draw';
import { WEAPONS, weaponById, type Weapon } from '../weapons';
import { icon, type IconName } from './icons';
import { STYLES } from './styles';

export type Screen = 'home' | 'play' | 'pause' | 'result' | 'armory' | 'map' | 'help' | 'records';
export interface ArcadeOptions { active?: boolean }
export interface Arcade {
  readonly game: Game;
  readonly profile: SaveData;
  readonly screen: Screen;
  setActive(active: boolean): void;
  /** Returns false only on the home screen, where a native host can exit. */
  back(): boolean;
  destroy(): void;
}
let instance = 0;
const num = (n: number) => n.toLocaleString('en-US');
const smallNum = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}m` : n >= 10_000 ? `${(n/1_000).toFixed(1)}k` : num(n);
const closeButton = () => `<button type="button" class="ps-icon-button" data-action="back" aria-label="Kembali">${icon('close')}</button>`;
const head = (eyebrow: string, title: string, id: string) => `<div class="ps-sheet-head"><div><div class="ps-eyebrow">${eyebrow}</div><h2 id="${id}">${title}</h2></div>${closeButton()}</div>`;

export function createArcade(root: HTMLElement, opts: ArcadeOptions = {}): Arcade {
  const id = `ps-v2-${++instance}`;
  const save = loadSave();
  const sound = new Sfx();sound.setMuted(save.muted);
  const game = new Game(save.gun,{ level: save.bestLevel, intro: false });
  let view: Screen = 'home', modalReturn: Screen = 'home', boardHome = true;
  let active = opts.active !== false, disposed = false, selected = save.gun, runPreviousBest = save.best;
  let driver: Mounted;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  root.classList.add('ps-v2');
  root.innerHTML = `<style>${STYLES}</style>
    <div class="ps-stage">
      <canvas class="ps-board" width="480" height="960" tabindex="0" aria-label="Arena Perfect Shot. Sentuh atau tekan Space untuk menembak."></canvas>
      <header class="ps-topbar">
        <div class="ps-brand"><span class="ps-brand-mark">${icon('target')}</span><div><strong>PERFECT SHOT</strong><small>FULL ARCADE · V2</small></div></div>
        <div class="ps-wallet" aria-label="Saldo koin">${icon('coin')}<span data-ui="wallet">0</span></div>
        <button type="button" class="ps-icon-button" data-action="sound" aria-label="Matikan suara" aria-pressed="true">${icon('sound')}</button>
        <button type="button" class="ps-icon-button" data-action="pause" aria-label="Jeda permainan" hidden>${icon('pause')}</button>
      </header>
      <section class="ps-home" data-ui="home" aria-label="Menu utama">
        <div class="ps-hero"><div class="ps-eyebrow">FIND YOUR PERFECT MOMENT</div><h1>PERFECT<span>SHOT.</span></h1><p>Satu celah. Satu tembakan.</p></div>
        <div class="ps-home-bottom">
          <div class="ps-stat-row">
            <div class="ps-mini-stat"><small>REKOR</small><strong data-ui="home-best">0</strong></div>
            <div class="ps-mini-stat"><small>LEVEL TERBUKA</small><strong data-ui="home-level">01</strong></div>
            <div class="ps-mini-stat"><small>ARMORY</small><strong data-ui="home-owned">3</strong><em>/ 10</em></div>
          </div>
          <button type="button" class="ps-primary" data-action="start" data-autofocus>${icon('play')}<span>MAIN SEKARANG<small data-ui="start-note">Level 01 · Orange Grove</small></span>${icon('arrow','ps-arrow')}</button>
          <div class="ps-home-actions">
            <button type="button" class="ps-secondary" data-action="armory">${icon('armory')}ARMORY</button>
            <button type="button" class="ps-secondary" data-action="map">${icon('map')}PETA LEVEL</button>
          </div>
          <div class="ps-home-links">
            <button type="button" class="ps-text-button" data-action="help">${icon('info')}Cara main</button>
            <button type="button" class="ps-text-button" data-action="records">${icon('trophy')}Rekor & badge</button>
          </div>
          <button type="button" class="ps-text-button" style="margin:12px auto 0" data-action="fresh" data-ui="fresh" hidden>${icon('retry')}Run baru dari level 1</button>
          <p class="ps-home-foot">3 NYAWA · 10 HIT UNTUK CLEAR<br>PROGRES TERSIMPAN DI PERANGKAT INI</p>
        </div>
      </section>
      <div class="ps-play-ui" data-ui="play" hidden><button type="button" class="ps-fire-button" data-action="fire">SENTUH UNTUK MENEMBAK<small>atau <kbd>SPACE</kbd> / <kbd>↑</kbd> · <kbd>P</kbd> jeda</small></button></div>
      <section class="ps-overlay" data-panel="result" role="dialog" aria-modal="true" aria-labelledby="${id}-result" hidden><div class="ps-panel" data-ui="result"></div></section>
      <section class="ps-overlay" data-panel="pause" role="dialog" aria-modal="true" aria-labelledby="${id}-pause" hidden>
        <div class="ps-panel"><div class="ps-pause-body">
          <div class="ps-medal">${icon('pause')}</div><div class="ps-eyebrow">TARIK NAPAS SEBENTAR</div><h2 id="${id}-pause">GAME DIJEDA</h2>
          <p>Target menunggu. Lanjutkan saat kamu siap.<br>Kembali ke menu mengakhiri run, bukan progresmu.</p>
          <div class="ps-pause-actions">
            <button type="button" class="ps-primary" data-action="resume" data-autofocus>${icon('play')}<span>LANJUTKAN</span>${icon('arrow','ps-arrow')}</button>
            <button type="button" class="ps-secondary" data-action="armory">${icon('armory')}GANTI SENJATA</button>
            <button type="button" class="ps-secondary" data-action="home">${icon('home')}MENU UTAMA</button>
          </div>
          <div class="ps-inline-actions"><button type="button" class="ps-text-button" data-action="help">${icon('info')}Cara main</button></div>
        </div></div>
      </section>
      <section class="ps-overlay" data-panel="armory" role="dialog" aria-modal="true" aria-labelledby="${id}-armory" hidden>
        <div class="ps-panel ps-panel-tall">${head('10 WEAPONS · 10 DIFFERENT RHYTHMS','ARMORY',`${id}-armory`)}
          <div class="ps-scroll">
            <div class="ps-armory-hero"><canvas data-ui="weapon-hero" width="240" height="240" aria-hidden="true"></canvas><div class="ps-armory-info"><span class="ps-rarity" data-ui="rarity">CLASSIC</span><h3 data-ui="weapon-name"></h3><p data-ui="weapon-note"></p><small data-ui="weapon-speed"></small></div></div>
            <div class="ps-section-label"><span>KOLEKSI SENJATA</span><span data-ui="owned-count">3 / 10</span></div>
            <div class="ps-shop-grid" data-ui="shop-grid"></div>
            <p class="ps-shop-note">Semua laras lurus ke target. Pilih cooldown yang cocok dengan iramamu.<br>Koin didapat dari hit, token, dan level clear. Tidak ada pembelian uang asli.</p>
          </div>
          <div class="ps-panel-foot"><button type="button" class="ps-primary" data-action="equip" data-ui="equip"></button></div>
        </div>
      </section>
      <section class="ps-overlay" data-panel="map" role="dialog" aria-modal="true" aria-labelledby="${id}-map" hidden>
        <div class="ps-panel ps-panel-tall">${head('30 LEVEL · 5 ATMOSFER · 3 BOSS','PETA LEVEL',`${id}-map`)}
          <div class="ps-scroll" data-ui="map-body"></div>
          <div class="ps-panel-foot ps-map-foot">Pilih level terbuka untuk memulai run baru.<br>Lewati level 30 untuk masuk lap berikutnya yang lebih cepat.</div>
        </div>
      </section>
      <section class="ps-overlay" data-panel="help" role="dialog" aria-modal="true" aria-labelledby="${id}-help" hidden>
        <div class="ps-panel">${head('SIMPLE TO PLAY. HARD TO PERFECT.','CARA MAIN',`${id}-help`)}
          <div class="ps-scroll">
            <p class="ps-howto-lead">Tembak ke celah kosong.<br>Jangan mengenai proyektil yang sudah tertancap.</p>
            ${rule('target','10 hit, satu level','Setiap tembakan bersih mengisi satu bar. Sepuluh hit menghancurkan target dan membuka level berikutnya.')}
            ${rule('heart','Tiga kesempatan','Tabrakan mengurangi satu nyawa dan memutus combo. Boss clear mengembalikan satu nyawa, maksimal tiga.')}
            ${rule('bolt','Jaga combo','Hit beruntun menaikkan pengali skor hingga ×4. Clear tanpa tabrakan memberi bonus PERFECT dan tiga bintang.')}
            ${rule('coin','Bidik token emas','Token berputar di tepian target. Mengenainya memberi +5 koin dan bonus skor. Belanjakan hasilmu di Armory.')}
            ${rule('map','Baca putarannya','Target bisa melambat, berbalik, atau berhenti. Boss punya siklus palsu: cepat, rem, reverse, freeze, lalu jitter.')}
            <div class="ps-control-help"><span><kbd>SPACE</kbd> / <kbd>↑</kbd> tembak</span><span><kbd>P</kbd> / <kbd>ESC</kbd> jeda</span><span><kbd>M</kbd> suara</span></div>
          </div><div class="ps-panel-foot"><button type="button" class="ps-primary" data-action="back">MENGERTI${icon('check')}</button></div>
        </div>
      </section>
      <section class="ps-overlay" data-panel="records" role="dialog" aria-modal="true" aria-labelledby="${id}-records" hidden>
        <div class="ps-panel">${head('YOUR PERSONAL ARCADE','REKOR & BADGE',`${id}-records`)}<div class="ps-scroll" data-ui="records"></div></div>
      </section>
      <div class="ps-toast" data-ui="toast" hidden></div>
      <div class="ps-sr-only" role="status" aria-live="polite" data-ui="announce"></div>
    </div>`;

  function el<T extends HTMLElement = HTMLElement>(name: string): T {
    const result = root.querySelector<T>(`[data-ui="${name}"]`);
    if (!result) throw new Error(`perfect-shot-v2: missing UI ${name}`);
    return result;
  }
  const canvas = root.querySelector<HTMLCanvasElement>('.ps-board')!;
  const stage = root.querySelector<HTMLElement>('.ps-stage')!;
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  const pauseButton = root.querySelector<HTMLButtonElement>('[data-action="pause"]')!;
  const soundButton = root.querySelector<HTMLButtonElement>('[data-action="sound"]')!;

  function refresh(): void {
    el('wallet').textContent = smallNum(save.coins);
    el('wallet').parentElement?.setAttribute('aria-label',`Saldo ${num(save.coins)} koin`);
    el('home-best').textContent = smallNum(save.best);
    el('home-level').textContent = String(save.bestLevel).padStart(2,'0');
    el('home-owned').textContent = String(save.owned.length);
    el('start-note').textContent = `Level ${String(save.bestLevel).padStart(2,'0')} · ${levelConfig(save.bestLevel).name}`;
    el('fresh').hidden = save.bestLevel <= 1;
    soundButton.innerHTML = icon(save.muted?'muted':'sound');
    soundButton.setAttribute('aria-label',save.muted?'Aktifkan suara':'Matikan suara');
    soundButton.setAttribute('aria-pressed',String(!save.muted));
    canvas.setAttribute('aria-label',`Arena Perfect Shot. Level ${game.scene.level.n}, ${game.scene.hits} dari 10 hit, ${game.scene.lives} nyawa. Sentuh atau tekan Space untuk menembak.`);
  }
  function announce(text: string): void { el('announce').textContent = text; }
  function toast(text: string): void {
    if (toastTimer !== undefined) clearTimeout(toastTimer);
    el('toast').textContent = text;el('toast').hidden = false;announce(text);
    toastTimer = setTimeout(()=>{ if (!disposed) el('toast').hidden = true; },2300);
  }
  function commit(): void { saveSave(save);refresh(); }

  function syncLoop(): void {
    if (disposed) return;
    if (active && !document.hidden && ['home','play','result'].includes(view)) driver.resume();
    else driver.pause();
    driver.paint();
  }
  function setView(next: Screen, focus = true): void {
    view = next;root.dataset.view = next;
    el('home').hidden = next !== 'home';el('play').hidden = next !== 'play';pauseButton.hidden = next !== 'play';
    for (const panel of panels) panel.hidden = panel.dataset.panel !== next;
    syncLoop();
    if (!focus) return;
    const panel = panels.find((p)=>!p.hidden);
    const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>('button:not(:disabled)')
      ?? (next==='home'?root.querySelector<HTMLElement>('[data-action="start"]'):canvas);
    target?.focus({ preventScroll: true });
  }
  function fitStage(): void {
    // clientWidth is in the host's coordinates. getBoundingClientRect already
    // includes ScaledFrame's transform and would scale the embedded game twice.
    const w = root.clientWidth || GW,h = root.clientHeight || GH;
    stage.style.transform = `translate(-50%, -50%) scale(${Math.min(w/GW,h/GH)})`;
    driver?.resize();
  }
  function start(level = save.bestLevel): void {
    sound.unlock();runPreviousBest = save.best;
    game.restart(save.gun,{ level: Math.min(save.bestLevel,Math.max(1,level)) });
    boardHome = false;refresh();setView('play');announce(`Level ${game.scene.level.n}. Sepuluh tembakan bersih untuk lanjut.`);
  }
  function home(): void {
    game.restart(save.gun,{ level: save.bestLevel, intro: false });game.takeEvents();
    boardHome = true;refresh();setView('home');
  }
  function pause(): void {
    if (view !== 'play') return;
    setView('pause');announce('Game dijeda.');
  }
  function open(next: 'armory' | 'map' | 'help' | 'records'): void {
    modalReturn = view;
    if (next==='armory') { selected = save.gun;renderShop(); }
    if (next==='map') renderMap();
    if (next==='records') renderRecords();
    setView(next);
  }
  function back(): boolean {
    if (view==='home') return false;
    if (view==='play') pause();
    else if (view==='pause') setView('play');
    else if (view==='result') home();
    else setView(modalReturn);
    return true;
  }
  function toggleSound(): void {
    save.muted = !save.muted;sound.setMuted(save.muted);sound.unlock();commit();
    if (!save.muted) sound.play('click');
    announce(save.muted?'Suara dimatikan.':'Suara diaktifkan.');
  }

  function onEvent(event: GameEvent): void {
    const s=game.scene;
    switch(event.type){
      case 'fire': sound.play('fire',event.weapon.shape==='bullet'?-.22:event.weapon.shape==='spark'?.35:0);break;
      case 'land':
        sound.play(event.combo%5===0?'combo':'land',Math.min(.3,event.combo*.012));sound.thud(.7);
        save.coins+=event.coins;save.hits+=1;save.maxCombo=Math.max(save.maxCombo,event.combo);save.best=Math.max(save.best,s.score);commit();break;
      case 'miss':
        sound.play('miss');sound.thud(1.1);refresh();announce(`Tabrakan. Sisa ${event.lives} nyawa.`);break;
      case 'clear': {
        sound.play(event.reward.perfect?'perfect':'clear');sound.thud(1.5);
        save.coins+=event.reward.coins;save.best=Math.max(save.best,s.score);save.bestLevel=Math.max(save.bestLevel,event.level+1);
        save.cleared+=1;if(event.reward.perfect)save.perfects+=1;
        const key=String((event.level-1)%CAMPAIGN+1);save.stars[key]=Math.max(save.stars[key]??0,event.reward.stars);commit();
        announce(`Level ${event.level} clear${event.reward.perfect?', PERFECT':''}. Bonus ${event.reward.coins} koin.`);break;
      }
      case 'gameover': sound.play('gameover');save.best=Math.max(save.best,s.score);commit();break;
      case 'level': sound.play('levelup');refresh();break;
    }
  }
  function finish(outcome: Outcome): void {
    renderResult(outcome);setView('result');game.clearOutcome();
  }

  function renderResult(outcome: Outcome): void {
    const s=game.scene,reward=s.reward,won=outcome==='win',newBest=s.score>runPreviousBest;
    el('result').innerHTML=`<div class="ps-result-body${won?'':' ps-failed'}">
      <div class="ps-medal">${icon(won?'trophy':'heart')}</div>
      <div class="ps-eyebrow">${won?`LEVEL ${String(s.level.n).padStart(2,'0')} COMPLETE`:'EVERY RUN MAKES YOU BETTER'}</div>
      <h2 id="${id}-result">${won?(reward?.perfect?'PERFECT CLEAR!':'LEVEL CLEAR!'):'COBA SEKALI LAGI?'}</h2>
      <p>${won?s.level.name:'Tiga nyawa habis. Koin, rekor, dan level terbuka tetap aman.'}${reward?.healed?'<br>Boss dikalahkan. +1 nyawa!':''}</p>
      ${won?`<div class="ps-stars" aria-label="${reward?.stars??1} bintang">${Array.from({length:3},(_,i)=>`<span${i<(reward?.stars??1)?'':' class="ps-empty-star"'}>★</span>`).join('')}</div><div class="ps-reward-strip"><span>${icon('coin')}+${reward?.coins??0} KOIN</span><span>${icon('bolt')}+${num(reward?.score??0)} SKOR</span></div>`:'<div style="height:22px"></div>'}
      <div class="ps-result-stats"><div><small>SKOR RUN</small><strong>${num(s.score)}</strong></div><div><small>${won?'SISA NYAWA':'COMBO TERBAIK'}</small><strong>${won?`${s.lives} / 3`:`${s.maxCombo}×`}</strong></div><div><small>KOIN RUN</small><strong>+${s.runCoins}</strong></div><div><small>HIT BERSIH</small><strong>${s.totalHits}</strong></div></div>
      ${newBest?'<div class="ps-new-best">✦ REKOR BARU!</div><div style="height:17px"></div>':''}
      <button type="button" class="ps-primary" data-action="${won?'next':'retry'}" data-autofocus>${icon(won?'arrow':'retry')}<span>${won?'LEVEL BERIKUTNYA':'MAIN LAGI'}<small>${won?levelConfig(s.level.n+1).name:`Mulai ulang level ${s.level.n} · 3 nyawa`}</small></span></button>
      <div class="ps-inline-actions"><button type="button" class="ps-text-button" data-action="armory">${icon('armory')}Armory</button><button type="button" class="ps-text-button" data-action="home">${icon('home')}Menu utama</button></div>
    </div>`;
  }

  function paintGun(canvas: HTMLCanvasElement,weapon: Weapon): void {
    const c=canvas.getContext('2d');if(!c)return;canvas.width=240;canvas.height=240;
    c.clearRect(0,0,240,240);c.save();c.translate(120,168);c.scale(1.1,1.1);drawLauncher(c,weapon);c.restore();
  }
  function renderShop(): void {
    const grid=el('shop-grid');
    if(!grid.children.length){
      grid.innerHTML=WEAPONS.map((w)=>`<button type="button" class="ps-item" data-action="inspect" data-weapon="${w.id}" aria-pressed="false" aria-label="Lihat ${w.name}"><canvas width="240" height="240" data-preview="${w.id}" aria-hidden="true"></canvas><strong>${w.name}</strong><small data-status="${w.id}"></small></button>`).join('');
      for(const c of grid.querySelectorAll<HTMLCanvasElement>('[data-preview]'))paintGun(c,weaponById(c.dataset.preview));
    }
    const w=weaponById(selected),owned=save.owned.includes(w.id),equipped=save.gun===w.id;
    paintGun(el<HTMLCanvasElement>('weapon-hero'),w);el('rarity').textContent=w.rarity;el('rarity').dataset.rarity=w.rarity;
    el('weapon-name').textContent=w.name;el('weapon-note').textContent=w.note;el('weapon-speed').textContent=`Jeda tembak ${w.cooldown.toFixed(2)} dtk`;
    el('owned-count').textContent=`${save.owned.length} / ${WEAPONS.length}`;
    for(const b of grid.querySelectorAll<HTMLButtonElement>('[data-weapon]')){
      const gun=weaponById(b.dataset.weapon),has=save.owned.includes(gun.id);
      b.classList.toggle('ps-locked',!has);b.classList.toggle('ps-equipped',save.gun===gun.id);b.setAttribute('aria-pressed',String(gun.id===selected));
      b.querySelector<HTMLElement>('[data-status]')!.innerHTML=save.gun===gun.id?'DIPAKAI':has?'DIMILIKI':`${icon('coin')}${num(gun.price)}`;
    }
    const button=el<HTMLButtonElement>('equip');button.disabled=equipped||(!owned&&save.coins<w.price);
    button.innerHTML=equipped?`${icon('check')}SUDAH DIPAKAI`:owned?`${icon('check')}GUNAKAN ${w.name.toUpperCase()}`:save.coins>=w.price?`${icon('coin')}BUKA · ${num(w.price)} KOIN`:`${icon('lock')}KURANG ${num(w.price-save.coins)} KOIN`;
    button.setAttribute('aria-label',equipped?`${w.name} sudah dipakai`:owned?`Gunakan ${w.name}`:`Beli ${w.name}, ${w.price} koin`);
  }
  function equip(): void {
    const result=purchase(save,selected);
    if(result==='insufficient'||result==='unknown')return;
    game.setWeapon(save.gun);commit();renderShop();driver.paint();
    toast(result==='bought'?`${weaponById(selected).name} terbuka!`:`${weaponById(selected).name} dipakai.`);
  }

  function renderMap(): void {
    const worlds=['TWILIGHT GARDEN','MIDNIGHT LEAGUE','WILD FRONTIER','EMBER ORBIT','FROZEN FINALE'];
    const total=Object.values(save.stars).reduce((a,b)=>a+b,0);
    el('map-body').innerHTML=`<div class="ps-map-progress"><div><span>${icon('star')} ${total} / 90 BINTANG</span><span>LAP ${Math.floor((save.bestLevel-1)/CAMPAIGN)+1}</span></div><div class="ps-progress-track"><span style="width:${total/90*100}%"></span></div></div>`+worlds.map((world,group)=>`<div class="ps-world"><div class="ps-world-head"><span>0${group+1} / ${world}</span><small>${group*6+1}—${(group+1)*6}</small></div><div class="ps-map-grid">${Array.from({length:6},(_,i)=>{
      const n=group*6+i+1,l=levelConfig(n),locked=n>save.bestLevel,rating=save.stars[String(n)]??0;
      return `<button type="button" class="ps-node${l.boss?' ps-boss':''}${n===Math.min(CAMPAIGN,save.bestLevel)?' ps-current':''}" data-action="level" data-level="${n}" ${locked?'disabled':''} title="${l.name}" aria-label="Level ${n}: ${l.name}${locked?', terkunci':`, ${rating} bintang`}"><canvas width="100" height="100" data-target-level="${n}" aria-hidden="true"></canvas>${locked?`<span class="ps-lock-mark">${icon('lock')}</span>`:''}<strong>${l.boss?'B':''}${String(n).padStart(2,'0')}</strong><small>${'★'.repeat(rating)}${'·'.repeat(3-rating)}</small></button>`;
    }).join('')}</div></div>`).join('');
    for(const canvas of el('map-body').querySelectorAll<HTMLCanvasElement>('[data-target-level]')){
      const level=levelConfig(Number(canvas.dataset.targetLevel)),c=canvas.getContext('2d');if(!c)continue;
      c.save();c.translate(50,50);drawTarget(c,level.target,44,level.n);c.restore();
    }
  }
  function renderRecords(): void {
    const records:[string,string][]=[['SKOR TERTINGGI',num(save.best)],['LEVEL TERBUKA',String(save.bestLevel)],['HIT BERSIH',num(save.hits)],['LEVEL CLEAR',num(save.cleared)],['PERFECT CLEAR',num(save.perfects)],['COMBO TERBAIK',`${save.maxCombo}×`]];
    const badges:[IconName,string,string,boolean][]=[
      ['target','First Clear','Selesaikan satu level.',save.cleared>0],
      ['star','Perfectionist','Raih tiga bintang pada satu level.',save.perfects>0],
      ['bolt','In the Zone','Capai combo 10 hit.',save.maxCombo>=10],
      ['trophy','Boss Breaker','Taklukkan boss pertama di level 10.',!!save.stars['10']],
      ['armory','Collector','Miliki lima senjata.',save.owned.length>=5],
      ['map','Full Circle','Selesaikan 30 level pertama.',!!save.stars['30']],
    ];
    el('records').innerHTML=`<div class="ps-record-grid">${records.map(([key,value])=>`<div class="ps-record"><small>${key}</small><strong>${value}</strong></div>`).join('')}</div><div class="ps-section-label"><span>BADGE KOLEKSI</span><span>${badges.filter((b)=>b[3]).length} / ${badges.length}</span></div>`+badges.map(([name,title,note,done])=>`<div class="ps-badge-row${done?'':' ps-badge-locked'}">${icon(name)}<div><strong>${title}</strong><small>${note}</small></div>${icon(done?'check':'lock')}</div>`).join('');
  }

  function onClick(event: Event): void {
    const target=event.target as Element|null;
    const button=target?.closest<HTMLElement>('[data-action]');
    if(!button||!root.contains(button)||(button as HTMLButtonElement).disabled)return;
    sound.unlock();if(button.dataset.action!=='fire'&&button.dataset.action!=='sound')sound.play('click');
    switch(button.dataset.action){
      case 'start':start();break;
      case 'fresh':start(1);break;
      case 'fire':driver.fire();break;
      case 'pause':pause();break;
      case 'resume':setView('play');break;
      case 'home':home();break;
      case 'back':back();break;
      case 'sound':toggleSound();break;
      case 'armory':open('armory');break;
      case 'map':open('map');break;
      case 'help':open('help');break;
      case 'records':open('records');break;
      case 'inspect':selected=weaponById(button.dataset.weapon).id;renderShop();break;
      case 'equip':equip();break;
      case 'level': {
        const n=Number(button.dataset.level);if(Number.isInteger(n)&&n>0&&n<=save.bestLevel)start(n);break;
      }
      case 'retry':start(game.scene.level.n);break;
      case 'next':if(game.nextLevel()){boardHome=false;refresh();setView('play');}break;
    }
  }
  function onKey(event: KeyboardEvent): void {
    if(!active||document.hidden||disposed||event.ctrlKey||event.metaKey||event.altKey)return;
    // Stop traversal to the hidden v1's bubbling shortcuts (including its C
    // unlock cheat), but let our own window-capture firing listener still run.
    event.stopPropagation();
    const target=event.target as Element|null;
    if(target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    if(event.code==='Escape'||event.code==='KeyP'){
      event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)back();return;
    }
    if(event.code==='KeyM'){
      event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)toggleSound();return;
    }
    if(view!=='play'&&['Space','ArrowUp','Enter'].includes(event.code))event.stopImmediatePropagation();
    if(event.key==='Tab'&&!['home','play'].includes(view)){
      const panel=panels.find((p)=>!p.hidden);const focusable=[...(panel?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]')??[])];
      if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&(document.activeElement===first||!panel?.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!panel?.contains(document.activeElement))){event.preventDefault();first.focus();}
    }
  }
  function onKeyUp(event: KeyboardEvent): void {
    if(active&&!document.hidden&&!disposed)event.stopPropagation();
  }
  function visibility(): void {
    if(document.hidden){if(view==='play')pause();sound.suspend();}
    syncLoop();
  }

  // Register before the driver's firing key listener: menu shortcuts win.
  root.addEventListener('click',onClick);window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKeyUp,true);
  window.addEventListener('resize',fitStage);document.addEventListener('visibilitychange',visibility);
  driver=mount(canvas,{
    game,paused:true,input:()=>active&&view==='play'&&!document.hidden,
    presentation:()=>({ home:boardHome,best:save.best,reducedMotion:media?.matches??false }),
    onGesture:()=>sound.unlock(),onEvent,onEnd:finish,
  });
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(fitStage):null;observer?.observe(root);
  refresh();fitStage();setView('home',false);
  return {
    game,get profile(){return save;},get screen(){return view;},back,
    setActive(value){
      if(disposed)return;active=value;
      if(!active){if(view==='play')pause();sound.suspend();}
      syncLoop();
    },
    destroy(){
      if(disposed)return;disposed=true;saveSave(save);driver.destroy();sound.destroy();observer?.disconnect();
      if(toastTimer!==undefined)clearTimeout(toastTimer);
      root.removeEventListener('click',onClick);window.removeEventListener('keydown',onKey,true);window.removeEventListener('keyup',onKeyUp,true);
      window.removeEventListener('resize',fitStage);document.removeEventListener('visibilitychange',visibility);
      root.replaceChildren();root.classList.remove('ps-v2');delete root.dataset.view;
    },
  };
}

function rule(name: IconName,title: string,note: string): string {
  return `<div class="ps-rule">${icon(name)}<div><h3>${title}</h3><p>${note}</p></div></div>`;
}
