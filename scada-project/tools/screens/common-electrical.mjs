/* =====================================================================
   Common → Electrical 1 / Electrical 2
   ---------------------------------------------------------------------
   The 11 kV single-line, split across two pages: Electrical 2 covers
   Busbar 1 (AET 901 incomer, feeders 6-10, gensets G1-G3), Electrical 1
   covers Busbar 2 (AET 902, feeders 1-5, gensets G4-G6).

   Both pages are the same diagram with different plant, so the bays are
   built once here and each page just places them. A bay reads top to
   bottom: status lamps, current, relay, breaker, isolator, busbar.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

const BUS = { color: '#1d242b', t: 3 };     // busbar and single-line conductor
const LINE = { color: '#1d242b', t: 2 };
const LAMPS = ['Remote permit', 'Spring charged', 'TRP circ. health.', 'CB Avail.'];

/* ---------------------------------------------------------------------
   Shared pieces
   ------------------------------------------------------------------ */

/* Four-lamp CB status block. `faults` lists which lamps sit red. */
function lampBlock(B, x, y, prefix, faults = []) {
  LAMPS.forEach((label, i) => {
    const bad = faults.includes(i);
    B.led(x, y + i * 17, `${prefix}_L${i + 1}`, {
      w: 11, h: 11, shape: 'square',
      fill: bad ? C.red : C.green,
      onColor: bad ? C.red : C.green,
      offColor: '#b6bdc4', stroke: '#3d4349'
    });
    B.text(x + 17, y + i * 17 - 1, 130, label, { size: 8.5 });
  });
}

/* A breaker: the filled square that sits in the conductor. */
function cb(B, x, y, tag, state) {
  B.breaker(x, y, tag, { size: 22, state, name: tag });
}

/* An outgoing-feeder or incomer bay hanging off the busbar. */
function feederBay(B, o) {
  const { x, title, plate, current, tag, busY } = o;
  const state = o.state || 'closed';

  B.text(x, 22, 132, title, { size: 8.5, bold: true, align: 'center', h: 22 });
  B.text(x, 44, 132, plate, { size: 8.5, bold: true, align: 'center' });
  lampBlock(B, x + 4, 60, tag, o.faults);
  B.ro(x + 8, 132, 112, 22, current, `${tag}_CURRENT`,
    { bold: true, decimals: 0, fill: '#dfe3e7' });

  // relay, breaker and isolator down the conductor into the busbar
  B.relay(x + 6, 158, 34, 42, 'relay', { name: `${tag} P127` });
  B.text(x + 2, 148, 42, 'P127', { size: 7.5, align: 'center' });
  B.isolator(x + 52, 152, 28, 30, `${tag}_ISO`, { closed: false });

  B.text(x - 2, 202, 50, 'PM5560', { size: 7.5 });
  B.relay(x + 2, 212, 42, 46, 'meter', { name: `${tag} PM5560` });

  const cx = x + 60;
  B.pipeV(cx, 182, 34, LINE);
  cb(B, cx - 11, 216, `${tag}_CB`, state);
  B.pipeV(cx, 238, busY - 238, LINE);
}

