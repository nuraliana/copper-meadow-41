// Leonida Trophy Guide — the program that hands this entry in.
//
// The guide itself is app/: plain static files (index.html, style.css, app.js and
// data/trophies.json) that a desktop browser opens with the network off. This file
// only does the hand-in: it checks the trophy data is complete, copies app/ and
// screenshots/ into the output directory, and writes dossier.json with the vendored
// make.fun library (vendor/makefun-frontend.ts, left exactly as shipped: the scorer
// requires dossier.json to be byte for byte what that library writes).
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the guide locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast, before copying anything, if the trophy data is not the full official list.
const dataPath = join(here, 'app', 'data', 'trophies.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const trophies = data.trophies;
if (!Array.isArray(trophies) || trophies.length !== 55) {
  throw new Error(`expected 55 trophies in app/data/trophies.json, found ${trophies?.length ?? 0}`);
}
const missingGuides = trophies.filter((t) => typeof t.guide !== 'string' || !t.guide.trim());
if (missingGuides.length > 0) {
  throw new Error(`${missingGuides.length} trophies have no guide text`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others refuse an
// entry the scorer would refuse (more than 4 screenshots or one over 256 KiB; more
// than 993 files and directories in app/ or 48 MiB of app files).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
