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


/* ---------------------------------------------------------------------
   G1 auxiliary systems: lube oil, cooling water, exhaust / charge air.
   ------------------------------------------------------------------ */
{
  const u = 'G1';

  // -------- lube oil --------
  const lube = ['G1.Lube'];
  analog('G01_LUBE_PRESS', 'Lube oil pressure to engine', 'bar', 4.6, 'pressure', {
    unit: u, screens: lube,
    alarm_limits: { hihi: null, hi: null, lo: 3.5, lolo: 2.8 },
    shutdown_limits: { hi: null, lo: 2.5 }
  });
  analog('G01_LUBE_TEMP', 'Lube oil temperature to engine', '\u00b0C', 63, 'temperature', {
    unit: u, screens: lube,
    alarm_limits: { hihi: null, hi: 78, lo: null, lolo: null },
    shutdown_limits: { hi: 85, lo: null }
  });
  analog('G01_LUBE_FILTER_DP', 'Lube oil filter differential pressure', 'bar', 0.7,
    'pressure', { unit: u, screens: lube,
      alarm_limits: { hihi: null, hi: 1.5, lo: null, lolo: null } });
  analog('G01_LUBE_TCA_PRESS', 'TC A lube oil pressure', 'bar', 1.8, 'pressure',
    { unit: u, screens: lube, alarm_limits: { hihi: null, hi: null, lo: 1.2, lolo: 0.9 } });
  analog('G01_LUBE_TCB_PRESS', 'TC B lube oil pressure', 'bar', 1.7, 'pressure',
    { unit: u, screens: lube, alarm_limits: { hihi: null, hi: null, lo: 1.2, lolo: 0.9 } });
  analog('G01_CRANKCASE_PRESS', 'Crankcase pressure', 'mbar', -0.2, 'pressure', {
    unit: u, screens: lube,
    alarm_limits: { hihi: 3, hi: 1, lo: null, lolo: null },
    shutdown_limits: { hi: 5, lo: null }
  });
  for (const [t, d, v] of [
    ['G01_LUBE_PUMP_MAIN', 'Main lube oil pump running', true],
    ['G01_LUBE_PUMP_STBY', 'Standby lube oil pump running', false],
    ['G01_LUBE_FILTER_V', 'Lube oil filter inlet valve', true],
    ['G01_SEP_FEED_PUMP', 'Lube oil separator feed pump running', true],
    ['G01_SEP_SLUDGE_PUMP', 'Separator sludge pump running', false],
    ['G01_SEP_V1', 'Separator inlet valve', true],
    ['G01_OIL_MIST_FAN', 'Oil mist separator fan running', true],
    ['G01_MOBILE_PUMP_V', 'Mobile pump connection valve', false]
  ]) digital(t, d, v, { unit: u, screens: lube });

  // -------- cooling water --------
  const cool = ['G1.Cooling'];
  analog('G01_HT_TEMP', 'HT water temperature to engine', '\u00b0C', 90, 'temperature', {
    unit: u, screens: cool,
    alarm_limits: { hihi: null, hi: 96, lo: null, lolo: null },
    shutdown_limits: { hi: 100, lo: null }
  });
  analog('G01_HT_PRESS', 'HT water pressure', 'bar', 3.8, 'pressure',
    { unit: u, screens: cool, alarm_limits: { hihi: null, hi: null, lo: 2.0, lolo: 1.5 } });
  analog('G01_LT_TEMP', 'LT water temperature to engine', '\u00b0C', 46, 'temperature', {
    unit: u, screens: cool,
    alarm_limits: { hihi: null, hi: 55, lo: null, lolo: null }
  });
  analog('G01_LT_PRESS', 'LT water pressure', 'bar', 3.9, 'pressure',
    { unit: u, screens: cool, alarm_limits: { hihi: null, hi: null, lo: 2.0, lolo: 1.5 } });
  analog('G01_HT_VALVE_POS', 'HT temperature control valve position', '%', 78, 'position',
    { unit: u, screens: cool });
  analog('G01_LT_VALVE_POS', 'LT temperature control valve position', '%', 25, 'position',
    { unit: u, screens: cool });
  analog('G01_HT_JACKET_TEMP', 'HT water jacket outlet temperature', '\u00b0C', 74,
    'temperature', { unit: u, screens: cool });
  analog('G01_HT_RETURN_TEMP', 'HT water return temperature', '\u00b0C', 82, 'temperature',
    { unit: u, screens: cool });
  analog('G01_LT_RETURN_TEMP', 'LT water return temperature', '\u00b0C', 59, 'temperature',
    { unit: u, screens: cool });
  analog('G01_LT_SUPPLY_TEMP', 'LT water supply from central cooler', '\u00b0C', 32,
    'temperature', { unit: u, screens: cool });
  analog('G01_HT_OUT_A', 'HT water outlet bank A', '\u00b0C', 96, 'temperature',
    { unit: u, screens: cool, alarm_limits: { hihi: null, hi: 102, lo: null, lolo: null } });
  analog('G01_HT_OUT_B', 'HT water outlet bank B', '\u00b0C', 96, 'temperature',
    { unit: u, screens: cool, alarm_limits: { hihi: null, hi: 102, lo: null, lolo: null } });
  analog('G01_SW_PRESS', 'Sea water pressure', 'bar', 3.0, 'pressure',
    { unit: u, screens: cool, alarm_limits: { hihi: null, hi: null, lo: 1.5, lolo: 1.0 } });
  analog('G01_SW_TEMP', 'Sea water inlet temperature', '\u00b0C', 30, 'temperature',
    { unit: u, screens: cool });
  analog('G01_MED_IN_TEMP', 'MED unit inlet temperature', '\u00b0C', 42, 'temperature',
    { unit: u, screens: cool, alarm_limits: { hihi: 40, hi: 36, lo: null, lolo: null } });
  analog('G01_MED_OUT_TEMP', 'MED unit outlet temperature', '\u00b0C', 38, 'temperature',
    { unit: u, screens: cool });
  for (let i = 1; i <= 2; i++) {
    analog(`G01_AUX_FAN_${i}_A`, `Aux ventilation fan ${i} current`, 'A', 32, 'current',
      { unit: u, screens: cool });
    digital(`G01_AUX_FAN_${i}`, `Aux ventilation fan ${i} running`, true,
      { unit: u, screens: cool });
    digital(`G01_SW_PUMP_${i}`, `Sea water pump ${i} running`, i === 1,
      { unit: u, screens: cool });
    digital(`G01_SW_PUMP_${i}_STBY`, `Sea water pump ${i} standby running`, false,
      { unit: u, screens: cool });
  }
  digital('G01_MAINT_WATER_LEVEL', 'Maintenance water tank level', false,
    { unit: u, screens: cool });
  digital('G01_EXP_VESSEL_LEVEL', 'Expansion vessel level', false,
    { unit: u, screens: cool });
  for (const [t, d, v] of [
    ['G01_HT_PUMP', 'HT circulating pump running', true],
    ['G01_LT_PUMP', 'LT circulating pump running', true],
    ['G01_PREHEATER_PUMP', 'Preheater pump running', false],
    ['G01_FO_COOLER_PUMP', 'Fuel oil cooler pump running', true],
    ['G01_MAINT_WATER_PUMP', 'Maintenance water pump running', false],
    ['G01_HT_TC_VALVE', 'HT temperature control valve open', true],
    ['G01_LT_TC_VALVE', 'LT temperature control valve open', true],
    ['G01_SW_V1', 'Sea water valve 1 open', true],
    ['G01_SW_V2', 'Sea water valve 2 open', true]
  ]) digital(t, d, v, { unit: u, screens: cool });

  // -------- exhaust / charge air --------
  const exh = ['G1.Exhaust'];
  analog('G01_CHARGE_AIR_PRESS', 'Charge air receiver pressure', 'bar', 2.77, 'pressure',
    { unit: u, screens: exh });
  analog('G01_CHARGE_AIR_TEMP', 'Charge air receiver temperature', '\u00b0C', 57,
    'temperature', {
      unit: u, screens: exh,
      alarm_limits: { hihi: null, hi: 75, lo: null, lolo: null }
    });
  analog('G01_AIR_INTAKE_TEMP', 'Air intake temperature after filter', '\u00b0C', 33,
    'temperature', { unit: u, screens: exh });
  for (const v of ['V001', 'V002', 'V003', 'V004', 'V005', 'V006']) {
    digital(`G01_TCWASH_${v}`, `Turbocharger wash valve ${v}`, false,
      { unit: u, screens: exh });
  }

  // -------- shared ambient --------
  analog('COMMON_AMBIENT_TEMP', 'Ambient temperature', '\u00b0C', 30.2, 'temperature',
    { unit: 'COMMON', screens: [...exh, ...cool] });
  analog('COMMON_ABS_HUMIDITY', 'Absolute humidity', 'g/kg', 19.1, 'humidity',
    { unit: 'COMMON', screens: [...exh, ...cool] });
}


