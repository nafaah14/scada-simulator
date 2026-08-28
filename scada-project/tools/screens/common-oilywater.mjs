/* =====================================================================
   Common → Oily water
   ---------------------------------------------------------------------
   The oily wastewater train. Flow reads:

     three area drains ─▶ oily wastewater regulating tank DAB 901
       ─▶ two feed pumps in parallel ─▶ transfer header
       ─┬▶ up to the sludge oil tank
        └▶ oily water treatment unit DBB 901
             separated oil ─▶ back to the transfer header
             treated water ─▶ polishing columns ─▶ outlet, monitored ppm

   Dirty oily water is drawn in the fuel/oil dark red, treated water in
   the cooling green, so the point where the unit cleans it is visible.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

const OIL = { color: C.fuel, t: 5 };        // oily wastewater
const WATER = { color: C.cool, t: 4 };      // treated water
const INK = '#1d242b';

const HDR_X = 1175;      // transfer riser up to the sludge oil tank
const HDR_Y = 404;       // transfer header out of the pump house

/* A source/destination flag: labelled box with a pointed end. */
function flag(B, x, y, w, h, label) {
  B.rect(x, y, w, h, { fill: '#eceff1', stroke: INK });
  B.text(x + 6, y + 5, w - 12, label, { size: 9, h: h - 10 });
  B.shape(x + w, y, 16, h, 'triangle-right', { fill: '#eceff1', stroke: INK });
}

/* One of the two regulating-tank feed pumps. */
function feedPump(B, y, n, running) {
  const tag = `COMMON_DAB901_P${n}`;
  B.pipeH(608, y, 250, OIL);
  B.valve(690, y - 6, `${tag}_SUCT`, { fill: C.fuel });
  B.pump(722, y - 15, `${tag}_RUNNING`, {
    size: 30, running, color: running ? C.fuel : '#8a929b',
    name: `Oily water feed pump ${n}` });
  B.valve(776, y - 6, `${tag}_DISCH`, { fill: running ? C.fuel : '#8a929b' });
  B.arrow(840, y - 7, 'right', { color: C.fuel, w: 13, h: 13 });
  // drain funnel under the pump
  B.shape(730, y + 22, 14, 12, 'triangle-down', { fill: '#3050a0', stroke: '#3050a0' });
}

