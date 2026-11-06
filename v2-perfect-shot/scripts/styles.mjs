import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import prefixSelector from 'postcss-prefix-selector';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = '@import "tailwindcss" source(none);\n@source "./src";\n';
const tw = await postcss([tailwind({ base: root, optimize: false })]).process(input, { from: path.join(root, 'utilities.css') });
const original = await fs.readFile(path.join(root, 'styles/original.css'), 'utf8');
const extra = await fs.readFile(path.join(root, 'styles/lite.css'), 'utf8');
const result = await postcss([prefixSelector({
  prefix: '.ps-lite',
  transform(prefix, selector, prefixed) {
    if (selector.startsWith('.ps-lite')) return selector;
    if (selector === ':root' || selector === ':host' || selector === 'html' || selector === 'body') return prefix;
    if (selector === '*') return `${prefix}, ${prefix} *`;
    return prefixed;
  },
})]).process(tw.css + '\n' + original + '\n' + extra, { from: undefined });
await fs.writeFile(path.join(root, 'src/lite.css'), '/* Generated scoped original-v1 UI. npm run styles rebuilds this file. */\n' + result.css);
console.log(`Scoped Lite styles: ${Buffer.byteLength(result.css).toLocaleString()} bytes`);
