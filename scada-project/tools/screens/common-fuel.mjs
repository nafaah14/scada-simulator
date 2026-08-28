/* =====================================================================
   Common → Fuel
   ---------------------------------------------------------------------
   The plant fuel train end to end: unloading into four LFO storage
   tanks, transfer pumps lifting into two daily-tank areas, and the
   feeder unit sending LFO on to the genset booster units.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

export function commonFuel() {
  const B = builder();

  /* ---------- LFO storage tanks ---------- */
  const STORAGE = [
    { name: 'PAE 901', pct: 19, temps: [34, 33, 32, 29], y: 60, tag: 'PAF901_LEVEL', primary: false },
    { name: 'PAE 902', pct: 49, temps: [33, 33, 30, 30], y: 226, tag: 'PAF902_LEVEL', primary: false },
    { name: 'PAE 903', pct: 83, temps: [33, 30, 30, 30], y: 392, tag: 'PAF903_LEVEL', primary: false },
    { name: 'PAE 904', pct: 29, temps: [33, 33, 29, 29], y: 558, tag: 'PAE904_LEVEL', primary: true }
  ];
  const SX = 190, SW = 104, SH = 132;

  STORAGE.forEach(t => {
    const key = t.name.replace(' ', '');
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

    B.button(14, t.y + 26, 100, 30,
      t.primary ? 'Select for\nprimary tank' : 'Select for\nprimary tank',
      { size: 9, color: t.primary ? '#8a929b' : '#1d242b' });

    // outlet into the suction header
    B.pipeH(SX + SW, t.y + SH / 2, 60);
    B.pipeH(130, t.y + 40, 60);
  });
  B.pipeV(354, 126, 500);          // storage suction header
  B.pipeV(130, 100, 640);          // fill header from unloading

  /* ---------- unloading pump unit ---------- */
  B.zone(20, 706, 250, 118, 'LFO unloading\npump unit\nPAD 901', { labelSize: 9 });
  [[62, 'COMMON_PAD901_P1'], [126, 'COMMON_PAD901_P2']].forEach(([x, tag], i) => {
    B.valve(x + 4, 742, `${tag}_V`);
    B.pump(x - 4, 756, tag, { size: 26, running: false, color: '#5a6068', fill: C.field });
    B.rect(x - 2, 790, 22, 14, { fill: '#3f8fce', stroke: '#2c6ea0' });
    B.text(x - 4, 806, 26, String(i + 1), { size: 8.5, align: 'center' });
    B.pipeV(x + 9, 720, 36);
  });
  B.ro(20, 676, 100, 20, '0.0 m3/h', 'COMMON_UNLOAD_FLOW');
  B.rect(196, 760, 70, 48, { fill: C.panel, stroke: '#5a6068', name: 'Control panel BJC951' });
  B.text(198, 768, 66, 'Control\nPanel\nBJC 951', { size: 8.5, align: 'center', h: 36 });

  /* ---------- transfer pump units ---------- */
  B.zone(430, 300, 250, 130, 'LFO transfer\npump unit\nPAF 901', { labelSize: 9 });
  B.button(436, 352, 108, 20, 'Select for main');
  B.pump(452, 360, 'COMMON_PAF901_PUMP', { size: 26, running: false, color: '#5a6068',
    fill: C.field, name: 'Transfer pump PAF901' });
  B.text(438, 356, 14, 'P', { size: 9, bold: true });
  B.rect(436, 372, 14, 14, { fill: '#3f8fce', stroke: '#2c6ea0' });
  B.valve(484, 366, 'COMMON_PAF901_V');
  B.ro(506, 356, 76, 20, '0.0 A', 'COMMON_PAF901_PUMP_A');

  B.zone(430, 448, 250, 130, 'LFO transfer\npump unit\nPAF 902', { labelSize: 9 });
  B.button(436, 500, 108, 20, 'Select for main', { color: '#8a929b' });
  B.text(548, 500, 90, 'Main pump', { size: 9.5, bold: true });
  B.pump(452, 508, 'COMMON_PAF902_PUMP', { size: 26, running: false, color: '#5a6068',
    fill: C.field, name: 'Transfer pump PAF902' });
  B.text(438, 504, 14, 'P', { size: 9, bold: true });
  B.rect(436, 520, 14, 14, { fill: '#3f8fce', stroke: '#2c6ea0' });
  B.valve(484, 514, 'COMMON_PAF902_V');
  B.ro(506, 504, 76, 20, '0.0 A', 'COMMON_MAIN_PUMP_A');

  B.pipeH(354, 372, 98);
  B.pipeH(354, 520, 98);
  B.pipeH(582, 372, 40);
  B.pipeH(582, 520, 40);
  B.pipeV(622, 372, 148);
  B.pipeH(622, 372, 60);
  B.ro(690, 356, 86, 22, '0.2 bar', 'COMMON_TRANSFER_PRESS', { bold: true });
  B.pipeH(776, 372, 44);

  /* ---------- daily tank areas ---------- */
  const DAY = [
    { area: 'Daily tank area 01', x: 830, tag: 'PBF 901',
      tanks: [['PBF 901', 78, [30, 30], 'PBF901_LEVEL'],
              ['PBF 902', 80, [30, 30], 'PBF902_LEVEL'],
              ['PBF 903', 60, [32, 30], 'PBF903_LEVEL']] },
    { area: 'Daily tank area 02', x: 1180, tag: 'PBF 904',
      tanks: [['PBF 904', 61, [33, 30], 'PBF904_LEVEL'],
              ['PBF 905', 78, [31, 30], 'PBF905_LEVEL'],
              ['PBF 906', 80, [30, 30], 'PBF906_LEVEL']] }
  ];

  DAY.forEach(area => {
    B.zone(area.x, 60, 330, 560, area.area, { labelW: 200 });
    B.text(area.x + 240, 66, 84, area.tag, { size: 9.5, bold: true, align: 'right' });

    area.tanks.forEach((t, i) => {
      const [name, pct, temps, tag] = t;
      const key = name.replace(' ', '');
      const y = 110 + i * 175, tx = area.x + 150;
      B.tank(tx, y, 96, 116, tag, {
        level: pct, capacity: '25 m³', label: 'LFO day tank', plate: name, name,
        rows: [
          { tag, text: pct + ' %', unit: '%', decimals: 0 },
          ...temps.map((v, k) => ({
            tag: `COMMON_${key}_T${k + 1}`, text: v + ' °C', unit: '°C', decimals: 0
          }))
        ]
      });

      // fill line in from the transfer header, with the auto valve
      B.text(area.x + 76, y + 24, 14, 'A', { size: 9, bold: true });
      B.valve(area.x + 66, y + 38, `COMMON_${name.replace(' ', '')}_FILL_V`, { open: false });
      B.pipeH(area.x + 24, y + 44, 42);
      B.pipeH(area.x + 81, y + 44, 69);

      // outlet down the area's return header
      B.pipeH(tx + 96, y + 60, 40);
      B.text(area.x + 300, y + 40, 14, 'A', { size: 9, bold: true });
      B.valve(area.x + 296, y + 54, `COMMON_${name.replace(' ', '')}_OUT_V`,
        { open: i === 2 });
    });
    B.pipeV(area.x + 24, 154, 350);
    B.pipeV(area.x + 303, 170, 350);
  });
  B.pipeH(820, 154, 34);
  B.pipeV(820, 154, 218);

  /* ---------- feeder unit PCA901 ---------- */
  B.zone(600, 650, 700, 175, 'Feeder unit\nPCA901', { labelSize: 10 });
  B.led(612, 700, 'COMMON_PCA901_CTRL_VOLTAGE', { w: 12, h: 12 });
  B.text(630, 700, 130, 'Control voltage', { size: 9.5 });
  B.rect(770, 692, 12, 12, { fill: C.field, stroke: '#5a6068' });
  B.text(790, 692, 160, 'Slow start ctrl. active', { size: 9.5 });
  B.ro(760, 716, 76, 20, '50 %', 'COMMON_PCA901_SPEED_PCT', { bold: true });
  B.button(1150, 654, 130, 30, 'Shift+2\nLFO feeder control', { size: 9 });

  [[746, 'COMMON_PCA901_P1', true], [806, 'COMMON_PCA901_P2', false]]
    .forEach(([y, tag, running], i) => {
      B.valve(612, y - 5, `${tag}_V`);
      B.rect(660, y - 7, 16, 14, { fill: '#3f8fce', stroke: '#2c6ea0' });
      B.rect(806, y - 12, 24, 24, { fill: C.field, stroke: '#5a6068' });
      B.text(808, y - 8, 20, '≈', { size: 11, align: 'center' });
      B.text(846, y - 22, 34, 'Auto', { size: 9 });
      B.pump(846, y - 12, tag, { size: 24, running, name: 'Feeder pump ' + (i + 1) });
      B.text(870, y + 4, 10, String(i + 1), { size: 8.5 });
      B.rect(890, y - 8, 12, 12, { fill: C.field, stroke: '#5a6068' });
      B.text(908, y - 8, 110, 'Motor heating', { size: 9.5 });
      B.ro(1010, y - 10, 76, 20, '4.6 bar', 'PCA901_PRESS');
      B.pipeH(600, y, 12);
      B.pipeH(627, y, 33);
      B.pipeH(676, y, 130);
      B.pipeH(830, y, 16);
      B.pipeH(868, y, 142);
      B.pipeH(1086, y, 40);
    });

  B.pipeV(1126, 746, 60);
  B.ro(1150, 704, 76, 20, '4.5 bar', 'COMMON_PCA901_OUT_PRESS_A');
  B.ro(1150, 726, 76, 20, '4.5 bar', 'COMMON_PCA901_OUT_PRESS_B');
  B.ro(1236, 726, 96, 20, '9.4 m3/h', 'COMMON_PCA901_FLOW');
  B.pipeH(1126, 746, 210);
  B.text(1344, 736, 170, '▶ LFO to genset\nbooster units', { size: 9.5, h: 24 });

  // feeder suction comes down from the day-tank areas
  B.pipeH(600, 690, 0);
  B.pipeV(600, 620, 126);

  /* ---------- sludge ---------- */
  B.rect(560, 856, 92, 52, { fill: C.equipment, stroke: '#5a6068', bevel: true,
    name: 'Sludge tank DDB901' });
  B.ro(566, 866, 62, 18, '30 °C', 'COMMON_SLUDGE_TEMP', { size: 9.5 });
  B.text(566, 890, 62, '3 m³', { size: 8.5, color: '#f2f4f6' });
  B.led(638, 862, 'COMMON_SLUDGE_LEVEL', { w: 12, h: 12, fill: '#e9ecef', stroke: '#5a6068' });
  B.text(560, 912, 140, 'Sludge tank\nDDB 901', { size: 8.5, h: 22 });
  B.zone(700, 846, 220, 76, 'Sludge loading\npump unit\nDDD 901', { labelSize: 9 });
  B.valve(722, 897, 'COMMON_SLUDGE_V1');
  B.pump(748, 888, 'COMMON_SLUDGE_PUMP', { size: 24, running: false, color: '#5a6068',
    fill: C.field });
  B.valve(786, 897, 'COMMON_SLUDGE_V2');
  B.pipeH(652, 902, 70);
  B.pipeH(737, 902, 11);
  B.pipeH(772, 902, 14);
  B.pipeH(801, 902, 160);
  B.text(966, 894, 30, '⟩', { size: 12 });

  return {
    screen_id: 'Common.Fuel',
    title: 'Common — Fuel',
    unit: 'COMMON',
    layout: 'canvas',
    canvas: { width: 1560, height: 900, background: C.ground },
    elements: B.elements
  };
}
