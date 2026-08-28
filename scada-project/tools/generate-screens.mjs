/* =====================================================================
   Generates the canvas screen documents under data/screens-v2/.
   Run:  node tools/generate-screens.mjs
   ---------------------------------------------------------------------
   Screens are hand-tuned in the editor after this point — this script
   lays down the initial geometry, it is not meant to be re-run over
   edits. Re-running OVERWRITES, so export from the editor first if a
   screen has been adjusted there.

   Pass screen ids to regenerate only those:
     node tools/generate-screens.mjs G1.Temp Common.Fuel
   ===================================================================== */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { g1Temp } from './screens/g1-temp.mjs';
import { g1Fuel } from './screens/g1-fuel.mjs';
import { g1Control } from './screens/g1-control.mjs';
import { commonOverview } from './screens/common-overview.mjs';
import { commonFuel } from './screens/common-fuel.mjs';
import { commonStartAir } from './screens/common-startair.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'data', 'screens-v2');
mkdirSync(OUT, { recursive: true });

const ALL = [
  commonOverview(),
  commonFuel(),
  commonStartAir(),
  g1Temp(),
  g1Fuel(),
  g1Control()
];

const only = process.argv.slice(2);
const screens = only.length ? ALL.filter(s => only.includes(s.screen_id)) : ALL;
if (only.length && !screens.length) {
  console.error('No screens matched:', only.join(', '));
  process.exit(1);
}

const fileFor = id => id.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json';

screens.forEach(s => {
  writeFileSync(join(OUT, fileFor(s.screen_id)), JSON.stringify(s, null, 2) + '\n');
  console.log('wrote', fileFor(s.screen_id).padEnd(24), s.elements.length, 'elements');
});

/* The index always covers every screen, so a partial regenerate can't
   drop entries the app shell still needs. */
const index = ALL.map(s => ({
  screen_id: s.screen_id,
  title: s.title,
  unit: s.unit || null,
  layout: s.layout || 'canvas',
  file: fileFor(s.screen_id),
  elements: s.elements.length
}));
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log('wrote index.json —', index.length, 'screens');
