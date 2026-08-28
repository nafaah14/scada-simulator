/* =====================================================================
   Common → Automation 1 / Automation 2
   ---------------------------------------------------------------------
   The control-system network, not a process page. Two link types are
   drawn and they mean different things:

     green  copper ethernet, inside one cabinet or between adjacent ones
     cyan   optical ethernet, the long runs between buildings

   Automation 1 is the plant level: the CWC901 comms cabinet, the four
   WOIS workstations with the report station and printers, and the
   CFA901 / CFA902 process stations with their IO.

   Automation 2 is the engine level: six identical cabinet stacks, one
   per genset, on a single optical ring that leaves CFA901 and comes
   back to it. Because they are identical, one function draws all six.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

const ETH = { color: '#00a000', t: 2 };     // copper ethernet
const OPT = { color: '#3fb6c8', t: 2 };     // optical ethernet
const INK = '#1d242b';

/* Slot letters for the racks that repeat across the plant. */
const RACK = {
  cfc:  ['PS', 'CPU', 'CPU', 'DO', 'DI', 'AO', 'AI'],
  a1:   ['PS', 'E', 'DO', 'AI', 'AI', 'AI', 'AI', 'AI', 'AI', 'AI', 'AI', 'AI', 'AI'],
  a2:   ['PS', 'E', 'DI', 'DI', 'DO', 'DO', 'DI', 'AI', 'AI', 'AI', 'AI', 'AI'],
  a3:   ['PS', 'E', 'DI', 'DI', 'DI', 'DI', 'DI', 'DI', 'DI', 'DI', 'DI'],
  bja:  ['PS', 'E', 'AI', 'AI', 'AI', 'DO', 'DO'],
  a0:   ['PS', 'CPU', 'CPU', 'NC'],
  cfa902a1: ['PS', 'E', 'DI', 'DI', 'DI', 'AI', 'AI', 'AI', 'DO', 'DO'],
  cfa902a2: ['PS', 'E', 'AI', 'AI', 'AI', 'AI', 'AI', 'AI']
};

/* Legend both pages carry, so the two link colours are never guesswork. */
function legend(B, x, y) {
  [['Ethernet', ETH.color], ['Optical eth.', OPT.color]].forEach(([label, color], i) => {
    B.pipeH(x, y + 6 + i * 18, 26, { color, t: 2 });
    B.text(x + 34, y + i * 18, 120, label, { size: 10, bold: true });
  });
}

/* ---------------------------------------------------------------------
   Automation 2 — one cabinet stack per genset
   ------------------------------------------------------------------ */

/* Cabinet stack for engine n: switchgear protection at the top, the
   engine process station in the middle, the auxiliary rack below. */
function engineStack(B, x, n, opt = {}) {
  const p = `0${n}1`;                       // 011, 021 … 061
  const W = 232;

  /* ---- top: CFC0n1 protection cabinet ---- */
  B.zone(x, 258, W, 244, '', {});
  B.netswitch(x + 190, 276, 22, 44, 8, { name: `CFC${p} AF1` });
  B.text(x + 186, 260, 40, 'AF1', { size: 9, bold: true });

  B.bubble(x + 32, 344, 14, opt.left ? '◀' : '▶',
    { state: 'active', size: 8, name: `CFC${p} ring direction` });
  B.iorack(x + 46, 340, 104, 52, `CFC${p}`, RACK.cfc,
    { name: `CFC${p} protection station` });

  ['260', '210', '265'].forEach((model, i) => {
    B.device(x + 162, 340 + i * 52, 60, 44, 'VAMP', model,
      { glyph: 'wave', name: `CFC${p} VAMP ${model}` });
  });
  [0, 1].forEach(i =>
    B.netswitch(x + 24 + i * 30, 420, 22, 44, 2, { cols: 1,
      name: `CFC${p} IO ${i + 1}` }));

  /* ---- middle: CFE0n1 engine process station ---- */
  B.zone(x, 546, W, 190, '', {});
  B.netswitch(x + 46, 560, 22, 44, 8, { name: `CFE${p} switch` });
  B.device(x + 12, 598, 40, 46, '', 'AVR', { glyph: 'keys', fill: '#c9ced3',
    name: `CFE${p} AVR` });
  B.iorack(x + 74, 556, 148, 52, `CFE${p} A1`, RACK.a1,
    { name: `CFE${p} rack A1` });
  B.iorack(x + 74, 618, 148, 52, `CFE${p} A2`, RACK.a2,
    { name: `CFE${p} rack A2`, alarms: opt.rackAlarm ? [10] : [] });
  B.device(x + 12, 676, 62, 48, '', 'E 1100', { glyph: 'keys', fill: '#c9ced3',
    name: `CFE${p} local panel` });

  /* ---- bottom: BJA0n1 auxiliary rack out to the field bus ---- */
  B.zone(x, 748, W, 148, '', {});
  B.netswitch(x + 46, 762, 22, 44, 8, { name: `BJA${p} switch` });
  B.iorack(x + 84, 758, 116, 52, `BJA${p}`, RACK.bja, { name: `BJA${p} rack` });
  B.netswitch(x + 166, 826, 20, 40, 4, { name: `BJA${p} field module` });
  B.shape(x + 200, 838, 20, 20, 'diamond', { fill: '#2f7f8a', stroke: INK,
    name: `F001 fibre ${p}` });
  B.text(x + 194, 822, 40, 'F001', { size: 9, bold: true });

  /* ---- copper inside each cabinet ---- */
  B.pipeV(x + 201, 320, 20, ETH);
  B.pipeH(x + 150, 340, 51, ETH);
  B.pipeH(x + 150, 356, 12, ETH);           // CFC ─▶ VAMP 260
  B.pipeV(x + 156, 356, 56, ETH);
  B.pipeH(x + 156, 412, 6, ETH);            // ─▶ VAMP 210 / 265
  B.pipeV(x + 156, 412, 52, ETH);
  B.pipeH(x + 156, 464, 6, ETH);
  B.pipeH(x + 35, 392, 11, ETH);
  B.pipeV(x + 35, 392, 28, ETH);
  B.pipeV(x + 65, 392, 28, ETH);
  B.pipeH(x + 46, 392, 19, ETH);

  B.pipeH(x + 68, 582, 6, ETH);
  B.pipeV(x + 57, 604, 40, ETH);
  B.pipeH(x + 57, 644, 17, ETH);            // switch ─▶ A2
  B.pipeH(x + 52, 620, 22, ETH);            // AVR ─▶ A1
  B.pipeV(x + 43, 670, 30, ETH);
  B.pipeH(x + 43, 700, 31, ETH);            // A2 ─▶ E 1100

  B.pipeH(x + 68, 784, 16, ETH);
  B.pipeV(x + 130, 810, 36, ETH);
  B.pipeH(x + 130, 846, 36, ETH);
  B.pipeH(x + 186, 848, 14, ETH);
}

