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
const UNITS = ['G1'];   // only G1 has per-cylinder screens today
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

/* ---------------------------------------------------------------------
   Plant-common instrumentation: fuel train, day/storage tanks, feeder
   and transfer pumps, and the two compressed-air systems.
   ------------------------------------------------------------------ */
{
  const common = { unit: 'COMMON' };

  // six LFO day tanks (PBF 901-906) — level, temps, level switches, valves
  for (let n = 901; n <= 906; n++) {
    const t = `PBF${n}`;
    const screens = ['Common.Overview', 'Common.Fuel'];
    for (let k = 1; k <= 3; k++) {
      analog(`COMMON_${t}_T${k}`, `LFO day tank ${n} — temperature ${k}`, '°C', 30,
        'temperature', {
          ...common, screens,
          alarm_limits: { hihi: null, hi: 60, lo: null, lolo: null }
        });
    }
    digital(`COMMON_${t}_LSW`, `LFO day tank ${n} — level switch`, false, { ...common, screens });
    digital(`COMMON_${t}_LSH`, `LFO day tank ${n} — level switch high`, false, { ...common, screens });
    digital(`COMMON_${t}_LSL`, `LFO day tank ${n} — level switch low`, false, { ...common, screens });
    digital(`COMMON_${t}_V`, `LFO day tank ${n} — outlet valve`, true, { ...common, screens });
    digital(`COMMON_${t}_FILL_V`, `LFO day tank ${n} — fill valve`, false, { ...common, screens });
    digital(`COMMON_${t}_OUT_V`, `LFO day tank ${n} — transfer valve`, false, { ...common, screens });
  }

  // four LFO storage tanks (PAE 901-904)
  for (let n = 901; n <= 904; n++) {
    const t = `PAE${n}`;
    const screens = ['Common.Fuel'];
    for (let k = 1; k <= 4; k++) {
      analog(`COMMON_${t}_T${k}`, `LFO storage tank ${n} — temperature ${k}`, '°C', 31,
        'temperature', { ...common, screens });
    }
    digital(`COMMON_${t}_LSH`, `LFO storage tank ${n} — level switch high`, false,
      { ...common, screens });
    digital(`COMMON_${t}_LSL`, `LFO storage tank ${n} — level switch low`, false,
      { ...common, screens });
  }
  analog('PAF902_LEVEL', 'LFO storage tank level (PAE 902)', '%', 49, 'level', {
    ...common, screens: ['Common.Fuel'],
    alarm_limits: { hihi: null, hi: null, lo: 10, lolo: 5 }
  });
  analog('PAF903_LEVEL', 'LFO storage tank level (PAE 903)', '%', 83, 'level', {
    ...common, screens: ['Common.Fuel'],
    alarm_limits: { hihi: null, hi: null, lo: 10, lolo: 5 }
  });

  // feeder unit PCA901
  const feederScreens = ['Common.Overview', 'Common.Fuel', 'G1.Fuel'];
  for (const p of ['P1', 'P2']) {
    digital(`COMMON_PCA901_${p}`, `LFO feeder pump ${p} running`, p === 'P1',
      { ...common, screens: feederScreens });
    digital(`COMMON_PCA901_${p}_V`, `LFO feeder pump ${p} suction valve`, true,
      { ...common, screens: feederScreens });
    digital(`COMMON_PCA901_${p}_MODE`, `LFO feeder pump ${p} in auto`, true,
      { ...common, screens: feederScreens });
    digital(`COMMON_FEEDER_${p}`, `Feeder unit pump ${p} running`, p === 'P1',
      { ...common, screens: ['Common.Overview'] });
  }
  digital('COMMON_PCA901_CTRL_VOLTAGE', 'LFO feeder unit control voltage healthy', true,
    { ...common, screens: ['Common.Fuel'] });
  analog('COMMON_PCA901_SPEED_PCT', 'LFO feeder unit speed', '%', 49, 'speed',
    { ...common, screens: feederScreens });
  analog('COMMON_PCA901_OUT_PRESS_A', 'LFO feeder discharge pressure A', 'bar', 4.5,
    'pressure', { ...common, screens: ['Common.Fuel'],
      alarm_limits: { hihi: null, hi: null, lo: 3.5, lolo: 2.5 } });
  analog('COMMON_PCA901_OUT_PRESS_B', 'LFO feeder discharge pressure B', 'bar', 4.5,
    'pressure', { ...common, screens: ['Common.Fuel'],
      alarm_limits: { hihi: null, hi: null, lo: 3.5, lolo: 2.5 } });

  // transfer + unloading pumps
  for (const p of ['PAF901', 'PAF902']) {
    digital(`COMMON_${p}_PUMP`, `LFO transfer pump ${p} running`, false,
      { ...common, screens: ['Common.Fuel'] });
    digital(`COMMON_${p}_V`, `LFO transfer pump ${p} discharge valve`, true,
      { ...common, screens: ['Common.Fuel'] });
    analog(`COMMON_${p}_PUMP_A`, `LFO transfer pump ${p} current`, 'A', 0, 'current',
      { ...common, screens: ['Common.Fuel'] });
  }
  analog('COMMON_MAIN_PUMP_A', 'LFO main transfer pump current', 'A', 0, 'current',
    { ...common, screens: ['Common.Fuel'] });
  analog('COMMON_TRANSFER_PRESS', 'LFO transfer header pressure', 'bar', 0.2, 'pressure',
    { ...common, screens: ['Common.Fuel'] });
  analog('COMMON_UNLOAD_FLOW', 'LFO unloading flow', 'm3/h', 0, 'flow',
    { ...common, screens: ['Common.Fuel'] });
  for (const p of ['P1', 'P2']) {
    digital(`COMMON_PAD901_${p}`, `LFO unloading pump ${p} running`, false,
      { ...common, screens: ['Common.Fuel'] });
    digital(`COMMON_PAD901_${p}_V`, `LFO unloading pump ${p} valve`, false,
      { ...common, screens: ['Common.Fuel'] });
  }

  // sludge
  analog('COMMON_SLUDGE_TEMP', 'Sludge tank temperature', '°C', 30, 'temperature',
    { ...common, screens: ['Common.Fuel'] });
  digital('COMMON_SLUDGE_LEVEL', 'Sludge tank level switch', false,
    { ...common, screens: ['Common.Fuel'] });
  digital('COMMON_SLUDGE_PUMP', 'Sludge loading pump running', false,
    { ...common, screens: ['Common.Fuel'] });
  digital('COMMON_SLUDGE_V1', 'Sludge pump suction valve', false,
    { ...common, screens: ['Common.Fuel'] });
  digital('COMMON_SLUDGE_V2', 'Sludge pump discharge valve', false,
    { ...common, screens: ['Common.Fuel'] });

  // compressed air
  const airScreens = ['Common.StartAir'];
  for (const c of ['C1', 'C2']) {
    digital(`COMMON_TCA901_${c}`, `Instrument air compressor ${c} running`, true,
      { ...common, screens: airScreens });
    digital(`COMMON_TSA901_${c}`, `Starting air compressor ${c} running`, true,
      { ...common, screens: airScreens });
  }
  digital('COMMON_TCA901_REMOTE', 'Instrument air unit remote permit', true,
    { ...common, screens: airScreens });
  digital('COMMON_TSA901_REMOTE', 'Starting air unit remote permit', true,
    { ...common, screens: airScreens });
  digital('COMMON_SERVICE_REMOTE', 'Service tank valve remote permit', true,
    { ...common, screens: airScreens });
  digital('COMMON_SERVICE_V', 'Service air outlet valve', true,
    { ...common, screens: airScreens });
  analog('COMMON_TCA901_TEMP', 'Instrument air discharge temperature', '°C', 32.5,
    'temperature', { ...common, screens: airScreens,
      alarm_limits: { hihi: 45, hi: 30, lo: null, lolo: null } });
  analog('COMMON_INSTRUMENT_PRESS', 'Instrument air tank pressure', 'bar', 7.1, 'pressure',
    { ...common, screens: airScreens,
      alarm_limits: { hihi: null, hi: null, lo: 5.5, lolo: 4.5 } });
  analog('COMMON_START_AIR_PRESS', 'Starting air receiver pressure', 'bar', 27.8, 'pressure',
    { ...common, screens: airScreens,
      alarm_limits: { hihi: null, hi: null, lo: 18, lolo: 15 } });

  make({
    tag_id: 'COMMON_BUSTIE_STATE', logical_name: 'COMMON_BUSTIE_STATE',
    description: 'Bus tie breaker state',
    engineering_unit: null, data_type: 'enum', category: 'status',
    value: 'CLOSED', states: ['CLOSED', 'OPEN', 'TRIP'],
    ...common, screens: ['Common.Overview'], trend_enabled: false
  });
}

