// Test-only Node loader for Vite's raw SVG/CSS imports; never shipped as runtime JS.
import { readFile } from 'node:fs/promises';
export async function load(url, context, nextLoad) {
  if (url.endsWith('.png?inline')) {
    const file = new URL(url); file.search = '';
    return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify('data:image/png;base64,' + (await readFile(file)).toString('base64'))};` };
  }
  if (url.endsWith('?raw')) {
    const file = new URL(url); file.search = '';
    return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(await readFile(file, 'utf8'))};` };
  }
  return nextLoad(url, context);
}
