import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function standbyControlPlugin() {
  return {
    name: 'standby-control',
    transformIndexHtml(html: string, ctx: { path?: string }) {
      if (!ctx.path || !ctx.path.includes('/games/')) return html;
      return html.replace(
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
          game3: path.resolve(process.cwd(), 'games/game-3/index.html'),
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