/* A generator bay hanging below the busbar. */
function genBay(B, o) {
  const { x, gen, tag, busY, kw, kvar, kwSet } = o;
  const state = o.state || 'closed';
  const running = state === 'closed';

  B.pipeV(x, busY, 34, LINE);
  // reuse the machine's existing breaker-state tag rather than minting a
  // second one for the same breaker
  cb(B, x - 11, busY + 34, `${tag}_BREAKER_STATE`, state);
  B.isolator(x + 14, busY + 30, 28, 30, `${tag}_ISO`, { closed: false });
  B.pipeV(x, busY + 56, 26, LINE);

  // machine, its neutral earthing resistor and the earth
  B.shape(x - 24, busY + 82, 48, 48, 'circle',
    { fill: running ? C.green : '#ffffff', stroke: '#1d242b', strokeWidth: 2,
      name: gen });
  B.text(x - 24, busY + 96, 48, gen,
    { size: 13, align: 'center', bold: true, color: running ? '#ffffff' : '#1d242b' });
  B.pipeV(x, busY + 130, 22, LINE);
  B.rect(x - 15, busY + 152, 30, 26,
    { fill: running ? C.red : '#ffffff', stroke: '#1d242b', name: gen + ' NER' });
  B.pipeH(x - 15, busY + 165, 30, LINE);
  B.pipeV(x, busY + 178, 24, LINE);
  B.rect(x - 8, busY + 202, 16, 26, { fill: '#eceff1', stroke: '#1d242b' });
  B.pipeV(x, busY + 228, 14, LINE);
  [14, 10, 6].forEach((half, i) =>
    B.pipeH(x - half, busY + 242 + i * 5, half * 2, { color: '#1d242b', t: 2 }));

  // metering stack
  const my = busY + 268;
  [[kw, `${tag}_KW`], [kvar, `${tag}_KVAR`], ['1.00', `${tag}_PF`],
   [kwSet, `${tag}_KW_SETPOINT`], ['1.00', `${tag}_PF_SETPOINT`]]
    .forEach(([val, t], i) =>
      B.ro(x - 60, my + i * 25, 120, 24, val, t,
        { size: 10.5, decimals: t.endsWith('_PF') || t.endsWith('_SETPOINT') ? 2 : 0,
          fill: '#eceff1' }));
}

/* Synchronizer + load-shedding panels, identical on both pages. */
function controlPanels(B, x, y, modeKey) {
  B.rect(x, y, 178, 128, { fill: '#dfe3e7', stroke: '#8a929b', name: 'Synchronizer' });
  B.text(x + 8, y + 8, 160, 'Synchronizer', { size: 9.5, bold: true });
  [['Auto position', false], ['On', false]].forEach(([label, on], i) => {
    B.rect(x + 10, y + 30 + i * 20, 12, 12, { fill: '#ffffff', stroke: '#5a6068' });
    B.text(x + 28, y + 30 + i * 20, 130, label, { size: 9 });
  });
  [['Isochronous mode', true], ['VDC control mode', true]].forEach(([label, on], i) => {
    B.led(x + 10, y + 74 + i * 20, `COMMON_SYNC_${i}`, {
      w: 12, h: 12, shape: 'square', fill: C.green, offColor: '#b6bdc4', stroke: '#3d4349'
    });
    B.text(x + 28, y + 74 + i * 20, 140, label, { size: 9 });
  });
  B.button(x + 8, y + 118, 150, 30, `Ctrl+Shift+${modeKey}\nControl modes`, { size: 8.5 });

  B.rect(x + 186, y, 232, 90, { fill: '#dfe3e7', stroke: '#8a929b',
    name: 'Load shedding' });
  B.led(x + 196, y + 10, 'COMMON_LS_CONTROL_ACTIVE', {
    w: 12, h: 12, shape: 'square', fill: C.green, offColor: '#b6bdc4', stroke: '#3d4349'
  });
  B.text(x + 214, y + 10, 200, 'LS Control active', { size: 9 });
  ['Load shedding stage 1 active', 'Load shedding stage 2 active'].forEach((label, i) => {
    B.rect(x + 196, y + 34 + i * 22, 12, 12, { fill: '#ffffff', stroke: '#5a6068' });
    B.text(x + 214, y + 34 + i * 22, 200, label, { size: 9 });
  });
  B.button(x + 194, y + 82, 150, 30, 'Ctrl+Shift+L\nLoad shedding', { size: 8.5 });
}

