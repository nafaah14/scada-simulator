/* =====================================================================
   G1 → Control
   ---------------------------------------------------------------------
   The operating page: start conditions, the start/stop sequence with its
   command buttons interleaved at the step they belong to (not clustered
   at the bottom), breaker state, generator measurements, and the mode
   and protection panels.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

const PANEL = { fill: '#e8ebee', stroke: '#9aa2ab' };
const HEAD = '#ccd2d8';

export function g1Control() {
  const B = builder();

  /* A titled panel — the basic building block of this page. */
  const panel = (x, y, w, h, title) => {
    B.rect(x, y, w, h, { ...PANEL, name: title });
    B.rect(x, y, w, 22, { fill: HEAD, stroke: '#9aa2ab' });
    B.text(x + 8, y + 6, w - 16, title, { size: 10, bold: true });
  };

  /* ---------- starting conditions ---------- */
  const CONDS = [
    ['LO press > 0.3 bar or Prelube in Auto', true],
    ['Fuel oil inlet pressure > 4.0 bar', false],
    ['HT- water temperature > 16 °C', true],
    ['Starting air pressure > 16 bar', false],
    ['Control air pressure > 16 bar', true],
    ['AVR MCB closed', true],
    ['Turning gear disengaged', true],
    ['Stop lever in running position', true],
    ['Breaker conditions', true],
    ['Engine stopped', true],
    ['ESM stop/shd. and autostop inactive', true],
    ['Engine room emerg. stop inactive', true],
    ['Control room emerg. stop inactive', true],
    ['Power plant emerg. stop inactive', true],
    ['Breaker trip alarm inactive', true],
    ['Engine shutdown alarm inactive', true],
    ['Start failure inactive', true],
    ['Soft energizing not active', true]
  ];
  panel(20, 20, 300, 430, 'Starting Conditions');
  CONDS.forEach(([label, ok], i) => {
    const y = 52 + i * 21;
    B.led(32, y, `G01_STARTCOND_${i + 1}`,
      { w: 10, h: 10, fill: C.green, onColor: C.green, offColor: C.red,
        stroke: ok ? '#1c6b32' : '#a33' });
    B.text(50, y - 1, 258, label, { size: 9.5 });
  });

  /* ---------- start/stop sequence ---------- */
  panel(336, 20, 300, 500, 'Start/Stop Sequence');
  const STEPS = [
    { label: 'Engine ready for start', after: { text: 'Start order', key: 'Ctrl+Insert' } },
    { label: 'Start preparation', after: { text: 'Exec', key: '', small: true } },
    { label: 'Starting' },
    { label: 'Idle running' },
    { label: 'Synchronizing' },
    { label: 'Loading' },
    { label: 'Normal operation', after: { text: 'Stop order', key: 'Ctrl+Delete' } },
    { label: 'Unloading' },
    { label: 'Cooling run' },
    { label: 'Engine stopped', after: { text: 'Shutdown reset', key: 'Ctrl+End' } }
  ];
  let sy = 52;
  const ACTIVE = 6;                       // running normally
  STEPS.forEach((s, i) => {
    B.rect(348, sy, 6, 16, { fill: i === ACTIVE ? C.green : '#b6bdc4', stroke: '#8a929b' });
    B.text(362, sy + 2, 240, s.label,
      { size: 9.5, bold: i === ACTIVE, color: i === ACTIVE ? '#0f1a12' : '#1d242b' });
    sy += 22;
    if (s.after) {
      const w = s.after.small ? 70 : 150;
      B.button(362, sy, w, s.after.key ? 28 : 20,
        s.after.key ? `${s.after.text}\n${s.after.key}` : s.after.text, { size: 9 });
      sy += (s.after.key ? 34 : 26);
      if (i === 1) {
        B.text(362, sy, 160, 'Safety stop system — Ready', { size: 9, color: '#4a545e' });
        sy += 18;
      }
    }
  });
  B.text(348, 470, 120, 'Engine speed', { size: 9.5, color: '#4a545e' });
  B.ro(348, 484, 276, 24, '748 rpm', 'SCA011ST103PV', { bold: true, size: 12, align: 'right' });

  /* ---------- breaker ---------- */
  panel(652, 20, 250, 200, 'Breaker');
  B.breaker(700, 60, 'G01_BREAKER', { size: 26, closed: true, name: 'Generator breaker' });
  B.text(736, 62, 150, 'Generator breaker', { size: 9.5 });
  [['Trp. circuit healthy', 'G01_BRK_TRIP_HEALTHY'],
   ['Breaker spring charged', 'G01_BRK_SPRING'],
   ['Parallel operation', 'G01_BRK_PARALLEL'],
   ['AVR in operation', 'G01_AVR_ON']].forEach(([label, tag], i) => {
    const y = 100 + i * 20;
    B.led(668, y, tag, { w: 10, h: 10, shape: 'square' });
    B.text(686, y - 1, 200, label, { size: 9.5 });
  });
  B.button(668, 186, 218, 22, 'Breaker trip reset   Ctrl+Home', { size: 9 });

  /* ---------- generator measurements ---------- */
  panel(652, 236, 560, 284, 'Generator Measurements');
  const bar = (x, label, value, tag, opt = {}) => {
    B.text(x, 268, 56, label, { size: 9, align: 'center', color: '#4a545e' });
    B.gauge(x + 14, 282, 28, 150, tag, {
      min: opt.min ?? 0, max: opt.max ?? 100, value: opt.value ?? 0,
      marker: opt.marker ?? null, fill: opt.fill ?? C.green
    });
    B.ro(x - 4, 440, 64, 20, value, tag, { size: 9.5, decimals: opt.decimals ?? null });
  };
  bar(668, 'P / Active', '7887 kW', 'SCA011PW104PV',
    { min: 0, max: 9600, value: 7887, marker: 8924 });
  bar(740, 'Q / Reactive', '335 kVAr', 'G01_GEN_REACTIVE_POWER',
    { min: -400, max: 800, value: 335 });
  ['L1', 'L2', 'L3'].forEach((l, i) =>
    bar(824 + i * 72, 'Current ' + l, '512 A', `G01_CURRENT_${l}`,
      { min: 0, max: 900, value: 512, fill: '#3f8fce', decimals: 0 }));
  ['U12', 'U23', 'U31'].forEach((l, i) =>
    bar(1040 + i * 58, l, '11.02 kV', `G01_VOLTAGE_${l}`,
      { min: 0, max: 12, value: 11.02, fill: '#d99418', decimals: 2 }));
  B.text(668, 470, 90, 'Frequency', { size: 9.5, color: '#4a545e' });
  B.ro(668, 484, 120, 24, '50.00 Hz', 'COMMON_BUSBAR1_FREQ',
    { bold: true, size: 12, decimals: 2 });
  B.text(820, 470, 90, 'AVR', { size: 9.5, color: '#4a545e' });
  B.ro(820, 484, 90, 24, '2.4 A', 'G01_AVR_CURRENT', { size: 11, decimals: 1 });
  B.ro(918, 484, 90, 24, '48 V', 'G01_AVR_VOLTAGE', { size: 11, decimals: 0 });

  /* ---------- mode ---------- */
  panel(20, 466, 300, 250, 'Mode');
  const modeRow = (y, opts) => opts.forEach(([label, active], i) => {
    B.button(32 + i * 138, y, 130, 22, label,
      { fill: active ? C.green : '#e4e7ea', color: active ? '#fff' : '#1d242b', size: 9.5 });
  });
  modeRow(500, [['Auto', true], ['Manual', false]]);
  modeRow(528, [['Remote', true], ['Local', false]]);
  modeRow(556, [['Grid mode', true], ['Island mode', false]]);
  B.text(32, 588, 200, 'Engine control', { size: 9, bold: true, color: '#4a545e' });
  modeRow(602, [['kW', true], ['Speed droop', false]]);
  B.text(32, 634, 200, 'Generator control', { size: 9, bold: true, color: '#4a545e' });
  B.button(32, 648, 84, 22, 'pf', { fill: C.green, color: '#fff', size: 9.5 });
  B.button(122, 648, 84, 22, 'Voltage droop', { size: 9.5 });
  B.button(212, 648, 84, 22, 'VDC', { size: 9.5 });

  /* ---------- protection, monitoring and control ---------- */
  panel(336, 536, 876, 180, 'Protection, Monitoring and Control');
  ['VAMP210', 'VAMP265', 'VAMP260', 'P127'].forEach((relay, i) => {
    const x = 350 + i * 96;
    B.rect(x, 566, 88, 40, { fill: '#e4e7ea', stroke: '#8a929b', name: relay });
    B.led(x + 8, 578, `G01_RELAY_${relay}`, { w: 10, h: 10 });
    B.text(x + 24, 578, 62, relay, { size: 9 });
  });
  B.text(350, 618, 200, 'Miscellaneous', { size: 9, bold: true, color: '#4a545e' });
  const MISC = [
    'MCB open in CFC', 'MCB open in CFE', 'MCB open in BJA', 'MCB open in main AVR circuit',
    'Synchronizing not activated', 'Synchronizing failure', 'Excitation failure',
    'Diff. prot. relay eng. shutdown', 'Gen. prot. relay breaker trip', 'Tripped to speed droop',
    'AVR synch. disabled', 'AVR overvoltage', 'Diode monitor trip', 'Control voltage fault',
    'LV circuit breaker open', 'Engine idling too long', 'Busbar Voltage superv.'
  ];
  MISC.forEach((m, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 350 + col * 290, y = 634 + row * 16;
    B.led(x, y, `G01_MISC_${i + 1}`,
      { w: 8, h: 8, onColor: C.red, offColor: '#b6bdc4', stroke: '#8a929b' });
    B.text(x + 14, y - 2, 272, m, { size: 8.5 });
  });

  return {
    screen_id: 'G1.Control',
    title: 'G1 — Control',
    unit: 'G1',
    layout: 'canvas',
    canvas: { width: 1240, height: 740, background: C.ground },
    elements: B.elements
  };
}
