/* =====================================================================
   G1 → Control
   ---------------------------------------------------------------------
   The operating page, laid out as five columns the way the real WOIS
   page is: starting conditions, the start/stop sequence, the breaker
   single-line, generator measurements, and mode + protection.

   Command buttons sit at the sequence step they belong to rather than
   being clustered at the bottom, and status lamps are unlit grey until
   their condition is true — an unlit list is the normal resting state,
   so green actually means something.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

const PANEL_BG = '#e6e9ec';
const HEAD_BG = '#c8ced4';
const LAMP_OFF = '#b6bdc4';

export function g1Control() {
  const B = builder();

  /* A titled column panel. */
  const panel = (x, y, w, h, title) => {
    B.rect(x, y, w, h, { fill: PANEL_BG, stroke: '#9aa2ab', name: title });
    B.rect(x, y, w, 20, { fill: HEAD_BG, stroke: '#9aa2ab' });
    B.text(x + 7, y + 5, w - 14, title, { size: 9.5, bold: true });
  };

  /* Status lamp: square, grey until its tag is true. */
  const lamp = (x, y, tag, label, opt = {}) => {
    B.led(x, y, tag, {
      w: opt.size ?? 11, h: opt.size ?? 11, shape: 'square',
      onColor: opt.onColor ?? C.green, offColor: opt.offColor ?? LAMP_OFF,
      stroke: '#6b7480'
    });
    if (label) {
      B.text(x + (opt.size ?? 11) + 6, y - 1, opt.labelW ?? 210, label, { size: 9 });
    }
  };

  /* ================= starting conditions ================= */
  const CONDS = [
    'LO press > 0.3 bar or Prelube in Auto',
    'Fuel oil inlet pressure > 4.0 bar',
    'HT- water temperature > 50 °C',
    'Starting air pressure > 16 bar',
    'Control air pressure > 16 bar',
    'AVR MCB closed',
    'Turning gear disengaged',
    'Stop lever in running position',
    'Breaker conditions',
    'Engine stopped',
    'ESM stop/shd. and autostop inactive',
    'Engine room emerg. stop inactive',
    'Control room emerg. stop inactive',
    'Power plant emerg. stop inactive',
    'Breaker trip alarm inactive',
    'Engine shutdown alarm inactive',
    'Start failure inactive',
    'Soft energizing not active',
    'Stop system test failed'
  ];
  panel(14, 14, 258, 470, 'STARTING CONDITIONS');
  CONDS.forEach((label, i) =>
    lamp(24, 44 + i * 22, `G01_STARTCOND_${i + 1}`, label, { labelW: 228 }));

  /* ================= start / stop sequence ================= */
  panel(284, 14, 208, 470, 'START/STOP SEQUENCE');
  const STEPS = [
    { label: 'Engine ready for start', cmd: { key: 'Ctrl+Insert', text: 'Start order' } },
    { label: 'Start preparation', subs: ['Safety stop system', 'Ready', 'Previous failed'] },
    { label: 'Starting' },
    { label: 'Idle running' },
    { label: 'Synchronizing' },
    { label: 'Loading' },
    { label: 'Normal operation', active: true,
      cmd: { key: 'Ctrl+Delete', text: 'Stop order' } },
    { label: 'Unloading' },
    { label: 'Cooling run' },
    { label: 'Engine stopped', cmd: { key: 'Ctrl+End', text: 'Shutdown reset' } }
  ];

  let sy = 40;
  STEPS.forEach((st, i) => {
    B.rect(296, sy, 9, 15, { fill: st.active ? C.green : LAMP_OFF, stroke: '#6b7480' });
    if (i < STEPS.length - 1) B.text(294, sy + 15, 13, '▼', { size: 8, color: '#6b7480' });
    B.text(314, sy + 2, 168, st.label,
      { size: 9.5, bold: !!st.active, color: st.active ? '#0f1a12' : '#1d242b' });
    sy += 22;

    if (st.subs) {
      B.text(316, sy, 160, st.subs[0], { size: 8.5, color: '#4a545e' });
      sy += 13;
      st.subs.slice(1).forEach(sub => {
        lamp(322, sy, 'G01_SEQ_' + sub.replace(/\W+/g, '_').toUpperCase(), sub,
          { size: 9, labelW: 140 });
        sy += 14;
      });
      sy += 2;
    }
    if (st.cmd) {
      B.text(314, sy, 120, st.cmd.key, { size: 8, color: '#4a545e' });
      B.button(314, sy + 10, 118, 20, st.cmd.text, { size: 9.5 });
      sy += 36;
    }
  });

  B.text(314, 414, 120, 'Ctrl+Home', { size: 8, color: '#4a545e' });
  B.button(314, 424, 118, 20, 'Breaker trip reset', { size: 9.5 });
  B.text(294, 456, 100, 'Engine speed', { size: 9, color: '#4a545e' });
  B.ro(384, 452, 98, 20, '753 rpm', 'SCA011ST103PV', { align: 'right', decimals: 0 });

  /* ================= breaker single-line ================= */
  panel(504, 14, 172, 470, 'BREAKER');
  B.rect(514, 40, 12, 12, { fill: '#ffffff', stroke: '#5a6068' });
  B.text(532, 40, 140, 'Paral. with grid', { size: 9 });

  // busbar → breaker → generator → excitation, drawn as a single line
  B.rect(536, 66, 108, 126, { fill: 'transparent', stroke: '#8a929b',
    dashed: true, name: 'Breaker cubicle' });
  B.pipeV(590, 58, 28, { color: '#3d4349', t: 2 });
  B.breaker(578, 86, 'G01_BREAKER_STATE', { size: 24, state: 'closed',
    name: 'Generator breaker' });
  B.pipeV(590, 110, 26, { color: '#3d4349', t: 2 });
  B.text(552, 112, 26, '⏚', { size: 13, color: '#3d4349' });
  B.rect(576, 136, 28, 28, { fill: C.green, stroke: '#007a00', radius: 14,
    name: 'Generator' });
  B.text(576, 143, 28, 'G1', { size: 10, align: 'center', bold: true, color: '#ffffff' });
  B.pipeV(590, 164, 8, { color: '#3d4349', t: 2 });
  B.rect(578, 172, 24, 18, { fill: C.red, stroke: '#a80c0c', name: 'Excitation' });

  [['AVR excitation', 'G01_AVR_ON'],
   ['Gen.voltage superv.', 'G01_VOLT_SUPERV'],
   ['Trp. circuit healthy', 'G01_BRK_TRIP_HEALTHY'],
   ['Breaker spring charged', 'G01_BRK_SPRING'],
   ['CB available', 'G01_CB_AVAILABLE']].forEach(([label, tag], i) =>
    lamp(514, 214 + i * 20, tag, label, { labelW: 152 }));

  B.text(524, 330, 100, 'Main AVR', { size: 8.5, color: '#4a545e' });
  B.rect(520, 342, 80, 56, { fill: PANEL_BG, stroke: '#8a929b' });
  B.ro(524, 346, 72, 16, '3.3 A', 'G01_AVR_CURRENT', { size: 9, decimals: 1 });
  B.ro(524, 364, 72, 16, '27.8 V', 'G01_AVR_VOLTAGE', { size: 9, decimals: 1 });
  B.ro(524, 382, 72, 14, '1.88', 'G01_AVR_RATIO', { size: 8.5, decimals: 2 });

  /* ================= generator measurements ================= */
  panel(688, 14, 452, 470, 'GENERATOR MEASUREMENTS');

  /* A gauge with its scale ticks written down the left. */
  const gauge = (x, y, w, h, tag, opt) => {
    (opt.scale || []).forEach(([frac, text]) =>
      B.text(x - 40, y + h - h * frac - 5, 38, text,
        { size: 7.5, align: 'right', color: '#4a545e' }));
    B.gauge(x, y, w, h, tag, {
      min: opt.min, max: opt.max, value: opt.value,
      marker: opt.marker ?? null, fill: opt.fill ?? C.green
    });
  };

  // P / Active power
  B.text(700, 40, 140, 'P / Active Power', { size: 9, bold: true });
  gauge(744, 58, 40, 148, 'SCA011PW104PV', {
    min: 0, max: 9600, value: 7799, marker: 8924,
    scale: [[1, '100 %'], [0.75, '75 %'], [0.5, '50 %'], [0, '0 %']]
  });
  B.text(790, 58, 46, 'Max', { size: 7.5, color: C.amber });
  B.ro(700, 214, 92, 19, '8924 kW', 'G01_MAX_AVAIL_POWER', { size: 9, decimals: 0 });
  B.text(796, 216, 70, 'Max avail.', { size: 8.5, color: '#4a545e' });
  B.ro(700, 236, 92, 19, '7799 kW', 'SCA011PW104PV', { size: 9, bold: true, decimals: 0 });
  B.text(700, 260, 30, 'Q^A', { size: 8, color: '#4a545e' });
  B.ro(732, 256, 84, 18, '6762 kW', 'G01_POWER_SETPOINT', { size: 8.5, decimals: 0 });

  // Q / Reactive power
  B.text(880, 40, 150, 'Q / Reactive Power', { size: 9, bold: true });
  gauge(930, 58, 40, 148, 'G01_GEN_REACTIVE_POWER', {
    min: -900, max: 900, value: -88,
    scale: [[1, '8.6 * S'], [0.5, '0 kVAr'], [0, '-9.3 * S']]
  });
  B.text(976, 58, 44, 'Lag', { size: 7.5, color: '#4a545e' });
  B.text(976, 126, 44, 'pf = 1', { size: 7.5, color: '#4a545e' });
  B.text(976, 196, 44, 'Lead', { size: 7.5, color: '#4a545e' });
  B.ro(884, 214, 92, 19, '1.00', 'G01_PF_SETPOINT', { size: 9, decimals: 2 });
  B.ro(884, 236, 92, 19, '-88 kVAr', 'G01_GEN_REACTIVE_POWER',
    { size: 9, bold: true, decimals: 0 });
  B.text(884, 260, 30, 'Q^F', { size: 8, color: '#4a545e' });
  B.ro(916, 256, 84, 18, '1.00', 'G01_PF_ACTUAL', { size: 8.5, decimals: 2 });

  // I / Current — three phases
  B.text(700, 292, 120, 'I / Current', { size: 9, bold: true });
  B.text(700, 320, 14, 'I', { size: 8, color: '#4a545e' });
  ['L1', 'L2', 'L3'].forEach((l, i) => {
    B.gauge(718 + i * 36, 310, 30, 92, `G01_CURRENT_${l}`,
      { min: 0, max: 900, value: 418, fill: C.green });
    B.text(718 + i * 36, 404, 30, l, { size: 8, align: 'center', color: '#4a545e' });
    B.text(700, 424 + i * 20, 26, l, { size: 8.5, color: '#4a545e' });
    B.ro(726, 420 + i * 20, 74, 18, '418 A', `G01_CURRENT_${l}`,
      { size: 8.5, decimals: 0 });
  });

  // U / Voltage — three line-to-line pairs
  B.text(880, 292, 120, 'U / Voltage', { size: 9, bold: true });
  B.text(880, 320, 14, 'U', { size: 8, color: '#4a545e' });
  ['U12', 'U23', 'U31'].forEach((l, i) => {
    B.gauge(900 + i * 36, 310, 30, 92, `G01_VOLTAGE_${l}`,
      { min: 9.5, max: 12, value: 10.9, fill: C.green });
    B.text(898 + i * 36, 404, 34, l, { size: 8, align: 'center', color: '#4a545e' });
    B.text(880, 424 + i * 20, 30, l, { size: 8.5, color: '#4a545e' });
    B.ro(912, 420 + i * 20, 74, 18, '10.9 kV', `G01_VOLTAGE_${l}`,
      { size: 8.5, decimals: 1 });
  });
  B.text(1012, 310, 34, '1.05', { size: 7.5, color: '#4a545e' });
  B.text(1012, 390, 34, '0.95', { size: 7.5, color: '#4a545e' });

  B.text(1016, 424, 84, 'Frequency', { size: 8.5, color: '#4a545e' });
  B.ro(1016, 440, 112, 20, '50.04 Hz', 'COMMON_BUSBAR1_FREQ',
    { size: 9.5, bold: true, decimals: 2 });

  /* ================= mode ================= */
  panel(1152, 14, 300, 244, 'MODE');
  const modePair = (y, left, right, leftOn) => {
    B.button(1234, y, 104, 20, left,
      { size: 9, fill: leftOn ? C.green : '#eef1f3', color: leftOn ? '#fff' : '#1d242b' });
    B.button(1344, y, 104, 20, right,
      { size: 9, fill: leftOn ? '#eef1f3' : C.green, color: leftOn ? '#1d242b' : '#fff' });
  };
  modePair(44, 'Auto', 'Manual', true);
  modePair(68, 'Remote', 'Local', true);
  modePair(102, 'Grid mode', 'Island mode', false);

  B.text(1160, 140, 70, 'Engine\ncontrol', { size: 8.5, color: '#4a545e', h: 22 });
  modePair(136, 'kW', 'Isoch', false);
  modePair(160, 'Speed droop', 'Speed droop', false);

  B.text(1160, 200, 70, 'Generator\ncontrol', { size: 8.5, color: '#4a545e', h: 22 });
  modePair(196, 'pf', 'VDC', false);
  modePair(220, 'Voltage droop', 'Voltage droop', false);

  /* ================= protection ================= */
  panel(1152, 268, 300, 84, 'PROTECTION, MONITORING AND CONTROL');
  ['VAMP210', 'VAMP265', 'VAMP260', 'P127'].forEach((relay, i) => {
    const x = 1160 + i * 73;
    B.text(x, 294, 68, relay, { size: 8, align: 'center', bold: true });
    B.rect(x + 12, 306, 44, 38, { fill: '#eef1f3', stroke: '#6b7480', name: relay });
    B.led(x + 17, 311, `G01_RELAY_${relay}`,
      { w: 9, h: 9, shape: 'square', onColor: C.green, offColor: LAMP_OFF });
    B.rect(x + 17, 325, 34, 13, { fill: '#c9ced3', stroke: '#8a929b' });
  });

  /* ================= miscellaneous ================= */
  panel(1152, 362, 300, 158, 'MISCELLANEOUS');
  const MISC = [
    'MCB open in CFC', 'AVR synch. disabled',
    'MCB open in CFE', 'AVR overvoltage',
    'MCB open in BJA', 'Diode monitor trip',
    'MCB open in main AVR circuit', 'Control voltage fault',
    'Synchronizing not activated', 'LV circuit breaker open',
    'Synchronizing failure', 'Engine idling too long',
    'Excitation failure', '',
    'Diff. prot. relay eng. shutdown', '',
    'Gen. prot. relay breaker trip', 'Busbar Voltage superv.',
    'Tripped to speed droop', ''
  ];
  MISC.forEach((m, i) => {
    if (!m) return;
    const col = i % 2, row = Math.floor(i / 2);
    lamp(1160 + col * 150, 386 + row * 13, `G01_MISC_${i + 1}`, m, {
      size: 8, labelW: 136,
      onColor: m === 'Busbar Voltage superv.' ? C.green : C.red
    });
  });

  /* ================= footer ================= */
  B.button(1016, 466, 112, 20, 'Automatic derating', { size: 8.5 });
  [['Active energy', '33172463 kWh', 'G01_ACTIVE_ENERGY'],
   ['Reactive energy export', '4852413 kVArh', 'G01_REACTIVE_ENERGY_EXPORT'],
   ['Reactive energy import', '302486 kVArh', 'G01_REACTIVE_ENERGY_IMPORT']]
    .forEach(([label, val, tag], i) => {
      B.text(700, 500 + i * 20, 150, label, { size: 8.5, color: '#4a545e' });
      B.ro(856, 496 + i * 20, 120, 18, val, tag, { size: 8.5, decimals: 0 });
    });
  B.text(1160, 534, 110, 'Running hours', { size: 9, color: '#4a545e' });
  B.ro(1280, 530, 168, 20, '5755 h', 'G01_RUNNING_HOURS', { size: 9.5, decimals: 0 });

  return {
    screen_id: 'G1.Control',
    title: 'G1 — Control',
    unit: 'G1',
    layout: 'canvas',
    canvas: { width: 1470, height: 566, background: C.ground },
    elements: B.elements
  };
}
