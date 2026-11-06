import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One HTML file out: drop it in any project, or open it straight from disk.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: { target: 'es2020' },
  server: {
    host: '0.0.0.0',
    port: 4280,
    // The sandbox serves dev servers through its own preview host.
    allowedHosts: ['.e2b.app'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4280,
    allowedHosts: ['.e2b.app'],
  },
});