/* Soft-energizing panel for one incomer transformer. */
function softEnergizing(B, x, y, aet, busA, busAB) {
  B.rect(x, y, 250, 232, { fill: '#dfe3e7', stroke: '#8a929b', name: 'Soft energizing' });
  B.text(x + 10, y + 10, 180, 'Soft energizing', { size: 10, bold: true });
  B.shape(x + 218, y + 8, 18, 18, 'circle', { fill: '#eceff1', stroke: '#3d4349' });
  B.text(x + 218, y + 12, 18, 'S', { size: 9, align: 'center' });
  [`${aet} soft energizing request`, `${aet} soft energizing enabled`]
    .forEach((label, i) => {
      B.rect(x + 12, y + 36 + i * 24, 13, 13, { fill: '#ffffff', stroke: '#5a6068' });
      B.text(x + 32, y + 36 + i * 24, 210, label, { size: 9 });
    });
  B.text(x + 10, y + 92, 180, busA, { size: 10, bold: true });
  ['Soft energizing conditions', 'Soft energizing active'].forEach((label, i) => {
    B.rect(x + 12, y + 114 + i * 24, 13, 13, { fill: '#ffffff', stroke: '#5a6068' });
    B.text(x + 32, y + 114 + i * 24, 210, label, { size: 9 });
  });
  B.text(x + 10, y + 168, 180, busAB, { size: 10, bold: true });
  ['Soft energising conditions', 'Soft energising active'].forEach((label, i) => {
    B.rect(x + 12, y + 190 + i * 24, 13, 13, { fill: '#ffffff', stroke: '#5a6068' });
    B.text(x + 32, y + 190 + i * 24, 210, label, { size: 9 });
  });
}

/* Incomer bay from the 132/11 kV transformer down to the busbar. */
function incomerBay(B, x, busY, tag, current) {
  B.relay(x - 46, 300, 34, 42, 'relay', { name: `${tag} P127` });
  B.text(x - 50, 290, 42, 'P127', { size: 7.5, align: 'center' });
  B.isolator(x + 6, 296, 28, 30, `${tag}_ISO`, { closed: false });
  cb(B, x - 11, 356, `${tag}_CB`, 'closed');
  B.pipeV(x, 326, 30, LINE);
  B.pipeV(x, 378, busY - 378, LINE);
  B.ro(x - 60, busY + 12, 120, 24, current, `${tag}_CURRENT`,
    { bold: true, decimals: 0, fill: '#dfe3e7' });
  lampBlock(B, x - 58, busY + 46, tag);
}

/* ---------------------------------------------------------------------
   Electrical 2 — Busbar 1
   ------------------------------------------------------------------ */
