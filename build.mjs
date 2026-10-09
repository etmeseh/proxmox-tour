import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';

const target = process.argv[2] || 'all';
const common = {
  bundle: true,
  format: 'iife',
  target: 'chrome110',
  loader: { '.css': 'text', '.json': 'json' },
  logLevel: 'info',
};

if (target === 'all' || target === 'userscript') {
  mkdirSync('dist', { recursive: true });
  const res = await build({ ...common, entryPoints: ['src/entry.userscript.js'], write: false, outfile: 'dist/proxmox-tour.user.js' });
  const header = readFileSync('userscript/header.txt', 'utf8');
  writeFileSync('dist/proxmox-tour.user.js', `${header}\n${res.outputFiles[0].text}`);
}

if (target === 'all' || target === 'extension') {
  mkdirSync('dist/extension', { recursive: true });
  await build({ ...common, entryPoints: ['src/entry.extension.js'], outfile: 'dist/extension/content.js' });
  cpSync('extension/manifest.json', 'dist/extension/manifest.json');
}
