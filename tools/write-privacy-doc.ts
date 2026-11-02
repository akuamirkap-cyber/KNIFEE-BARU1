/**
 * Menulis ulang docs/PRIVACY.md dari src/legal/privacyPolicy.ts.
 *
 *   npm run docs:privacy
 *
 * Jalankan setiap kali teks kebijakan berubah. Tes `tests/privacy-compliance.test.ts`
 * memastikan file .md selalu sama dengan hasil generator ini, jadi jangan edit
 * docs/PRIVACY.md manual.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { privacyPolicyMarkdown } from '../src/legal/privacyPolicy';

const target = path.join(process.cwd(), 'docs/PRIVACY.md');
mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(target, privacyPolicyMarkdown(), 'utf8');
console.log(`ditulis: ${path.relative(process.cwd(), target)}`);