/* ---------------------------------------------------------------------
   Per-genset electrical + auxiliaries shown on the plant overview,
   start-air page and the Control page. Written for all six units so the
   remaining screens come for free as they are built.
   ------------------------------------------------------------------ */
for (let n = 1; n <= 6; n++) {
  const u = `G${n}`, p = `G0${n}`;
  const overview = ['Common.Overview'];
  const ctrl = [`${u}.Control`];

  analog(`${p}_KW`, `Gen. active power (${u})`, 'kW', n === 4 ? 0 : 7880, 'power',
    { unit: u, screens: overview });
  analog(`${p}_KVAR`, `Gen. reactive power (${u})`, 'kVAr', n === 4 ? 0 : 320, 'power',
    { unit: u, screens: overview });
  analog(`${p}_PF`, `Gen. power factor (${u})`, '', 1.0, 'power',
    { unit: u, screens: overview, trend_enabled: false });
  analog(`${p}_BOOSTER_FLOW`, `Booster unit flow (${u})`, 'kg/h', n === 4 ? 0 : 1550, 'flow',
    { unit: u, screens: overview });
  digital(`${p}_BREAKER`, `Generator breaker closed (${u})`, n !== 4,
    { unit: u, screens: [...overview, ...ctrl] });
  digital(`${p}_BOOSTER_V`, `Booster inlet valve (${u})`, n !== 4, { unit: u, screens: overview });
  digital(`${p}_RUNNING`, `Engine running (${u})`, n !== 4,
    { unit: u, screens: [...overview, 'Common.StartAir'] });

  /* Equipment state drives colour across every screen. Any unit can be
     in any of these at any time; maintenance is set from the Maintenance
     selector on the overview, not by the engine itself. */
  make({
    tag_id: `${p}_STATE`, logical_name: `${p}_STATE`,
    description: `Genset state (${u})`,
    engineering_unit: null, data_type: 'enum', category: 'status',
    value: n === 4 ? 'STOPPED' : 'RUNNING',
    states: ['RUNNING', 'STOPPED', 'MAINTENANCE', 'TRIP'],
    unit: u, screens: [...overview, 'Common.StartAir', `${u}.Fuel`], trend_enabled: false
  });
  make({
    tag_id: `${p}_BREAKER_STATE`, logical_name: `${p}_BREAKER_STATE`,
    description: `Generator breaker state (${u})`,
    engineering_unit: null, data_type: 'enum', category: 'status',
    value: n === 4 ? 'OPEN' : 'CLOSED',
    states: ['CLOSED', 'OPEN', 'TRIP'],
    unit: u, screens: [...overview, ...ctrl], trend_enabled: false
  });
  for (const q of ['P1', 'P2']) {
    digital(`${p}_BOOSTER_${q}`, `Booster pump ${q} running (${u})`, q === 'P1' && n !== 4,
      { unit: u, screens: overview });
  }

  // start air, two independent supplies per engine
  for (const s of ['A', 'B']) {
    analog(`${p}_START_AIR_PRESS_${s}`, `Starting air pressure ${s} (${u})`, 'bar',
      n === 4 ? 0.1 : 27.6, 'pressure', {
        unit: u, screens: ['Common.StartAir'],
        alarm_limits: { hihi: null, hi: null, lo: 18, lolo: 15 }
      });
  }
}

