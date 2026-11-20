// GTA 6 trophy guide, round 3: this program is the hand-in step. It takes the
// static guide that lives in app/ beside this file, together with the four
// screenshots in screenshots/, and lays them out in the output folder the
// grader reads (or MAKEFUN_OUTPUT_DIR when set locally). It then asks the
// vendored make.fun library to write dossier.json, the summary the judge
// reads: screenshots first, then the first-load totals and the source text.
// Nothing here fetches the network and nothing is installed at run time:
// only the Node standard library and the vendored library are used.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Before anything is copied, check the trophy data is whole: the gate wants
// all 55 official trophies named, each with a guide that is not blank.
const trophyFile = join(repoRoot, 'app', 'data', 'trophies.json');
const trophyData = JSON.parse(readFileSync(trophyFile, 'utf-8'));
const trophyList = Array.isArray(trophyData) ? trophyData : trophyData.trophies;
if (!Array.isArray(trophyList) || trophyList.length !== 55) {
  throw new Error(`expected 55 trophies, found ${Array.isArray(trophyList) ? trophyList.length : 'none'}`);
}
for (const trophy of trophyList) {
  if (typeof trophy.name !== 'string' || !trophy.name.trim()) throw new Error('a trophy is missing its name');
  if (typeof trophy.guide !== 'string' || !trophy.guide.trim()) throw new Error(`trophy ${trophy.name} has no guide`);
  if (!Array.isArray(trophy.steps) || trophy.steps.length === 0) throw new Error(`trophy ${trophy.name} has no steps`);
  for (const step of trophy.steps) {
    if (typeof step.text !== 'string' || !step.text.trim()) throw new Error(`trophy ${trophy.name} has an empty step`);
    if (typeof step.source !== 'string' || !step.source.trim()) throw new Error(`trophy ${trophy.name} has a step with no source`);
  }
}

if (!existsSync(join(repoRoot, 'app', 'index.html'))) throw new Error('app/index.html is missing');
if (!existsSync(join(repoRoot, 'app', 'app.js'))) throw new Error('app/app.js is missing');
if (!existsSync(join(repoRoot, 'app', 'style.css'))) throw new Error('app/style.css is missing');

mkdirSync(destination, { recursive: true });
cpSync(join(repoRoot, 'app'), join(destination, 'app'), { recursive: true });
mkdirSync(join(destination, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(destination, 'screenshots'), { recursive: true });
}
const shots = readdirSync(join(destination, 'screenshots')).filter((name) => !name.startsWith('.'));
if (shots.length < 3 || shots.length > 4) throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);

// Caps from the competition's gate: the dossier text stays under 160 KiB,
// screenshots at most 4 and 256 KiB each, app/ at most 993 entries and 48 MiB.
writeFileSync(
  join(destination, 'dossier.json'),
  buildDossier(destination, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
console.log(`handed in ${trophyList.length} trophies and ${shots.length} screenshots to ${destination}`);
