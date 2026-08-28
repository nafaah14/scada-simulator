/* =====================================================================
   Expands the authored tag database into the full runtime tag set.
   Run:  node tools/generate-tags.mjs

   data/tags/genset-tags.json is the *authored* source of truth — one
   representative record per measurement family, with the real limits.
   Several families repeat per cylinder / per bank / per unit, and
   ARCHITECTURE.md notes those were left as patterns rather than ~100
   hand-written records.

   This script materialises those patterns into
   data/tags/tags.generated.json, which is what both the server and the
   static (no-backend) frontend actually load. Authored records always
   win over generated ones, so editing genset-tags.json stays the way to
   change a limit.
   ===================================================================== */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TAGS_DIR = join(HERE, '..', 'data', 'tags');

const authored = JSON.parse(readFileSync(join(TAGS_DIR, 'genset-tags.json'), 'utf8'));
const out = new Map(authored.map(t => [t.tag_id, t]));

let generated = 0;
function make(tag) {
  if (out.has(tag.tag_id)) return;          // never clobber an authored record
  out.set(tag.tag_id, {
    sensor_fault: false,
    alarm_limits: { hihi: null, hi: null, lo: null, lolo: null },
    shutdown_limits: { hi: null, lo: null },
    trend_enabled: true,
    generated: true,
    ...tag
  });
  generated++;
}

const analog = (tag_id, description, unit, value, category, extra = {}) => make({
  tag_id, logical_name: tag_id, description,
  engineering_unit: unit, data_type: 'analog', category, value, ...extra
});
const digital = (tag_id, description, value = false, extra = {}) => make({
  tag_id, logical_name: tag_id, description,
  engineering_unit: null, data_type: 'digital', category: 'status',
  value, trend_enabled: false, ...extra
});

/* ---------------------------------------------------------------------
   Per-unit engine instrumentation. G1 is the only unit with a built
   screen today; the loop is written per-unit so G2-G6 come for free
   once their screens exist.
   ------------------------------------------------------------------ */
const UNITS = ['G1'];
const BANKS = ['A', 'B'];
const CYLS = 10;                       // W20V32 — 20 cylinders, 10 per bank