/* G1 Control page detail */
{
  const u = 'G1', screens = ['G1.Control'];
  for (let i = 1; i <= 19; i++) {
    digital(`G01_STARTCOND_${i}`, `Start condition ${i}`, false, { unit: u, screens });
  }
  for (let i = 1; i <= 20; i++) {
    digital(`G01_MISC_${i}`, `Miscellaneous status ${i}`, false, { unit: u, screens });
  }
  for (const l of ['L1', 'L2', 'L3']) {
    analog(`G01_CURRENT_${l}`, `Generator current ${l}`, 'A', 512, 'current', {
      unit: u, screens, alarm_limits: { hihi: 900, hi: 820, lo: null, lolo: null }
    });
  }
  for (const l of ['U12', 'U23', 'U31']) {
    analog(`G01_VOLTAGE_${l}`, `Generator voltage ${l}`, 'kV', 11.02, 'voltage', {
      unit: u, screens, alarm_limits: { hihi: 12.1, hi: null, lo: null, lolo: 9.9 }
    });
  }
  for (const r of ['VAMP210', 'VAMP265', 'VAMP260', 'P127']) {
    digital(`G01_RELAY_${r}`, `Protection relay ${r} healthy`, true, { unit: u, screens });
  }
  digital('G01_BRK_TRIP_HEALTHY', 'Breaker trip circuit healthy', true, { unit: u, screens });
  digital('G01_VOLT_SUPERV', 'Generator voltage supervision healthy', true, { unit: u, screens });
  digital('G01_CB_AVAILABLE', 'Circuit breaker available', true, { unit: u, screens });
  for (const sub of ['READY', 'PREVIOUS_FAILED']) {
    digital(`G01_SEQ_${sub}`, `Start preparation — ${sub.toLowerCase().replace('_', ' ')}`,
      sub === 'READY', { unit: u, screens });
  }
  analog('G01_AVR_RATIO', 'Main AVR ratio', '', 1.88, 'ratio', { unit: u, screens });
  analog('G01_POWER_SETPOINT', 'Active power setpoint', 'kW', 6762, 'power',
    { unit: u, screens });
  analog('G01_PF_SETPOINT', 'Power factor setpoint', '', 1.0, 'power', { unit: u, screens });
  analog('G01_PF_ACTUAL', 'Power factor actual', '', 1.0, 'power', { unit: u, screens });
  analog('G01_ACTIVE_ENERGY', 'Active energy', 'kWh', 33172463, 'energy',
    { unit: u, screens, trend_enabled: false });
  analog('G01_REACTIVE_ENERGY_EXPORT', 'Reactive energy export', 'kVArh', 4852413, 'energy',
    { unit: u, screens, trend_enabled: false });
  analog('G01_REACTIVE_ENERGY_IMPORT', 'Reactive energy import', 'kVArh', 302486, 'energy',
    { unit: u, screens, trend_enabled: false });
  digital('G01_BRK_SPRING', 'Breaker spring charged', true, { unit: u, screens });
  digital('G01_BRK_PARALLEL', 'Parallel operation', true, { unit: u, screens });
  digital('G01_AVR_ON', 'AVR in operation', true, { unit: u, screens });
  analog('G01_AVR_CURRENT', 'AVR excitation current', 'A', 2.4, 'current', { unit: u, screens });
  analog('G01_AVR_VOLTAGE', 'AVR excitation voltage', 'V', 48, 'voltage', { unit: u, screens });
}

