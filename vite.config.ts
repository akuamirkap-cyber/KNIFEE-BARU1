import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
          firework: path.resolve(process.cwd(), 'games/firework/index.html'),
          fireworkgun: path.resolve(process.cwd(), 'games/fireworkgun/index.html'),
          keris: path.resolve(process.cwd(), 'games/keris/index.html'),
          rainbow: path.resolve(process.cwd(), 'games/rainbow/index.html'),
          weaponskins: path.resolve(process.cwd(), 'games/weaponskins/index.html'),
          obliterator: path.resolve(process.cwd(), 'games/obliterator/index.html'),
          gunhitdev: path.resolve(process.cwd(), 'games/gunhitdev/index.html'),
          sharkgun: path.resolve(process.cwd(), 'games/sharkgun/index.html'),
        },
      },
    },
  };
});