for (const unit of UNITS) {
  const u = unit.replace('G', 'G0');   // G1 -> G01, matching the tag convention
  const screens = [`${unit}.Temp`];

  for (const bank of BANKS) {
    for (let n = 1; n <= CYLS; n++) {
      analog(`${u}_CYL_${bank}_EXH_${n}`,
        `Cylinder ${bank}${n} — exhaust gas temperature`, '°C', 395 + Math.round(Math.random() * 20),
        'temperature', {
          unit, screens,
          alarm_limits: { hihi: 550, hi: 500, lo: null, lolo: null },
          shutdown_limits: { hi: 580, lo: null }
        });
      analog(`${u}_CYL_${bank}_LINER1_${n}`,
        `Cylinder ${bank}${n} — liner 1 temperature`, '°C', 110 + Math.round(Math.random() * 10),
        'temperature', {
          unit, screens,
          alarm_limits: { hihi: null, hi: 160, lo: null, lolo: null },
          shutdown_limits: { hi: 180, lo: null }
        });
      analog(`${u}_CYL_${bank}_LINER2_${n}`,
        `Cylinder ${bank}${n} — liner 2 temperature`, '°C', 108 + Math.round(Math.random() * 10),
        'temperature', {
          unit, screens,
          alarm_limits: { hihi: null, hi: 160, lo: null, lolo: null },
          shutdown_limits: { hi: 180, lo: null }
        });
      analog(`${u}_CYL_${bank}_BIGEND_${n}`,
        `Cylinder ${bank}${n} — big end bearing temperature`, '°C', 78 + Math.round(Math.random() * 8),
        'temperature', {
          unit, screens,
          alarm_limits: { hihi: null, hi: 95, lo: null, lolo: null },
          shutdown_limits: { hi: 105, lo: null }
        });
    }
  }

  // main bearings sit on the crankshaft centreline: 1..11 plus thrust (0)
  for (let n = 1; n <= 11; n++) {
    analog(`${u}_MAIN_BRG_${n}`, `Main bearing ${n} temperature`, '°C',
      88 + Math.round(Math.random() * 6), 'temperature', {
        unit, screens,
        alarm_limits: { hihi: null, hi: 95, lo: null, lolo: null },
        shutdown_limits: { hi: 105, lo: null }
      });
  }
  analog(`${u}_THRUST_BRG`, 'Thrust bearing temperature', '°C', 80, 'temperature', {
    unit, screens,
    alarm_limits: { hihi: null, hi: 95, lo: null, lolo: null },
    shutdown_limits: { hi: 105, lo: null }
  });

  // turbochargers, one per bank, at the non-driving end
  for (const [tc, base] of [['A', 25000], ['B', 25160]]) {
    analog(`${u}_TC${tc}_SPEED`, `TC ${tc} — turbocharger speed`, 'rpm', base, 'speed', {
      unit, screens,
      alarm_limits: { hihi: 27000, hi: null, lo: null, lolo: null },
      shutdown_limits: { hi: 28000, lo: null }
    });
    analog(`${u}_TC${tc}_EXH_IN`, `TC ${tc} — exhaust gas temp inlet`, '°C',
      tc === 'A' ? 497 : 508, 'temperature', {
        unit, screens,
        alarm_limits: { hihi: 580, hi: 540, lo: null, lolo: null },
        shutdown_limits: { hi: 620, lo: null }
      });
    analog(`${u}_TC${tc}_EXH_OUT`, `TC ${tc} — exhaust gas temp outlet`, '°C',
      tc === 'A' ? 336 : 340, 'temperature', { unit, screens });
  }

  analog(`${u}_EXH_AVG_TEMP`, 'Exhaust gas average temperature', '°C', 400, 'temperature', {
    unit, screens,
    note: 'Computed — mean of all 20 cylinder exhaust temps.',
    alarm_limits: { hihi: 550, hi: 500, lo: null, lolo: null }
  });

  // alternator
  for (const [w, v] of [['U', 92], ['V', 95], ['W', 93]]) {
    analog(`${u}_GEN_WINDING_${w}`, `Generator winding ${w} temperature`, '°C', v,
      'temperature', {
        unit, screens,
        alarm_limits: { hihi: 140, hi: 120, lo: null, lolo: null },
        shutdown_limits: { hi: 155, lo: null }
      });
  }
  for (const [b, v, lbl] of [['D', 77, 'drive end'], ['ND', 75, 'non-drive end']]) {
    analog(`${u}_GEN_BEARING_${b}`, `Generator bearing (${lbl}) temperature`, '°C', v,
      'temperature', {
        unit, screens,
        alarm_limits: { hihi: 100, hi: 90, lo: null, lolo: null },
        shutdown_limits: { hi: 110, lo: null }
      });
  }
  analog(`${u}_GEN_AIR_INTAKE`, 'Generator cooling air intake temperature', '°C', 36,
    'temperature', { unit, screens });
  analog(`${u}_GEN_AIR_EXIT`, 'Generator cooling air exit temperature', '°C', 59,
    'temperature', {
      unit, screens, alarm_limits: { hihi: null, hi: 80, lo: null, lolo: null }
    });

  // engine status digitals shown under the alternator
  digital(`${u}_TURNING_GEAR`, 'Turning gear engaged', false, { unit, screens });
  digital(`${u}_EMERGENCY_STOP`, 'Emergency stop activated', false, { unit, screens });
  digital(`${u}_STOP_LEVER`, 'Stop lever tripped', false, { unit, screens });
  digital(`${u}_ALARM_MINOR`, 'Minor alarm summary', false, { unit, screens });
  digital(`${u}_ALARM_MAJOR`, 'Major alarm summary', false, { unit, screens });
  digital(`${u}_ALARM_SLOWDOWN`, 'Slow down summary', false, { unit, screens });
  digital(`${u}_ALARM_LOADREDUCE`, 'Load reduction summary', false, { unit, screens });
  digital(`${u}_RUNNING`, 'Engine running', true, { unit, screens });
}

const list = [...out.values()].sort((a, b) => a.tag_id.localeCompare(b.tag_id));
writeFileSync(join(TAGS_DIR, 'tags.generated.json'), JSON.stringify(list, null, 2) + '\n');
console.log(`wrote tags.generated.json — ${list.length} tags ` +
            `(${authored.length} authored, ${generated} generated)`);
