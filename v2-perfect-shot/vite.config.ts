import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One HTML file out: drop it in any project, or open it straight from disk.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: { target: 'es2020' },
});