export function commonOilyWater() {
  const B = builder();

  /* ================= area drains ================= */
  [['Drain from eng.\nhall & tank area', 250],
   ['Drain from BS &\ntransformer area', 296],
   ['Drain from\npump house', 342]].forEach(([label, y]) => {
    flag(B, 165, y, 132, 34, label);
    B.pipeH(313, y + 17, 67, OIL);
  });
  B.pipeV(380, 267, 100, OIL);
  B.pipeH(380, 367, 90, OIL);

  /* ================= regulating tank and feed pumps ================= */
  B.zone(452, 228, 448, 292, 'Oily wastewater\ntreatment system', { labelW: 170 });

  B.tank(470, 296, 128, 118, 'COMMON_DAB901_LEVEL', {
    level: 64, capacity: '50 m³', label: 'Oily wastewater\nregulating tank',
    plate: 'DAB 901', switches: false, name: 'Oily wastewater regulating tank',
    fill: C.equipment,
    rows: [{ tag: 'COMMON_DAB901_LEVEL', text: '64 %', unit: '%', decimals: 0 }]
  });

  B.pipeH(598, 355, 10, OIL);
  B.pipeV(608, 355, 105, OIL);
  feedPump(B, 355, 1, true);
  feedPump(B, 460, 2, false);
  B.pipeV(858, 355, 105, OIL);

  /* ================= transfer header ================= */
  B.pipeH(858, HDR_Y, HDR_X - 858, OIL);
  B.arrow(930, HDR_Y - 7, 'right', { color: C.fuel, w: 13, h: 13 });
  B.valve(1012, HDR_Y - 7, 'COMMON_DBB901_INLET_VALVE', { w: 18, h: 13, fill: C.fuel });

  // riser to the sludge oil tank
  B.pipeV(HDR_X, 148, HDR_Y - 148, OIL);
  B.pipeH(HDR_X, 148, 108, OIL);
  B.arrow(1169, 262, 'up', { color: C.fuel, w: 13, h: 13 });
  flag(B, 1283, 132, 128, 34, 'To sludge oil\ntank');
  B.ro(1203, 326, 62, 22, 'DBB 901', '', { size: 9, bold: true, fill: '#c9ced3' });

  /* ================= oily water treatment unit ================= */
  B.zone(1265, 408, 670, 534, 'Oily water\ntreatment unit\nDBB 901', { labelW: 150 });
  B.ro(1662, 414, 68, 22, 'DBB 901', '', { size: 9, bold: true, fill: '#c9ced3' });

  B.rect(1556, 464, 164, 36, { fill: '#dfe3e7', stroke: '#8a929b' });
  B.text(1566, 474, 100, 'Unit running', { size: 9.5, bold: true });
  B.rect(1672, 470, 40, 24, { fill: '#ffffff', stroke: '#5a6068',
    name: 'DBB 901 unit running' });

  // feed down into the separator
  B.pipeV(HDR_X, HDR_Y, 136, OIL);
  B.pipeH(HDR_X, 490, 70, OIL);
  B.arrow(1198, 483, 'right', { color: C.fuel, w: 13, h: 13 });
  B.pipeV(1245, 490, 50, OIL);
  B.pipeH(1175, 540, 110, OIL);
  B.valve(1236, 533, 'COMMON_DBB901_FEED_VALVE', { w: 18, h: 13, fill: C.fuel });
  B.pipeV(1175, 490, 50, OIL);

  // the plate-pack separator
  B.shape(1280, 534, 250, 116, 'separator', { fill: C.equipment, stroke: INK,
    name: 'DBB 901 plate separator' });
  B.shape(1286, 616, 20, 20, 'filter', { fill: '#c9ced3', stroke: INK });
  for (let i = 0; i < 14; i++) {
    B.shape(1288 + i * 17, 650, 13, 14, 'triangle-down', { fill: '#ffffff', stroke: INK });
  }

  // separated oil back to the transfer header
  B.pipeV(1310, 650, 50, OIL);
  B.pipeH(1240, 700, 70, OIL);
  B.pump(1296, 687, 'COMMON_DBB901_OILPUMP_RUNNING', { size: 26, color: '#8a929b',
    fill: '#c9ced3', running: false, name: 'DBB 901 oil pump' });
  B.arrow(1234, 693, 'left', { color: C.fuel, w: 14, h: 14 });
  B.pipeV(1175, 540, 160, OIL);
  B.pipeH(1175, 700, 59, OIL);

  // water side: filter pot, circulating pump, then the polishing section
  B.shape(1580, 520, 36, 82, 'vessel', { fill: C.equipment, stroke: INK,
    name: 'DBB 901 filter pot' });
  B.pipeH(1530, 626, 20, WATER);
  B.pump(1548, 613, 'COMMON_DBB901_CIRC_RUNNING', { size: 26, color: C.cool,
    fill: '#c9ced3', name: 'DBB 901 circulating pump' });
  B.pipeH(1574, 626, 24, WATER);
  B.pipeV(1598, 602, 24, WATER);

  /* ---- dosing and polishing ---- */
  B.zone(1120, 676, 815, 266, '', {});

  // two polishing columns in series: separator ─▶ col 1 ─▶ col 2 ─▶ filter
  [['Polishing column 1', 1320], ['Polishing column 2', 1410]].forEach(([name, x]) =>
    B.shape(x, 754, 30, 60, 'vessel', { fill: C.equipment, stroke: INK, name }));

  B.pipeV(1335, 650, 104, OIL);
  B.pipeV(1335, 814, 38, OIL);
  B.pipeH(1335, 852, 90, OIL);
  B.pump(1362, 839, 'COMMON_DBB901_TRANSFER_RUNNING', { size: 26, color: '#8a929b',
    fill: '#c9ced3', running: false, name: 'DBB 901 transfer pump' });
  B.pipeV(1425, 814, 38, OIL);

  // out of the second column the water is clean, so it turns green here
  B.pipeV(1425, 700, 54, WATER);
  B.pipeH(1425, 700, 123, WATER);
  B.pump(1473, 687, 'COMMON_DBB901_DRAIN_RUNNING', { size: 26, color: C.cool,
    fill: '#c9ced3', name: 'DBB 901 polishing pump' });
  B.pipeV(1548, 700, 48, WATER);

  // dosing pump sets
  [['Dosing pumps', 1180, 2], ['Dosing pump', 1462, 1]].forEach(([label, x, count]) => {
    for (let i = 0; i < count; i++) {
      const px = x + i * 66;
      B.rect(px, 828, 52, 40, { fill: '#c9ced3', stroke: INK });
      B.pump(px + 13, 836, '', { size: 26, color: '#8a929b', fill: '#eceff1',
        running: false, name: label });
      B.pipeV(px + 26, count === 2 ? 800 : 786, count === 2 ? 28 : 42, WATER);
    }
    B.text(x - 6, 878, 64 + (count - 1) * 66, label, { size: 9.5, bold: true,
      align: 'center' });
  });
  B.pipeH(1206, 800, 129, WATER);     // dosing set 1 ─▶ polishing column 1
  B.pipeH(1425, 786, 63, WATER);      // dosing pump 2 ─▶ polishing column 2

  // treated water out, with the oil-in-water monitor
  B.shape(1530, 748, 36, 78, 'vessel', { fill: C.equipment, stroke: INK,
    name: 'DBB 901 polishing filter' });
  B.pipeV(1548, 826, 30, WATER);
  B.pipeH(1548, 856, 100, WATER);
  B.arrow(1636, 849, 'right', { color: C.cool, w: 14, h: 14 });
  B.text(1556, 872, 130, 'Water outlet', { size: 9.5, bold: true });
  B.ro(1600, 812, 116, 26, '1 ppm', 'COMMON_DBB901_PPM',
    { bold: true, decimals: 0, unit: 'ppm', fill: '#eceff1' });

  return {
    screen_id: 'Common.OilyWater',
    title: 'Common — Oily water',
    unit: 'COMMON',
    layout: 'canvas',
    canvas: { width: 1960, height: 950, background: C.ground },
    elements: B.elements
  };
}