export function commonAutomation2() {
  const B = builder();
  const X0 = 60, PITCH = 268;
  legend(B, 60, 60);

  for (let n = 1; n <= 6; n++) {
    engineStack(B, X0 + (n - 1) * PITCH, n, {
      left: n >= 4,                     // the ring turns back on the far half
      rackAlarm: n === 6                // CFE061 A2 has a module in alarm
    });
  }

  /* ---- the optical ring: CFA901 ─▶ CFC011 ─▶ … ─▶ CFC061 ─▶ CFA901.
     Each hop leaves one cabinet's AF1 on the right, runs along its own
     lane, and drops into the next cabinet's AF1 on the left. Giving each
     hop its own lane is what keeps six parallel runs readable. */
  const inX = n => X0 + n * PITCH + 194;    // where a hop lands
  const outX = n => X0 + n * PITCH + 208;   // where the next hop leaves
  const lane = n => 152 + n * 15;
  const TOP = 258;                          // top edge of the cabinet zone

  B.text(60, 138, 130, 'From CFA901', { size: 10, bold: true });
  B.pipeH(150, 146, inX(0) - 150, OPT);
  B.pipeV(inX(0), 146, TOP - 146, OPT);

  for (let n = 0; n < 5; n++) {
    B.pipeV(outX(n), lane(n), TOP - lane(n), OPT);
    B.pipeH(outX(n), lane(n), inX(n + 1) - outX(n), OPT);
    B.pipeV(inX(n + 1), lane(n), TOP - lane(n), OPT);
  }

  B.pipeV(outX(5), 116, TOP - 116, OPT);
  B.pipeH(outX(5), 116, 120, OPT);
  B.text(outX(5) + 56, 96, 120, 'To CFA901', { size: 10, bold: true });

  /* ---- optical drops from each AF1 down the stack ---- */
  for (let n = 0; n < 6; n++) {
    const x = X0 + n * PITCH;
    B.pipeV(x + 20, 320, 244, OPT);       // AF1 ─▶ CFE switch
    B.pipeH(x + 20, 320, 181, OPT);
    B.pipeH(x + 20, 564, 26, OPT);
    B.pipeV(x + 10, 582, 194, OPT);       // CFE ─▶ BJA switch
    B.pipeH(x + 10, 582, 36, OPT);
    B.pipeH(x + 10, 776, 36, OPT);
  }

  return {
    screen_id: 'Common.Automation2',
    title: 'Common — Automation 2 (engine network)',
    unit: 'COMMON',
    layout: 'canvas',
    canvas: { width: 1740, height: 930, background: C.ground },
    elements: B.elements
  };
}

/* ---------------------------------------------------------------------
   Automation 1 — plant level
   ------------------------------------------------------------------ */