export function commonElectrical2() {
  const B = builder();
  const BUS_Y = 420;

  softEnergizing(B, 14, 20, 'AET901', 'Busbar A', 'Busbar A&B');

  // 132/11 kV incomer with its two bays
  B.transformer(596, 172, 44, 62, { name: 'AET 901' });
  B.text(650, 182, 90, 'AET 901', { size: 9.5, bold: true });
  B.text(650, 196, 90, '132 kV', { size: 9 });
  B.text(650, 210, 90, '11 kV', { size: 9 });
  B.pipeV(618, 234, 40, LINE);
  B.pipeH(360, 274, 258, LINE);
  B.pipeV(360, 274, 26, LINE);
  B.pipeV(596, 274, 26, LINE);
  incomerBay(B, 360, BUS_Y, 'COMMON_BAI901_A', '346 A');
  incomerBay(B, 596, BUS_Y, 'COMMON_BAI901_B', '343 A');

  // outgoing feeders 6-10 plus the phase-2 interconnection
  [['Outgoing feeder 6', 'BAO901', '103 A', 'COMMON_BAO901', []],
   ['Outgoing feeder 7', 'BAO902', '0 A', 'COMMON_BAO902', [2, 3], 'open'],
   ['Outgoing feeder 8', 'BAO903', '0 A', 'COMMON_BAO903', [2, 3], 'open'],
   ['Outgoing feeder 9', 'BAO904', '280 A', 'COMMON_BAO904', []],
   ['Outgoing feeder 10', 'BAO905', '300 A', 'COMMON_BAO905', []],
   ['Interconnection\nPhase 2', 'BAO906', '4 A', 'COMMON_BAO906', [3], 'trip']]
    .forEach(([title, plate, current, tag, faults, state], i) => {
      feederBay(B, {
        x: 760 + i * 148, title, plate, current, tag, faults, state, busY: BUS_Y
      });
    });

  // busbar
  B.pipeH(0, BUS_Y, 1880, BUS);
  B.text(1690, BUS_Y - 28, 120, 'Busbar 1', { size: 11, bold: true });
  B.text(1790, BUS_Y - 14, 100, 'BAB901', { size: 10.5, bold: true });
  B.arrow(1768, BUS_Y - 7, 'right', { color: '#1d242b', w: 14, h: 14 });
  B.text(14, BUS_Y - 28, 120, 'Busbar 2', { size: 11, bold: true });
  B.text(30, BUS_Y - 10, 16, '◀', { size: 11 });
  B.breaker(140, BUS_Y - 11, 'COMMON_BUSTIE_STATE', { size: 22, state: 'closed',
    name: 'Bus tie' });

  // right-hand switchgear status
  [['MV-swg 1 MCM open control', false], ['Parallel with grid', false],
   ['Voltage on', true], ['Remote sync. request', false],
   ['Parallel with Male', true]].forEach(([label, on], i) => {
    const y = 274 + i * 24;
    if (on) {
      B.led(1660, y, `COMMON_BB1_ST${i}`, { w: 13, h: 13, shape: 'square',
        fill: C.green, offColor: '#b6bdc4', stroke: '#3d4349' });
    } else {
      B.rect(1660, y, 13, 13, { fill: '#ffffff', stroke: '#5a6068' });
    }
    B.text(1682, y - 1, 220, label, { size: 9.5 });
  });

  // generators G3 / G2 / G1
  [['G3', 'G03', '7916 kW', '354 kVAr', '6252 kW'],
   ['G2', 'G02', '7942 kW', '292 kVAr', '7746 kW'],
   ['G1', 'G01', '7883 kW', '350 kVAr', '6814 kW']]
    .forEach(([gen, tag, kw, kvar, kwSet], i) => {
      genBay(B, { x: 800 + i * 132, gen, tag, busY: BUS_Y, kw, kvar, kwSet });
    });
  B.rect(560, 606, 13, 13, { fill: '#ffffff', stroke: '#5a6068' });
  B.text(582, 605, 160, 'Synch. pulse G 1-3', { size: 9.5 });

  // 11 kV / 400 V auxiliary transformer down to the LV switchboard
  const LV_Y = 900;
  B.relay(1290, 452, 34, 42, 'relay', { name: 'BFB901 P127' });
  B.text(1286, 442, 42, 'P127', { size: 7.5, align: 'center' });
  B.text(1282, 496, 50, 'PM5560', { size: 7.5 });
  B.relay(1286, 506, 42, 46, 'meter', { name: 'BFB901 PM5560' });
  B.pipeV(1360, BUS_Y, 26, LINE);
  cb(B, 1349, 446, 'COMMON_BFB901_CB', 'closed');
  B.isolator(1384, 442, 28, 30, 'COMMON_BFB901_ISO', { closed: false });
  B.ro(1180, 496, 110, 24, '38 A', 'COMMON_BFB901_CURRENT',
    { decimals: 0, fill: '#dfe3e7' });
  lampBlock(B, 1440, 446, 'COMMON_BFB901');
  B.pipeV(1360, 468, 138, LINE);
  B.transformer(1338, 606, 44, 62, { name: 'BFB 901' });
  B.text(1392, 610, 90, 'BFB 901', { size: 9.5, bold: true });
  B.text(1392, 624, 90, '11 kV', { size: 9 });
  B.text(1392, 638, 90, '400 V', { size: 9 });
  B.led(1340, 682, 'COMMON_BFB901_VOLTAGE', { w: 12, h: 12, shape: 'square',
    fill: C.green, stroke: '#3d4349' });
  B.text(1360, 681, 120, 'Voltage on', { size: 9.5 });
  B.pipeV(1360, 668, 66, LINE);
  cb(B, 1349, 734, 'COMMON_BFB901_LV_CB', 'closed');
  [['Selected to open', false], ['Remote permit', true],
   ['Spring charged', true], ['Rack in', true]].forEach(([label, on], i) => {
    const y = 718 + i * 20;
    if (on) B.led(1394, y, `COMMON_BFB901_LV${i}`, { w: 12, h: 12, shape: 'square',
      fill: C.green, offColor: '#b6bdc4', stroke: '#3d4349' });
    else B.rect(1394, y, 12, 12, { fill: '#ffffff', stroke: '#5a6068' });
    B.text(1414, y - 1, 160, label, { size: 9 });
  });
  B.ro(1194, 738, 120, 24, '1028 A', 'COMMON_BFB901_LV_CURRENT',
    { decimals: 0, fill: '#dfe3e7' });
  B.pipeV(1360, 756, LV_Y - 756, LINE);
  B.shape(1352, 806, 18, 18, 'circle', { fill: '#eceff1', stroke: '#3d4349' });
  B.text(1352, 810, 18, 'S', { size: 8.5, align: 'center' });

  // busbar voltage metering
  B.pipeV(1600, BUS_Y, 96, LINE);
  B.text(1560, 520, 90, 'BAM 901', { size: 9.5, bold: true });
  B.shape(1536, 546, 18, 18, 'circle', { fill: '#eceff1', stroke: '#3d4349' });
  B.text(1536, 550, 18, 'S', { size: 8.5, align: 'center' });
  B.ro(1560, 542, 100, 24, '10.9 kV', 'COMMON_BAM901_VOLTAGE',
    { bold: true, decimals: 1, fill: '#dfe3e7' });
  B.text(1556, 572, 50, 'PM5560', { size: 7.5 });
  B.relay(1556, 582, 42, 46, 'meter', { name: 'BAM901 PM5560' });
  B.text(1606, 572, 40, 'P923', { size: 7.5 });
  B.relay(1606, 582, 38, 46, 'relay', { name: 'BAM901 P923' });

  controlPanels(B, 30, 650, 'A');

  /* ---- LV switchboard ---- */
  B.pipeH(60, LV_Y, 1800, BUS);
  B.text(90, LV_Y - 24, 200, 'LV-SWG. Busbar 2', { size: 10.5, bold: true });
  B.text(1400, LV_Y - 24, 200, 'LV-SWG. Busbar 1', { size: 10.5, bold: true });
  B.text(66, LV_Y - 10, 16, '◀', { size: 11 });

  [['BEY914', 236, '117 V'], ['BEY913', 676, '119 V'], ['BEY901', 1196, '25 V']]
    .forEach(([plate, x, volts]) => {
      B.pipeV(x + 12, LV_Y, 30, LINE);
      B.shape(x, LV_Y + 30, 26, 26, 'exchanger', { name: plate });
      B.text(x + 32, LV_Y + 34, 60, plate, { size: 8.5, bold: true });
      B.pipeV(x + 12, LV_Y + 56, 30, LINE);
      B.ro(x - 34, LV_Y + 86, 96, 24, volts, `COMMON_${plate}_VOLTAGE`,
        { decimals: 0, fill: '#dfe3e7' });
    });
  B.breaker(456, LV_Y - 11, 'COMMON_LV_TIE_CB', { size: 22, state: 'closed' });
  B.ro(408, LV_Y + 34, 120, 24, '436 A', 'COMMON_LV_TIE_CURRENT',
    { decimals: 0, fill: '#dfe3e7' });
  B.shape(458, LV_Y - 38, 18, 18, 'circle', { fill: '#eceff1', stroke: '#3d4349' });
  B.text(458, LV_Y - 34, 18, 'S', { size: 8.5, align: 'center' });
  B.led(1244, LV_Y - 14, 'COMMON_LV1_VOLTAGE', { w: 12, h: 12, shape: 'square',
    fill: C.green, stroke: '#3d4349' });
  B.text(1264, LV_Y - 15, 120, 'Voltage on', { size: 9.5 });

  return {
    screen_id: 'Common.Electrical2',
    title: 'Common — Electrical 2 (Busbar 1)',
    unit: 'COMMON',
    layout: 'canvas',
    canvas: { width: 1900, height: 980, background: C.ground },
    elements: B.elements
  };
}

