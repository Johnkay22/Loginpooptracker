// Builds one encrypted, password-gated HTML page from the Overtime dist folder.
// Usage: node build.mjs <distDir> <outFile> <password>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { webcrypto as crypto } from 'node:crypto';
import * as esbuild from 'esbuild';

const [distDir, outFile, password] = process.argv.slice(2);
const here = path.dirname(new URL(import.meta.url).pathname);
const tmp = path.join(here, 'tmp');
fs.mkdirSync(tmp, { recursive: true });

// 1. Images -> data URIs (PNGs re-encoded to WebP at the same pixel size, alpha kept)
const assets = ['herman-battle.png', 'herman-walk.png', 'corporate-sprites.png', 'herman-brand.jpg'];
const dataUri = {};
for (const a of assets) {
  const src = path.join(distDir, 'assets', a);
  let buf, mime;
  if (a.endsWith('.png')) {
    const out = path.join(tmp, a.replace('.png', '.webp'));
    execFileSync('python3', ['-I', '-c',
      'import sys;from PIL import Image;im=Image.open(sys.argv[1]);im.save(sys.argv[2],"WEBP",quality=90,method=6,exact=True)',
      src, out]);
    buf = fs.readFileSync(out); mime = 'image/webp';
  } else { buf = fs.readFileSync(src); mime = 'image/jpeg'; }
  dataUri['assets/' + a] = `data:${mime};base64,${buf.toString('base64')}`;
  console.log(a, (buf.length / 1024).toFixed(0) + ' KB');
}
// Sound effects, icons and menu art: every file in these folders is inlined as-is as a data URI.
const INLINE_FOLDERS = { sfx: { '.mp3': 'audio/mpeg' }, icons: { '.webp': 'image/webp' }, menu: { '.webp': 'image/webp' } };
for (const [folder, types] of Object.entries(INLINE_FOLDERS)) {
  const dir = path.join(distDir, 'assets', folder);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).sort()) {
    const mime = types[path.extname(f)];
    if (mime) dataUri[`assets/${folder}/${f}`] = `data:${mime};base64,` + fs.readFileSync(path.join(dir, f)).toString('base64');
  }
}
const swapAssets = s => { for (const [k, v] of Object.entries(dataUri)) s = s.split(k).join(v); return s; };

// 2. Bundle the ES modules into one script
const bundled = await esbuild.build({
  entryPoints: [path.join(distDir, 'app.mjs')], bundle: true, format: 'esm',
  minify: true, write: false, target: 'es2020',
});
let js = swapAssets(bundled.outputFiles[0].text).replace(/<\/script/gi, '<\\/script');

// 3. Build the full game page
let css = fs.readFileSync(path.join(distDir, 'style.css'), 'utf8');
const fontImport = (css.match(/@import url\([^)]*\);/) || [''])[0];
css = swapAssets(css.replace(fontImport, ''));
let html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
html = swapAssets(html)
  .replace('<link rel="stylesheet" href="style.css">',
    `<meta name="robots" content="noindex,nofollow">${fontImport ? `<link rel="stylesheet" href="${fontImport.match(/url\('?"?([^'")]*)/)[1]}">` : ''}<style>${css}</style>`)
  .replace('<script type="module" src="app.mjs"></script>', () => `<script type="module">${js}</script>`);
if (html.includes('src="app.mjs"') || html.includes('href="style.css"')) throw new Error('inline step failed');

if (!password || password === '--plain') {
  fs.writeFileSync(outFile, html);
  console.log('plain game page (no password)', (html.length / 1024).toFixed(0) + ' KB');
  process.exit(0);
}
// 4. Encrypt: PBKDF2-SHA256 (600k) -> AES-256-GCM
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const ITER = 600000;
const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
  baseKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt']);
const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(html)));
const b64 = u => Buffer.from(u).toString('base64');

// 5. Gate page
const gate = fs.readFileSync(path.join(here, 'gate.html'), 'utf8')
  .replace('__SALT__', b64(salt)).replace('__IV__', b64(iv)).replace('__ITER__', String(ITER))
  .replace('__DATA__', () => b64(cipher));
fs.writeFileSync(outFile, gate);
console.log('game page', (html.length / 1024).toFixed(0) + ' KB', '| output', (gate.length / 1024).toFixed(0) + ' KB');
fs.writeFileSync(path.join(tmp, 'plain-game.html'), html); // local QA copy only, never committed
