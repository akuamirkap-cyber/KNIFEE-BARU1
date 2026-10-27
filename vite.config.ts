import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * Storage that a cross-origin frame may be refused.
 *
 * The hub is embedded by the host page, so every one of its frames is a
 * third-party context: a browser with third-party storage blocked throws
 * `SecurityError` the moment `localStorage` is touched. Slide 1 reads its coins,
 * weapon, collection and quests during the first render, so that throw unmounted
 * the whole tree and the page came up blank. The games' own engines read a saved
 * best score in their constructors, which blanked those slides the same way.
 *
 * This runs before any module on every page and swaps in an in-memory store when
 * the real one refuses to be used, so the games keep playing (a save simply does
 * not survive the reload in that mode).
 */
const STORAGE_SHIM = `<script>
(function () {
  function memoryStore() {
    var data = Object.create(null);
    return {
      getItem: function (k) { return k in data ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; },
      clear: function () { data = Object.create(null); },
      key: function (i) { return Object.keys(data)[i] || null; },
      get length() { return Object.keys(data).length; }
    };
  }
  function install(name) {
    try {
      var store = window[name];
      // Reading a key is what a blocked frame refuses, not the property itself.
      if (store) { store.getItem('__storage_probe'); return; }
    } catch (e) { /* blocked: fall through to the memory store */ }
    var fallback = memoryStore();
    try {
      Object.defineProperty(window, name, { configurable: true, get: function () { return fallback; } });
    } catch (e) {
      try { window[name] = fallback; } catch (e2) { /* nothing else to try */ }
    }
  }
  install('localStorage');
  install('sessionStorage');
})();
</script>`;

function standbyControlPlugin() {
  return {
    name: 'standby-control',
    transformIndexHtml(html: string, ctx: { path?: string }) {
      const withStorage = html.includes('__storage_probe')
        ? html
        : html.replace('</head>', `${STORAGE_SHIM}</head>`);
      if (!ctx.path || !ctx.path.includes('/games/')) return withStorage;
      return withStorage.replace(
        '</head>',
        `<script>
(function() {
  var isStandby = new URLSearchParams(window.location.search).get('standby') === '1';
  var running = !isStandby;
  var origRAF = window.requestAnimationFrame;
  var initialFrames = 0;
  var pendingCallback = null;

  window.requestAnimationFrame = function(cb) {
    if (!running && initialFrames >= 2) {
      pendingCallback = cb;
      return 0;
    }
    return origRAF.call(window, function(time) {
      initialFrames++;
      cb(time);
    });
  };

  function resume() {
    if (running) return;
    running = true;
    if (pendingCallback) {
      var cb = pendingCallback;
      pendingCallback = null;
      origRAF.call(window, cb);
    }
  }

  function pause() {
    running = false;
  }

  window.addEventListener('message', function(e) {
    var data = e.data;
    if (data === 'GAME_RESUME' || (data && data.type === 'GAME_RESUME')) resume();
    if (data === 'GAME_PAUSE' || (data && data.type === 'GAME_PAUSE')) pause();
  });

  window.addEventListener('pointerdown', resume, { capture: true });
  window.addEventListener('keydown', resume, { capture: true });
  window.__resumeGame = resume;
  window.__pauseGame = pause;
})();
</script></head>`
      );
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), standbyControlPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(process.cwd(), 'index.html'),
          fireworkgun: path.resolve(process.cwd(), 'games/fireworkgun/index.html'),
          rainbow: path.resolve(process.cwd(), 'games/rainbow/index.html'),
          obliterator: path.resolve(process.cwd(), 'games/obliterator/index.html'),
          game1: path.resolve(process.cwd(), 'games/game-1/index.html'),
          game2: path.resolve(process.cwd(), 'games/game-2/index.html'),
          game4: path.resolve(process.cwd(), 'games/game-4/index.html'),
          game5: path.resolve(process.cwd(), 'games/game-5/index.html'),
          game6: path.resolve(process.cwd(), 'games/game-6/index.html'),
          game7: path.resolve(process.cwd(), 'games/game-7/index.html'),
          game8: path.resolve(process.cwd(), 'games/game-8/index.html'),
        },
      },
    },
  };
});
