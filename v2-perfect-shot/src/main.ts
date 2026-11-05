import { createArcade } from './ui/arcade';

// The standalone page and Gun Hit's V2 tab instantiate this exact same shell.
// The only standalone-specific styles are the viewport, not the game itself.
const app = document.getElementById('app');
if (!app) throw new Error('perfect-shot-v2: missing #app');
export const arcade = createArcade(app);

// Vite's HMR must not leave an extra rAF, listener set, or AudioContext behind.
const hot = (import.meta as ImportMeta & { hot?: { dispose(cb: () => void): void } }).hot;
hot?.dispose(() => arcade.destroy());