export function commonAutomation1() {
  const B = builder();
  legend(B, 396, 56);

  /* ---- CWC901 comms cabinet ---- */
  B.zone(120, 64, 250, 470, 'CWC901', { labelW: 100 });
  B.text(30, 60, 40, 'Y', { size: 26, bold: true, name: 'Antenna' });
  B.pipeH(56, 96, 90, { color: INK, t: 2 });
  B.pipeV(56, 74, 22, { color: INK, t: 2 });

  B.netswitch(146, 86, 190, 22, 12, { cols: 12, name: 'CWC901 router' });
  [140, 182, 224].forEach((y, i) =>
    B.netswitch(146, y, 190, 26, 24, { cols: 12, name: `CWC901 switch ${i + 1}` }));
  [280, 316].forEach((y, i) =>
    B.netswitch(146, y, 190, 26, 12, { cols: 6, name: `CWC901 patch ${i + 1}` }));
  [190, 240].forEach((x, i) => {
    B.netswitch(x, 366, 24, 48, 4, { name: `BEU90${i + 1}` });
    B.led(x + 4, 372, `COMMON_BEU90${i + 1}_OK`, { w: 16, h: 12, shape: 'square',
      fill: C.cool, offColor: '#b6bdc4', stroke: '#3d4349' });
  });
  B.text(160, 420, 130, 'BEU901  BEU902', { size: 10, bold: true });
  B.pipeV(216, 108, 258, ETH);

  /* ---- operator stations ---- */
  const STATIONS = [
    ['WOIS Workstation 1', 'CWT901', 500],
    ['WOIS Workstation 2', 'CWT902', 700],
    ['WOIS Workstation 3', 'CWT903', 900],
    ['WOIS Workstation 4', 'CWT904', 1100],
    ['Report station', 'CWF901', 1300]
  ];
  STATIONS.forEach(([label, plate, x], i) => {
    B.text(x - 20, 100, 180, label, { size: 11, bold: true, align: 'center' });
    B.shape(x, 120, 150, 116, 'monitor', { fill: '#8d959e', stroke: INK, name: plate });
    B.text(x, 130, 150, plate, { size: 10, bold: true, align: 'center' });
    B.netswitch(x - 40, 158, 22, 56, 6, { cols: 1, name: plate + ' tower' });
    // each station takes its own port off the cabinet: the lanes run under
    // the row of stations and turn up into the tower they belong to
    const lane = 246 + i * 11;
    B.pipeH(336, lane, x - 29 - 336, ETH);
    B.pipeV(x - 29, 214, lane - 214, ETH);
  });
  B.pipeV(336, 246, 44, ETH);

  ['CWP901', 'CWP902'].forEach((plate, i) => {
    B.shape(1530, 118 + i * 78, 64, 62, 'printer', { fill: '#8d959e', stroke: INK,
      name: plate });
    B.text(1602, 138 + i * 78, 90, plate, { size: 10, bold: true });
  });
  B.text(1508, 62, 220, 'Report &\nHardcopy Printer', { size: 11, bold: true, h: 30 });
  B.pipeH(1271, 290, 291, ETH);
  B.pipeV(1562, 180, 110, ETH);

  /* ---- CFA901 process station ---- */
  B.zone(360, 300, 430, 560, 'CFA901', { labelW: 56 });
  ['AF1', 'AF2', 'AF3', 'AF4'].forEach((label, i) => {
    const x = 432 + i * 84;
    B.text(x - 4, 306, 40, label, { size: 10, bold: true });
    B.netswitch(x, 320, 24, 48, 8, { name: 'CFA901 ' + label });
  });
  B.pipeH(336, 332, 96, ETH);               // comms cabinet ─▶ AF1

  // optical runs out to the engine cabinets
  B.text(1512, 306, 90, 'CFC011', { size: 10, bold: true });
  B.pipeH(444, 314, 1064, OPT);
  B.text(258, 470, 90, 'CFC061', { size: 10, bold: true });
  B.pipeH(352, 478, 92, OPT);
  B.pipeV(444, 368, 110, OPT);

  B.text(430, 430, 80, 'Primary', { size: 10.5, bold: true });
  B.text(546, 430, 80, 'Standby', { size: 10.5, bold: true });
  B.bubble(420, 450, 14, '▲', { state: 'active', size: 8, name: 'A0A active' });
  B.bubble(536, 450, 14, '▶', { state: 'active', size: 8, name: 'A0B standby' });
  B.iorack(432, 446, 84, 52, 'A0A', RACK.a0, { name: 'CFA901 A0A primary CPU' });
  B.iorack(548, 446, 84, 52, 'A0B', RACK.a0, { name: 'CFA901 A0B standby CPU' });

  B.netswitch(376, 560, 24, 48, 8, { name: 'CFA901 MAF' });
  B.text(372, 544, 40, 'MAF', { size: 10, bold: true });

  [['A1', RACK.a1, 600], ['A2', RACK.a2, 662], ['A3', RACK.a3, 724]]
    .forEach(([label, modules, y]) => {
      B.iorack(440, y, 190, 54, label, modules, { name: 'CFA901 rack ' + label });
    });

  ['AF7', 'AF5', 'AF6'].forEach((label, i) => {
    const y = 542 + i * 76;
    B.text(660, y - 14, 40, label, { size: 10, bold: true });
    B.netswitch(660, y, 22, 44, 4, { name: 'CFA901 ' + label });
  });

  // copper inside CFA901
  B.pipeV(456, 368, 78, ETH);
  B.pipeV(540, 368, 78, ETH);
  B.pipeV(624, 368, 78, ETH);
  B.pipeV(708, 368, 78, ETH);
  B.pipeH(456, 446, 28, ETH);
  B.pipeH(540, 446, 32, ETH);
  B.pipeH(624, 446, 84, ETH);
  B.pipeV(388, 498, 62, ETH);
  B.pipeH(388, 498, 44, ETH);
  B.pipeV(462, 498, 102, ETH);
  B.pipeV(400, 584, 92, ETH);
  B.pipeH(400, 584, 40, ETH);
  B.pipeH(400, 676, 40, ETH);
  B.pipeV(416, 640, 108, ETH);
  B.pipeH(416, 640, 24, ETH);
  B.pipeH(416, 748, 24, ETH);
  B.pipeH(630, 750, 30, ETH);
  B.pipeV(660, 694, 56, ETH);

  /* ---- MV switchgear and the feeder unit ---- */
  B.zone(806, 396, 220, 152, 'MV-SWG', { labelW: 110 });
  B.text(848, 420, 140, 'Micom A300', { size: 10.5, bold: true });
  B.device(858, 438, 66, 62, '', '', { glyph: 'keys', fill: '#c9ced3',
    name: 'MV-SWG Micom A300' });
  B.pipeH(708, 440, 150, ETH);
  B.pipeV(708, 368, 72, ETH);

  B.zone(806, 604, 220, 128, 'Feeder unit\nBLP', { labelW: 110 });
  B.text(812, 636, 30, 'AF', { size: 10, bold: true });
  B.netswitch(812, 650, 22, 44, 4, { name: 'BLP AF' });
  [['FC1', 862], ['FC1', 924]].forEach(([label, x]) =>
    B.device(x, 646, 48, 52, '', label, { glyph: 'keys', fill: '#c9ced3',
      name: 'Feeder drive ' + label }));
  B.pipeH(682, 664, 130, OPT);              // AF7 ─▶ feeder unit
  B.pipeH(834, 668, 28, ETH);
  B.pipeH(910, 668, 14, ETH);

  /* ---- CFA902 remote IO ---- */
  B.zone(806, 748, 220, 208, 'CFA902', { labelW: 110 });
  B.text(824, 772, 40, 'AF1', { size: 10, bold: true });
  B.netswitch(824, 786, 24, 48, 8, { name: 'CFA902 AF1' });
  B.iorack(872, 790, 150, 54, 'A1', RACK.cfa902a1, { name: 'CFA902 rack A1' });
  B.iorack(872, 862, 150, 54, 'A2', RACK.cfa902a2, { name: 'CFA902 rack A2' });
  B.pipeH(682, 800, 142, OPT);              // AF5 ─▶ CFA902
  B.pipeV(682, 618, 182, OPT);
  B.pipeH(682, 880, 142, OPT);              // AF6 ─▶ CFA902
  B.pipeV(682, 770, 110, OPT);
  B.pipeH(848, 816, 24, ETH);
  B.pipeV(836, 834, 54, ETH);
  B.pipeH(836, 888, 36, ETH);

  /* ---- day tank filling limits, written down to the PLC ---- */
  B.zone(1360, 434, 300, 176, '', {});
  B.text(1380, 452, 260, 'Day tank filling limits to PLC',
    { size: 12, bold: true, align: 'center' });
  [['High level limit', '80 %', 'COMMON_DAYTANK_HI_LIMIT', 500],
   ['Low level limit', '35 %', 'COMMON_DAYTANK_LO_LIMIT', 562]]
    .forEach(([label, text, tag, y]) => {
      B.text(1380, y + 6, 160, label, { size: 11, bold: true });
      B.ro(1508, y, 120, 30, text, tag,
        { bold: true, size: 13, decimals: 0, unit: '%', fill: '#f6f8f9' });
    });

  return {
    screen_id: 'Common.Automation1',
    title: 'Common — Automation 1 (plant network)',
    unit: 'COMMON',
    layout: 'canvas',
    canvas: { width: 1720, height: 980, background: C.ground },
    elements: B.elements
  };
}