/* ---------------------------------------------------------------------
   11 kV switchgear: incomers, outgoing feeders, generator bays, the
   auxiliary transformers and the LV switchboard. Written per-bay so a
   new feeder is one entry rather than eight hand-written tags.
   ------------------------------------------------------------------ */
{
  const common = { unit: 'COMMON' };
  const E1 = ['Common.Electrical1'], E2 = ['Common.Electrical2'];

  const bay = (tag, desc, screens, amps) => {
    for (let i = 1; i <= 4; i++) {
      digital(`${tag}_L${i}`, `${desc} — status ${i}`, true, { ...common, screens });
    }
    analog(`${tag}_CURRENT`, `${desc} current`, 'A', amps, 'current',
      { ...common, screens });
    make({
      tag_id: `${tag}_CB`, logical_name: `${tag}_CB`,
      description: `${desc} breaker state`,
      engineering_unit: null, data_type: 'enum', category: 'status',
      value: 'CLOSED', states: ['CLOSED', 'OPEN', 'TRIP'],
      ...common, screens, trend_enabled: false
    });
    digital(`${tag}_ISO`, `${desc} isolator closed`, false, { ...common, screens });
  };

  // outgoing feeders and interconnections
  for (const [t, d, sc, a] of [
    ['COMMON_BAO901', 'Outgoing feeder 6', E2, 103],
    ['COMMON_BAO902', 'Outgoing feeder 7', E2, 0],
    ['COMMON_BAO903', 'Outgoing feeder 8', E2, 0],
    ['COMMON_BAO904', 'Outgoing feeder 9', E2, 280],
    ['COMMON_BAO905', 'Outgoing feeder 10', E2, 300],
    ['COMMON_BAO906', 'Interconnection Phase 2 (BAO906)', E2, 4],
    ['COMMON_BAO907', 'Outgoing feeder 5', E1, 0],
    ['COMMON_BAO908', 'Outgoing feeder 4', E1, 0],
    ['COMMON_BAO909', 'Outgoing feeder 3', E1, 0],
    ['COMMON_BAO910', 'Outgoing feeder 2', E1, 0],
    ['COMMON_BAO911', 'Outgoing feeder 1', E1, 0],
    ['COMMON_BAO912', 'Interconnection Phase 2 (BAO912)', E1, 0]
  ]) bay(t, d, sc, a);

  // transformer incomers
  bay('COMMON_BAI901_A', 'AET 901 incomer A', E2, 346);
  bay('COMMON_BAI901_B', 'AET 901 incomer B', E2, 343);
  bay('COMMON_BAI902_A', 'AET 902 incomer A', E1, 350);
  bay('COMMON_BAI902_B', 'AET 902 incomer B', E1, 362);

  // generator bays — the machine tags already exist, these are the bay
  for (let n = 1; n <= 6; n++) {
    const p = `G0${n}`;
    const sc = n <= 3 ? E2 : E1;
    digital(`${p}_ISO`, `Generator ${n} isolator closed`, false, { ...common, screens: sc });
    analog(`${p}_KW_SETPOINT`, `Generator ${n} kW setpoint`, 'kW', 7000, 'power',
      { ...common, screens: sc });
    analog(`${p}_PF_SETPOINT`, `Generator ${n} pf setpoint`, '', 1.0, 'power',
      { ...common, screens: sc });
  }

  // auxiliary transformers and LV switchboard
  for (const [t, sc, hv, lv] of [
    ['COMMON_BFB901', E2, 38, 1028], ['COMMON_BFB902', E1, 0, 2]
  ]) {
    for (let i = 1; i <= 4; i++) {
      digital(`${t}_L${i}`, `${t} status ${i}`, true, { ...common, screens: sc });
    }
    for (let i = 0; i < 4; i++) {
      digital(`${t}_LV${i}`, `${t} LV breaker status ${i}`, true, { ...common, screens: sc });
    }
    analog(`${t}_CURRENT`, `${t} HV current`, 'A', hv, 'current', { ...common, screens: sc });
    analog(`${t}_LV_CURRENT`, `${t} LV current`, 'A', lv, 'current',
      { ...common, screens: sc });
    digital(`${t}_ISO`, `${t} isolator closed`, false, { ...common, screens: sc });
    digital(`${t}_VOLTAGE`, `${t} voltage on`, true, { ...common, screens: sc });
    for (const suffix of ['_CB', '_LV_CB']) {
      make({
        tag_id: `${t}${suffix}`, logical_name: `${t}${suffix}`,
        description: `${t}${suffix} breaker state`,
        engineering_unit: null, data_type: 'enum', category: 'status',
        value: 'CLOSED', states: ['CLOSED', 'OPEN', 'TRIP'],
        ...common, screens: sc, trend_enabled: false
      });
    }
  }

  // busbar voltage metering
  analog('COMMON_BAM901_VOLTAGE', 'Busbar 1 voltage', 'kV', 10.9, 'voltage',
    { ...common, screens: E2, alarm_limits: { hihi: 12.1, hi: null, lo: null, lolo: 9.9 } });
  analog('COMMON_BAM902_VOLTAGE', 'Busbar 2 voltage', 'kV', 10.9, 'voltage',
    { ...common, screens: E1, alarm_limits: { hihi: 12.1, hi: null, lo: null, lolo: 9.9 } });

  // LV distribution
  for (const [t, sc, v] of [
    ['COMMON_BEY914', E2, 117], ['COMMON_BEY913', E2, 119],
    ['COMMON_BEY901', E2, 25], ['COMMON_BEY902', E1, 25]
  ]) analog(`${t}_VOLTAGE`, `${t} output voltage`, 'V', v, 'voltage',
    { ...common, screens: sc });
  analog('COMMON_LV_TIE_CURRENT', 'LV bus tie current', 'A', 436, 'current',
    { ...common, screens: E2 });
  make({
    tag_id: 'COMMON_LV_TIE_CB', logical_name: 'COMMON_LV_TIE_CB',
    description: 'LV bus tie breaker state',
    engineering_unit: null, data_type: 'enum', category: 'status',
    value: 'CLOSED', states: ['CLOSED', 'OPEN', 'TRIP'],
    ...common, screens: E2, trend_enabled: false
  });
  digital('COMMON_LV1_VOLTAGE', 'LV busbar 1 voltage on', true, { ...common, screens: E2 });
  digital('COMMON_LV2_VOLTAGE', 'LV busbar 2 voltage on', true, { ...common, screens: E1 });

  // standby set on LV busbar 2
  analog('COMMON_BLM901_CURRENT', 'Standby generator current', 'A', 0, 'current',
    { ...common, screens: E1 });
  make({
    tag_id: 'COMMON_BLM901_CB', logical_name: 'COMMON_BLM901_CB',
    description: 'Standby generator breaker state',
    engineering_unit: null, data_type: 'enum', category: 'status',
    value: 'CLOSED', states: ['CLOSED', 'OPEN', 'TRIP'],
    ...common, screens: E1, trend_enabled: false
  });
  for (let i = 0; i < 5; i++) {
    digital(`COMMON_BLM901_ST${i}`, `Standby generator status ${i + 1}`, true,
      { ...common, screens: E1 });
  }

  // switchgear-wide status and control panels
  for (let i = 0; i < 5; i++) {
    digital(`COMMON_BB1_ST${i}`, `Busbar 1 switchgear status ${i + 1}`, i === 2 || i === 4,
      { ...common, screens: E2 });
    digital(`COMMON_BB2_ST${i}`, `Busbar 2 switchgear status ${i + 1}`, i === 2 || i === 4,
      { ...common, screens: E1 });
  }
  for (let i = 0; i < 2; i++) {
    digital(`COMMON_SYNC_${i}`, `Synchronizer mode ${i + 1}`, true,
      { ...common, screens: [...E1, ...E2] });
  }
  digital('COMMON_LS_CONTROL_ACTIVE', 'Load shedding control active', true,
    { ...common, screens: [...E1, ...E2] });
}


