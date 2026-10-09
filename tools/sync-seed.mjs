// Regenerates data/seed.js from data/seed.json (seed.js lets the demo run from file://)
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../data/', import.meta.url);
const data = JSON.parse(readFileSync(new URL('seed.json', dir), 'utf8'));
writeFileSync(new URL('seed.js', dir), '/* Same data as seed.json, wrapped so the demo also works when index.html is opened straight from disk (file://). Regenerate: node tools/sync-seed.mjs */\nwindow.COF_SEED = ' + JSON.stringify(data) + ';\n');
console.log('seed.js updated (seed_version ' + data.seed_version + ')');
