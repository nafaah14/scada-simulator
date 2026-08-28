/* =====================================================================
   Common → Fuel
   ---------------------------------------------------------------------
   The plant fuel train end to end. Flow reads:

     unloading ─▶ storage tanks ─▶ transfer pumps ─▶ top header
       ─▶ down each daily-tank area, filling its three day tanks
       ─▶ out the area's right-hand header, down to the bottom return
       ─▶ left into the feeder unit ─▶ out to the genset booster units

   The routing is the point of this page, so headers are drawn as
   continuous runs with the branch valves sitting on them.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

/* horizontal geometry the whole page hangs off */
const FILL_X = 118;        // unloading → storage fill header
const SUCT_X = 306;        // storage suction header
const RISER_X = 700;       // transfer discharge riser up to the top header
const TOP_Y = 104;         // header feeding both daily-tank areas
const RETURN_Y = 612;      // day-tank outlets back to the feeder unit
const FEED_X = 360;        // feeder unit suction drop

export function commonFuel() {
  const B = builder();

  /* ================= LFO storage tanks ================= */
  const STORAGE = [
    { name: 'PAE 901', pct: 19, temps: [34, 33, 32, 29], y: 40, tag: 'PAF901_LEVEL' },
    { name: 'PAE 902', pct: 49, temps: [33, 33, 30, 30], y: 178, tag: 'PAF902_LEVEL' },
    { name: 'PAE 903', pct: 83, temps: [33, 30, 30, 30], y: 316, tag: 'PAF903_LEVEL' },
    { name: 'PAE 904', pct: 29, temps: [33, 33, 29, 29], y: 454, tag: 'PAE904_LEVEL',
      primary: true }
  ];
  const SX = 152, SW = 104, SH = 124;

  STORAGE.forEach(t => {
    const key = t.name.replace(' ', '');
    const cy = t.y + SH / 2;

    B.button(14, t.y + 30, 100, 30, 'Select for\nprimary tank',
      { size: 9, color: t.primary ? '#8a929b' : '#1d242b' });

    B.tank(SX, t.y, SW, SH, t.tag, {
      level: t.pct, capacity: '800 m³', label: 'LFO storage tank', plate: t.name,
      name: 'LFO storage ' + t.name,
      fill: t.primary ? '#3f8f4f' : C.equipment,
      rows: [
        { tag: t.tag, text: t.pct + ' %', unit: '%', decimals: 0 },
        ...t.temps.map((v, i) => ({
          tag: `COMMON_${key}_T${i + 1}`, text: v + ' °C', unit: '°C', decimals: 0
        }))
      ]
    });

    B.pipeH(FILL_X, t.y + 34, SX - FILL_X);       // fill in from the unloading header
    B.pipeH(SX + SW, cy, SUCT_X - (SX + SW));     // suction out to the transfer header
  });
  B.pipeV(FILL_X, 74, 560);
  B.pipeV(SUCT_X, STORAGE[0].y + SH / 2, STORAGE[3].y + SH / 2 - (STORAGE[0].y + SH / 2));

  /* ================= unloading pump unit ================= */
  B.zone(14, 640, 250, 122, 'LFO unloading\npump unit\nPAD 901', { labelSize: 9 });
  B.ro(14, 610, 100, 20, '0.0 m3/h', 'COMMON_UNLOAD_FLOW', { decimals: 1 });
  [[70, 'COMMON_PAD901_P1'], [150, 'COMMON_PAD901_P2']].forEach(([x, tag], i) => {
    B.pipeV(x + 11, 700, 44);                     // suction up from the jetty line
    B.valve(x + 4, 690, `${tag}_V`, { open: false });
    B.pump(x - 2, 700, tag, { size: 26, running: false, color: '#5a6068', fill: C.field });
    B.rect(x, 734, 22, 13, { fill: '#3aa0a8', stroke: '#2c7d84' });
    B.text(x - 2, 750, 26, String(i + 1), { size: 8.5, align: 'center' });
    B.pipeV(x + 11, 660, 30);
  });
  B.pipeH(81, 660, 80);
  B.pipeV(FILL_X, 634, 26);
  B.rect(196, 700, 68, 46, { fill: C.panel, stroke: '#5a6068', name: 'Control panel BJC951' });
  B.text(198, 708, 64, 'Control\nPanel\nBJC 951', { size: 8.5, align: 'center', h: 36 });

  /* ================= transfer pump units ================= */
  const transfer = (y, plate, tag, opt = {}) => {
    B.zone(330, y, 234, 128, `LFO transfer\npump unit\n${plate}`, { labelSize: 9, labelW: 96 });
    B.button(336, y + 6, 104, 20, 'Select for main',
      { size: 9, color: opt.main ? '#8a929b' : '#1d242b' });
    if (opt.main) B.text(336, y + 46, 100, 'Main pump', { size: 9.5, bold: true });

    const py = y + 78;
    B.pump(400, py - 13, `${tag}_PUMP`, { size: 26, running: false,
      color: '#5a6068', fill: C.field, name: 'Transfer pump ' + plate });
    B.rect(370, py - 7, 20, 14, { fill: '#3aa0a8', stroke: '#2c7d84' });
    B.text(348, py - 20, 14, 'P', { size: 9, bold: true });
    B.rect(344, py - 7, 14, 14, { fill: C.field, stroke: '#5a6068', radius: 7 });
    B.text(428, py - 20, 14, 'A', { size: 9, bold: true });
    B.valve(430, py - 5, `${tag}_V`, { open: false });
    B.ro(456, py - 11, 84, 22, '0.0 A', `${tag}_PUMP_A`, { decimals: 1 });

    B.pipeH(SUCT_X, py, 38);                      // suction in
    B.pipeH(390, py, 10);
    B.pipeH(426, py, 4);
    B.pipeH(445, py, 11);
    return py;
  };
  const pyA = transfer(250, 'PAF 901', 'COMMON_PAF901');
  const pyB = transfer(400, 'PAF 902', 'COMMON_PAF902', { main: true });

  // both discharges join, pass the header pressure gauge, and rise
  B.pipeH(540, pyA, 40);
  B.pipeH(540, pyB, 40);
  B.pipeV(580, pyA, pyB - pyA);
  const midY = (pyA + pyB) / 2;
  B.pipeH(580, midY, 18);
  B.ro(598, midY - 11, 86, 22, '0.2 bar', 'COMMON_TRANSFER_PRESS',
    { bold: true, decimals: 1 });
  B.pipeH(684, midY, RISER_X - 684);
  B.pipeV(RISER_X, TOP_Y, midY - TOP_Y);
  B.pipeH(RISER_X, TOP_Y, (1062 + 348 - 22) - RISER_X);   // header across both areas

  /* ================= daily tank areas ================= */
  const AREAS = [
    { title: 'Daily tank area 01', plate: 'PBF 901', x: 700,
      tanks: [['PBF 901', 78, [30, 30]], ['PBF 902', 80, [30, 30]], ['PBF 903', 60, [32, 30]]] },
    { title: 'Daily tank area 02', plate: 'PBF 904', x: 1062,
      tanks: [['PBF 904', 61, [33, 30]], ['PBF 905', 78, [31, 30]], ['PBF 906', 80, [30, 30]]] }
  ];
  const AW = 348, AY = 140, AH = 452;

  AREAS.forEach((area, ai) => {
    B.zone(area.x, AY, AW, AH, area.title, { labelW: 150 });
    B.text(area.x + AW - 96, AY + 6, 88, area.plate,
      { size: 9.5, bold: true, align: 'right' });

    const dropX = area.x + 44;                    // fill drop down the left of the area
    const outX = area.x + AW - 22;                // outlet header down the right
    const tx = area.x + 128, TW = 96, TH = 116;

    B.pipeV(dropX, TOP_Y, 340);

    area.tanks.forEach((t, i) => {
      const [name, pct, temps] = t;
      const key = name.replace(' ', '');
      const y = AY + 40 + i * 140;
      const fillY = y + 26, outY = y + 74;

      B.tank(tx, y, TW, TH, `${key}_LEVEL`, {
        level: pct, capacity: '25 m³', label: 'LFO day tank', plate: name, name,
        rows: [
          { tag: `${key}_LEVEL`, text: pct + ' %', unit: '%', decimals: 0 },
          ...temps.map((v, k) => ({
            tag: `COMMON_${key}_T${k + 1}`, text: v + ' °C', unit: '°C', decimals: 0
          }))
        ]
      });

      // fill branch: header ─▶ auto valve ─▶ tank
      B.text(dropX + 10, fillY - 20, 14, 'A', { size: 9, bold: true });
      B.pipeH(dropX, fillY, 12);
      B.valve(dropX + 12, fillY - 5, `COMMON_${key}_FILL_V`, { open: false });
      B.pipeH(dropX + 27, fillY, tx - (dropX + 27));

      // outlet branch: tank ─▶ auto valve ─▶ area outlet header
      B.text(tx + TW + 26, outY - 20, 14, 'A', { size: 9, bold: true });
      B.pipeH(tx + TW, outY, 28);
      B.valve(tx + TW + 28, outY - 5, `COMMON_${key}_OUT_V`, { open: i === 2 });
      B.pipeH(tx + TW + 43, outY, outX - (tx + TW + 43));
    });

    B.pipeV(outX, AY + 114, RETURN_Y - (AY + 114));
    if (ai === 1) B.pipeH(area.x + AW - 22 - 0, RETURN_Y, 0);
  });

  // bottom return: both area outlets ─▶ left ─▶ down into the feeder unit
  B.pipeH(FEED_X, RETURN_Y, (AREAS[1].x + AW - 22) - FEED_X);
  B.text(AREAS[0].x - 30, RETURN_Y - 7, 16, '◀', { size: 11, color: C.fuel });
  B.pipeV(FEED_X, RETURN_Y, 82);

  /* ================= feeder unit PCA901 ================= */
  const FZ = { x: 330, y: 648, w: 1030, h: 176 };
  B.zone(FZ.x, FZ.y, FZ.w, FZ.h, 'Feeder unit\nPCA901', { labelSize: 10 });

  // pressure controller, tapped off the discharge and dotted back to the drives
  B.rect(444, 664, 26, 26, { fill: C.field, stroke: '#5a6068', radius: 13,
    name: 'Pressure controller' });
  B.text(444, 671, 26, 'PC', { size: 8.5, align: 'center', bold: true });
  B.line(470, 677, 120, 0, { dir: 'h', color: '#6b7480', dash: 3 });

  B.rect(600, 670, 12, 12, { fill: '#ffffff', stroke: '#5a6068' });
  B.text(618, 670, 180, 'Slow start ctrl. active', { size: 9.5 });

  B.led(340, 700, 'COMMON_PCA901_CTRL_VOLTAGE', { w: 12, h: 12, shape: 'square' });
  B.text(358, 700, 130, 'Control voltage', { size: 9.5 });
  B.ro(470, 694, 76, 22, '50 %', 'COMMON_PCA901_SPEED_PCT', { bold: true, decimals: 0 });

  B.button(810, 664, 130, 30, 'Shift+2\nLFO feeder control', { size: 9 });

  const rows = [
    { y: 742, tag: 'COMMON_PCA901_P1', running: true, drive: '#2fa84f' },
    { y: 790, tag: 'COMMON_PCA901_P2', running: false, drive: '#c9ced3' }
  ];
  rows.forEach((r, i) => {
    B.pipeH(FEED_X, r.y, 24);
    B.rect(348, r.y - 20, 14, 14, { fill: C.field, stroke: '#5a6068', radius: 7 });
    B.valve(384, r.y - 5, `${r.tag}_V`);
    B.pipeH(399, r.y, 21);
    B.rect(420, r.y - 7, 20, 14, { fill: '#3aa0a8', stroke: '#2c7d84' });
    B.pipeH(440, r.y, 40);

    // variable-speed drive
    B.rect(480, r.y - 13, 26, 26, { fill: r.drive, stroke: '#5a6068' });
    B.text(480, r.y - 8, 26, '≈', { size: 12, align: 'center' });
    B.pipeH(506, r.y, 24);

    B.text(530, r.y - 24, 34, 'Auto', { size: 9 });
    B.pump(530, r.y - 13, r.tag, { size: 26, running: r.running,
      name: 'Feeder pump ' + (i + 1) });
    B.text(556, r.y + 6, 12, String(i + 1), { size: 8.5 });
    B.pipeH(556, r.y, 30);

    B.rect(590, r.y - 7, 13, 13, { fill: '#ffffff', stroke: '#5a6068' });
    B.text(608, r.y - 7, 110, 'Motor heating', { size: 9.5 });
    B.ro(714, r.y - 11, 84, 22, '4.6 bar', 'PCA901_PRESS', { decimals: 1 });
    B.pipeH(798, r.y, 92);
  });

  // discharge manifold → header pressures → flow → out to the boosters
  B.pipeV(890, rows[0].y, rows[1].y - rows[0].y);
  B.pipeV(890, 706, rows[0].y - 706);
  B.ro(950, 696, 84, 22, '4.5 bar', 'COMMON_PCA901_OUT_PRESS_A', { decimals: 1 });
  B.ro(950, 720, 84, 22, '4.5 bar', 'COMMON_PCA901_OUT_PRESS_B', { decimals: 1 });
  B.pipeH(890, 706, 60);
  B.ro(1046, 720, 96, 22, '9.4 m3/h', 'COMMON_PCA901_FLOW', { decimals: 1 });
  B.pipeH(1034, 731, 12);
  B.pipeH(1142, 731, 68);
  B.rect(1210, 716, 116, 32, { fill: C.field, stroke: '#5a6068' });
  B.text(1212, 722, 112, 'LFO to genset\nbooster units', { size: 9, h: 22 });
  B.text(1328, 724, 16, '▶', { size: 11, color: C.fuel });

  /* ================= sludge ================= */
  B.tank(96, 846, 92, 62, 'COMMON_SLUDGE_LEVEL', {
    level: 40, capacity: '3 m³', label: 'Sludge tank', plate: 'DDB 901',
    name: 'Sludge tank', switches: false,
    rows: [{ tag: 'COMMON_SLUDGE_TEMP', text: '30 °C', unit: '°C', decimals: 0 }]
  });
  B.zone(230, 842, 210, 70, 'Sludge loading\npump unit\nDDD 901', { labelSize: 8.5 });
  B.text(376, 846, 56, 'BJV 901', { size: 9, bold: true, align: 'right' });
  B.pipeH(188, 898, 66);
  B.valve(254, 893, 'COMMON_SLUDGE_V1', { open: false });
  B.pipeH(269, 898, 12);
  B.pump(281, 886, 'COMMON_SLUDGE_PUMP', { size: 24, running: false,
    color: '#5a6068', fill: C.field });
  B.pipeH(305, 898, 12);
  B.valve(317, 893, 'COMMON_SLUDGE_V2', { open: false });
  B.pipeH(332, 898, 178);
  B.text(508, 890, 16, '⟩', { size: 13 });

  return {
    screen_id: 'Common.Fuel',
    title: 'Common — Fuel',
    unit: 'COMMON',
    layout: 'canvas',
    canvas: { width: 1470, height: 940, background: C.ground },
    elements: B.elements
  };
}