/* ---------------------------------------------------------------------
   Plant seawater cooling and the oily-water train. Both are per-machine
   loops, so they are written from tables rather than tag by tag.
   ------------------------------------------------------------------ */
{
  const common = { unit: 'COMMON' };
  const CW = ['Common.Cooling'], OW = ['Common.OilyWater'];

  // seawater intake basins and their band screens
  for (const n of [1, 2]) {
    analog(`COMMON_SW_BASIN${n}_LEVEL`, `Seawater basin ${n} level`, 'm', 3.0, 'level',
      { ...common, screens: CW, alarm_limits: { hihi: null, hi: null, lo: 2.2, lolo: 1.8 } });
    analog(`COMMON_SW_BASIN${n}_DEPTH`, `Seawater basin ${n} depth`, 'm', 4.1, 'level',
      { ...common, screens: CW });
    digital(`COMMON_SW_BASIN${n}_ALARM`, `Seawater basin ${n} low level switch`, false,
      { ...common, screens: CW });
  }

  // the four seawater pumps
  const SWP = [
    { n: 1, run: false, amps: 0,   bar: 0.3, pct: 100, t: 32, b: 32 },
    { n: 2, run: true,  amps: 244, bar: 3.5, pct: 100, t: 93, b: 91 },
    { n: 3, run: false, amps: 0,   bar: 0.3, pct: 0,   t: 32, b: 32 },
    { n: 4, run: true,  amps: 245, bar: 3.4, pct: 100, t: 89, b: 86 }
  ];
  for (const p of SWP) {
    const tag = `COMMON_SWP${p.n}`;
    for (let i = 1; i <= 5; i++) {
      analog(`${tag}_T${i}`, `Seawater pump ${p.n} motor winding ${i} temperature`,
        '°C', p.t, 'temperature',
        { ...common, screens: CW, alarm_limits: { hihi: 130, hi: 115, lo: null, lolo: null } });
      analog(`${tag}_B${i}`, `Seawater pump ${p.n} bearing ${i} temperature`,
        '°C', p.b, 'temperature',
        { ...common, screens: CW, alarm_limits: { hihi: 110, hi: 95, lo: null, lolo: null } });
    }
    digital(`${tag}_RUNNING`, `Seawater pump ${p.n} running`, p.run,
      { ...common, screens: CW });
    digital(`${tag}_RACK_IN`, `Seawater pump ${p.n} rack in`, true, { ...common, screens: CW });
    digital(`${tag}_CTRL_POWER`, `Seawater pump ${p.n} control power`, true,
      { ...common, screens: CW });
    digital(`${tag}_PERMIT`, `Seawater pump ${p.n} start permit`, true,
      { ...common, screens: CW });
    digital(`${tag}_REMOTE`, `Seawater pump ${p.n} remote permit`, true,
      { ...common, screens: CW });
    digital(`${tag}_SUCT_VALVE`, `Seawater pump ${p.n} suction valve open`, true,
      { ...common, screens: CW });
    digital(`${tag}_DISCH_VALVE`, `Seawater pump ${p.n} discharge valve open`, p.run,
      { ...common, screens: CW });
    analog(`${tag}_CURRENT`, `Seawater pump ${p.n} current`, 'A', p.amps, 'current',
      { ...common, screens: CW });
    analog(`${tag}_PRESSURE`, `Seawater pump ${p.n} discharge pressure`, 'bar', p.bar,
      'pressure',
      { ...common, screens: CW });   // an idle pump must not raise a standing alarm
    analog(`${tag}_SPEED`, `Seawater pump ${p.n} speed demand`, '%', p.pct, 'speed',
      { ...common, screens: CW });
  }

  // seawater headers and the overboard line
  analog('COMMON_SW_HEADER_PRESSURE', 'Seawater supply header pressure', 'bar', 2.9,
    'pressure',
    { ...common, screens: CW, alarm_limits: { hihi: null, hi: null, lo: 1.8, lolo: 1.2 } });
  analog('COMMON_SW_HEADER_TEMP', 'Seawater supply header temperature', '°C', 29,
    'temperature', { ...common, screens: CW });
  analog('COMMON_SW_RETURN_TEMP', 'Seawater return header temperature', '°C', 44,
    'temperature',
    { ...common, screens: CW, alarm_limits: { hihi: 43, hi: null, lo: null, lolo: null } });
  analog('COMMON_SW_OVERBOARD_TEMP', 'Seawater overboard temperature', '°C', 38,
    'temperature', { ...common, screens: CW });
  for (const t of ['COMMON_SW_BOOSTER1_RUNNING', 'COMMON_SW_BOOSTER2_RUNNING']) {
    digital(t, t.replace(/_/g, ' ').toLowerCase(), true, { ...common, screens: CW });
  }
  for (const t of ['COMMON_SW_OUTLET1_PERMIT', 'COMMON_SW_OUTLET2_PERMIT',
                   'COMMON_SW_OVERBOARD_PERMIT']) {
    digital(t, 'Seawater outlet valve remote permit', true, { ...common, screens: CW });
  }

  // engine-room LT cooling modules
  for (let n = 1; n <= 6; n++) {
    const plate = `VHA0${n}1`;
    digital(`COMMON_${plate}_MOTOR`, `${plate} LT pump motor running`, true,
      { ...common, screens: CW });
    digital(`COMMON_${plate}_ALARM`, `${plate} LT pump alarm`, n === 4,
      { ...common, screens: CW });
  }

  // MED distillation units
  for (const plate of ['CFA951', 'CFA952']) {
    digital(`COMMON_${plate}_RUNNING`, `${plate} MED unit running`, false,
      { ...common, screens: CW });
    digital(`COMMON_${plate}_STOPPED`, `${plate} MED unit stopped`, true,
      { ...common, screens: CW });
  }

  /* ---- oily water ---- */
  analog('COMMON_DAB901_LEVEL', 'Oily wastewater regulating tank level', '%', 64, 'level',
    { ...common, screens: OW, alarm_limits: { hihi: 92, hi: 85, lo: null, lolo: null } });
  for (const n of [1, 2]) {
    const tag = `COMMON_DAB901_P${n}`;
    digital(`${tag}_RUNNING`, `Oily water feed pump ${n} running`, n === 1,
      { ...common, screens: OW });
    digital(`${tag}_SUCT`, `Oily water feed pump ${n} suction valve open`, true,
      { ...common, screens: OW });
    digital(`${tag}_DISCH`, `Oily water feed pump ${n} discharge valve open`, n === 1,
      { ...common, screens: OW });
  }
  digital('COMMON_DBB901_INLET_VALVE', 'DBB 901 inlet valve open', true,
    { ...common, screens: OW });
  digital('COMMON_DBB901_FEED_VALVE', 'DBB 901 feed valve open', true,
    { ...common, screens: OW });
  for (const [t, d, v] of [
    ['COMMON_DBB901_RUNNING', 'DBB 901 treatment unit running', false],
    ['COMMON_DBB901_OILPUMP_RUNNING', 'DBB 901 separated oil pump running', false],
    ['COMMON_DBB901_CIRC_RUNNING', 'DBB 901 circulating pump running', true],
    ['COMMON_DBB901_DRAIN_RUNNING', 'DBB 901 drain pump running', false],
    ['COMMON_DBB901_TRANSFER_RUNNING', 'DBB 901 transfer pump running', false]
  ]) digital(t, d, v, { ...common, screens: OW });
  analog('COMMON_DBB901_PPM', 'Treated water oil content', 'ppm', 1, 'quality',
    { ...common, screens: OW, alarm_limits: { hihi: 15, hi: 10, lo: null, lolo: null } });
}

const list = [...out.values()].sort((a, b) => a.tag_id.localeCompare(b.tag_id));
writeFileSync(join(TAGS_DIR, 'tags.generated.json'), JSON.stringify(list, null, 2) + '\n');
console.log(`wrote tags.generated.json — ${list.length} tags ` +
            `(${authored.length} authored, ${generated} generated)`);