/* G1 Fuel page detail */
{
  const u = 'G1', screens = ['G1.Fuel'];
  digital('G01_MIXTANK_LEVEL', 'Mixing tank level switch', false, { unit: u, screens });
  analog('G01_MIXTANK_TEMP', 'Mixing tank temperature', '°C', 31.6, 'temperature',
    { unit: u, screens });
  analog('G01_CIRC_TEMP', 'Circulation loop temperature', '°C', 42, 'temperature',
    { unit: u, screens, alarm_limits: { hihi: null, hi: 60, lo: null, lolo: null } });
  analog('G01_CTRLPANEL_TEMP', 'Control panel BJA011 temperature', '°C', 36, 'temperature',
    { unit: u, screens });
  analog('G01_LT_COUNT', 'LT loop counter', '', 749, 'count',
    { unit: u, screens, trend_enabled: false });
  analog('G01_DIRTYLEAK_TEMP', 'Dirty leak tank temperature', '°C', 37, 'temperature',
    { unit: u, screens });
  digital('G01_DIRTYLEAK_LEVEL', 'Dirty leak tank level switch', false, { unit: u, screens });
  digital('G01_CLEANLEAK_LEVEL', 'Clean leak tank level switch', false, { unit: u, screens });
  for (const [t, d, v] of [
    ['G01_CIRC_PUMP1', 'Circulation pump 1 running', true],
    ['G01_CIRC_PUMP2', 'Circulation pump 2 running', false],
    ['G01_CIRC_V1', 'Circulation valve 1 open', true],
    ['G01_CIRC_V2', 'Circulation valve 2 open', true],
    ['G01_LT_PUMP', 'LT pump running', true],
    ['G01_DIRTY_PUMP', 'Dirty leak pump running', false],
    ['G01_CLEAN_PUMP', 'Clean leak pump running', true],
    ['G01_INLET_PRESS_SENSOR', 'Engine inlet pressure sensor healthy', true],
    ['G01_MOUNT_L1', 'Engine mount level switch 1', false],
    ['G01_MOUNT_L2', 'Engine mount level switch 2', false]
  ]) digital(t, d, v, { unit: u, screens });
}

const list = [...out.values()].sort((a, b) => a.tag_id.localeCompare(b.tag_id));
writeFileSync(join(TAGS_DIR, 'tags.generated.json'), JSON.stringify(list, null, 2) + '\n');
console.log(`wrote tags.generated.json — ${list.length} tags ` +
            `(${authored.length} authored, ${generated} generated)`);