/* ---------------------------------------------------------------------
   Electrical 1 — Busbar 2
   ------------------------------------------------------------------ */
export function commonElectrical1() {
  const B = builder();
  const BUS_Y = 420;

  // control panels — red because they are in alarm
  [['CFA 901', 20], ['CFA 902', 78]].forEach(([plate, y]) => {
    B.rect(20, y, 66, 48, { fill: C.red, stroke: '#a80c0c', name: 'Control panel ' + plate });
    B.text(22, y + 6, 62, 'Control\nPanel\n' + plate,
      { size: 8.5, align: 'center', color: '#ffffff', h: 36 });
  });

  [['MV-swg 2 MCM opn ctrl', false], ['Parallel with grid', false],
   ['Voltage on', true], ['Remote sync. request', false],
   ['Parallel with Male', true]].forEach(([label, on], i) => {
    const y = 146 + i * 24;
    if (on) B.led(24, y, `COMMON_BB2_ST${i}`, { w: 13, h: 13, shape: 'square',
      fill: C.green, offColor: '#b6bdc4', stroke: '#3d4349' });
    else B.rect(24, y, 13, 13, { fill: '#ffffff', stroke: '#5a6068' });
    B.text(46, y - 1, 230, label, { size: 9.5 });
  });

  // interconnection + outgoing feeders 1-5
  [['Interconnection\nPhase 2', 'BAO912', '0 A', 'COMMON_BAO912', [2, 3]],
   ['Outgoing feeder 1', 'BAO911', '0 A', 'COMMON_BAO911', [2, 3]],
   ['Outgoing feeder 2', 'BAO910', '0 A', 'COMMON_BAO910', [2, 3]],
   ['Outgoing feeder 3', 'BAO909', '0 A', 'COMMON_BAO909', [2, 3]],
   ['Outgoing feeder 4', 'BAO908', '0 A', 'COMMON_BAO908', [2, 3]],
   ['Outgoing feeder 5', 'BAO907', '0 A', 'COMMON_BAO907', [2, 3]]]
    .forEach(([title, plate, current, tag, faults], i) => {
      feederBay(B, {
        x: 290 + i * 148, title, plate, current, tag, faults,
        state: 'open', busY: BUS_Y
      });
    });

  // 132/11 kV incomer
  B.transformer(1176, 178, 44, 62, { name: 'AET 902' });
  B.text(1230, 188, 90, 'AET 902', { size: 9.5, bold: true });
  B.text(1230, 202, 90, '132 kV', { size: 9 });
  B.text(1230, 216, 90, '11 kV', { size: 9 });
  B.pipeV(1198, 240, 40, LINE);
  B.pipeH(1198, 280, 260, LINE);
  B.pipeV(1198, 280, 26, LINE);
  B.pipeV(1458, 280, 26, LINE);
  incomerBay(B, 1198, BUS_Y, 'COMMON_BAI902_A', '350 A');
  incomerBay(B, 1458, BUS_Y, 'COMMON_BAI902_B', '362 A');

  softEnergizing(B, 1610, 20, 'AET902', 'Busbar B', 'Busbar A&B');

  // busbar
  B.pipeH(0, BUS_Y, 1880, BUS);
  B.text(14, BUS_Y - 28, 120, 'Busbar 2', { size: 11, bold: true });
  B.text(1780, BUS_Y - 14, 110, 'BAB902', { size: 10.5, bold: true });
  B.arrow(1758, BUS_Y - 7, 'right', { color: '#1d242b', w: 14, h: 14 });

  // auxiliary transformer BFB 902 on the left
  B.relay(150, 452, 34, 42, 'relay', { name: 'BFB902 P127' });
  B.text(146, 442, 42, 'P127', { size: 7.5, align: 'center' });
  B.text(142, 496, 50, 'PM5560', { size: 7.5 });
  B.relay(146, 506, 42, 46, 'meter', { name: 'BFB902 PM5560' });
  B.pipeV(220, BUS_Y, 26, LINE);
  cb(B, 209, 446, 'COMMON_BFB902_CB', 'closed');
  B.isolator(244, 442, 28, 30, 'COMMON_BFB902_ISO', { closed: false });
  B.ro(36, 496, 104, 24, '0 A', 'COMMON_BFB902_CURRENT',
    { decimals: 0, fill: '#dfe3e7' });
  lampBlock(B, 300, 446, 'COMMON_BFB902');
  B.pipeV(220, 468, 138, LINE);
  B.transformer(198, 606, 44, 62, { name: 'BFB 902' });
  B.text(252, 610, 90, 'BFB 902', { size: 9.5, bold: true });
  B.text(252, 624, 90, '11 kV', { size: 9 });
  B.text(252, 638, 90, '400 V', { size: 9 });
  B.led(200, 682, 'COMMON_BFB902_VOLTAGE', { w: 12, h: 12, shape: 'square',
    fill: C.green, stroke: '#3d4349' });
  B.text(220, 681, 120, 'Voltage on', { size: 9.5 });
  B.pipeV(220, 668, 66, LINE);
  cb(B, 209, 734, 'COMMON_BFB902_LV_CB', 'open');
  [['Selected to open', true], ['Remote permit', true],
   ['Spring charged', true], ['Rack in', true]].forEach(([label, on], i) => {
    const y = 718 + i * 20;
    B.led(254, y, `COMMON_BFB902_LV${i}`, { w: 12, h: 12, shape: 'square',
      fill: C.green, offColor: '#b6bdc4', stroke: '#3d4349' });
    B.text(274, y - 1, 160, label, { size: 9 });
  });
  B.ro(54, 738, 120, 24, '2 A', 'COMMON_BFB902_LV_CURRENT',
    { decimals: 0, fill: '#dfe3e7' });
  B.shape(212, 806, 18, 18, 'circle', { fill: '#eceff1', stroke: '#3d4349' });
  B.text(212, 810, 18, 'S', { size: 8.5, align: 'center' });

  // generators G6 / G5 / G4
  [['G6', 'G06', '7874 kW', '315 kVAr', '7585 kW', 'closed'],
   ['G5', 'G05', '7938 kW', '299 kVAr', '6993 kW', 'closed'],
   ['G4', 'G04', '0 kW', '0 kVAr', '6980 kW', 'open']]
    .forEach(([gen, tag, kw, kvar, kwSet, state], i) => {
      genBay(B, { x: 520 + i * 132, gen, tag, busY: BUS_Y, kw, kvar, kwSet, state });
    });
  B.rect(900, 712, 13, 13, { fill: '#ffffff', stroke: '#5a6068' });
  B.text(922, 711, 160, 'Synch. pulse G 4-6', { size: 9.5 });

  // busbar voltage metering
  B.pipeV(960, BUS_Y, 96, LINE);
  B.arrow(954, 522, 'down', { color: '#1d242b', w: 13, h: 13 });
  B.text(922, 548, 90, 'BAM 902', { size: 9.5, bold: true });
  B.shape(886, 570, 18, 18, 'circle', { fill: '#eceff1', stroke: '#3d4349' });
  B.text(886, 574, 18, 'S', { size: 8.5, align: 'center' });
  B.ro(910, 566, 100, 24, '10.9 kV', 'COMMON_BAM902_VOLTAGE',
    { bold: true, decimals: 1, fill: '#dfe3e7' });
  B.text(906, 596, 50, 'PM5560', { size: 7.5 });
  B.relay(906, 606, 42, 46, 'meter', { name: 'BAM902 PM5560' });
  B.text(956, 596, 40, 'P923', { size: 7.5 });
  B.relay(956, 606, 38, 46, 'relay', { name: 'BAM902 P923' });

  controlPanels(B, 1130, 650, 'B');

  /* ---- LV switchboard ---- */
  const LV_Y = 900;
  B.pipeH(60, LV_Y, 1800, BUS);
  B.text(90, LV_Y - 24, 200, 'LV-SWG. Busbar 2', { size: 10.5, bold: true });
  B.text(1780, LV_Y - 14, 110, 'BFA902', { size: 10.5, bold: true });
  B.arrow(1758, LV_Y - 7, 'right', { color: '#1d242b', w: 14, h: 14 });
  B.led(420, LV_Y - 14, 'COMMON_LV2_VOLTAGE', { w: 12, h: 12, shape: 'square',
    fill: C.green, stroke: '#3d4349' });
  B.text(440, LV_Y - 15, 120, 'Voltage on', { size: 9.5 });

  B.pipeV(690, LV_Y, 30, LINE);
  B.shape(678, LV_Y + 30, 26, 26, 'exchanger', { name: 'BEY 902' });
  B.text(712, LV_Y + 34, 60, 'BEY 902', { size: 8.5, bold: true });
  B.pipeV(690, LV_Y + 56, 30, LINE);
  B.arrow(684, LV_Y + 86, 'down', { color: '#1d242b', w: 13, h: 13 });
  B.ro(644, LV_Y + 106, 96, 24, '25 V', 'COMMON_BEY902_VOLTAGE',
    { decimals: 0, fill: '#dfe3e7' });

  // emergency / standby set
  B.ro(848, LV_Y + 34, 116, 24, '0 A', 'COMMON_BLM901_CURRENT',
    { decimals: 0, fill: '#dfe3e7' });
  B.breaker(982, LV_Y + 34, 'COMMON_BLM901_CB', { size: 22, state: 'closed' });
  B.pipeV(993, LV_Y, 34, LINE);
  B.text(912, LV_Y + 92, 60, 'BLM 901', { size: 9, bold: true });
  B.pipeV(993, LV_Y + 56, 60, LINE);
  B.shape(975, LV_Y + 116, 36, 36, 'circle', { fill: '#ffffff', stroke: '#1d242b',
    strokeWidth: 2, name: 'Standby generator' });
  B.text(975, LV_Y + 128, 36, 'G', { size: 12, align: 'center', bold: true });
  B.text(922, LV_Y + 128, 46, 'Local', { size: 9 });
  [['Voltage on', true], ['Remote permit', true], ['Spring charged', true],
   ['Voltage on', true], ['Standby ready', true]].forEach(([label, on], i) => {
    const y = LV_Y + 24 + i * 22;
    B.led(1022, y, `COMMON_BLM901_ST${i}`, { w: 12, h: 12, shape: 'square',
      fill: C.green, offColor: '#b6bdc4', stroke: '#3d4349' });
    B.text(1042, y - 1, 160, label, { size: 9.5 });
  });
  B.rect(1166, LV_Y + 34, 13, 13, { fill: '#ffffff', stroke: '#5a6068' });
  B.text(1188, LV_Y + 33, 180, 'Synch. pulse BS', { size: 9.5 });

  return {
    screen_id: 'Common.Electrical1',
    title: 'Common — Electrical 1 (Busbar 2)',
    unit: 'COMMON',
    layout: 'canvas',
    canvas: { width: 1900, height: 1060, background: C.ground },
    elements: B.elements
  };
}
