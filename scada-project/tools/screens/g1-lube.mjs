/* =====================================================================
   G1 → Lube
   ---------------------------------------------------------------------
   Lube oil circuit: the engine's own pump draws from the sump, through
   the LT-water cooler and filter to the engine gallery. A separator
   loop runs continuously off the sump, dumping to the sludge system,
   and the crankcase breathes through an oil mist separator.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

const OIL = { color: C.lube, t: 3 };
const VENT = { color: C.charge, t: 2 };

export function g1Lube() {
  const B = builder();

  /* ================= header ================= */
  B.text(628, 30, 130, 'Engine speed', { size: 9.5, align: 'right' });
  B.ro(768, 26, 92, 20, '750 rpm', 'SCA011ST103PV', { align: 'right', decimals: 0 });
  B.text(588, 54, 170, 'Gen. active power', { size: 9.5, align: 'right' });
  B.ro(768, 50, 92, 20, '8052 kW', 'SCA011PW104PV', { align: 'right', decimals: 0 });

  /* ================= oil mist separator ================= */
  B.zone(910, 34, 210, 68, 'Oil mist separator QBF 021', { labelW: 190, labelSize: 9.5 });
  B.pump(984, 58, 'G01_OIL_MIST_FAN', { size: 28, running: true, name: 'Oil mist fan' });
  B.pipeV(940, 20, 46, VENT);
  B.pipeH(940, 66, 44, VENT);

  /* ================= lube oil separator ================= */
  const SZ = { x: 40, y: 120, w: 270, h: 300 };
  B.zone(SZ.x, SZ.y, SZ.w, SZ.h, 'Lube oil separator QBB 021',
    { labelW: 200, labelSize: 9.5 });
  B.rect(52, 146, 62, 40, { fill: C.panel, stroke: '#5a6068', name: 'Control panel BJN021' });
  B.text(54, 152, 58, 'Control\nPanel\nBJN 021', { size: 8, align: 'center', h: 30 });

  // separator bowl, its drive motor and the feed pump
  B.shape(104, 226, 30, 30, 'diamond', { fill: '#2f6fd0', stroke: '#1d4d96',
    name: 'Separator bowl' });
  B.rect(140, 232, 20, 20, { fill: C.field, stroke: '#5a6068', radius: 10 });
  B.text(140, 237, 20, 'M', { size: 9, align: 'center', bold: true });
  B.pump(172, 230, 'G01_SEP_FEED_PUMP', { size: 24, running: true, name: 'Separator pump' });
  B.rect(174, 258, 18, 12, { fill: '#3aa0a8', stroke: '#2c7d84' });

  // preheater on the separator feed
  B.shape(140, 190, 30, 24, 'exchanger', { name: 'Separator preheater' });
  B.valve(106, 194, 'G01_SEP_V1');
  B.pipeH(94, 200, 12, OIL);
  B.pipeH(121, 200, 19, OIL);
  B.pipeH(170, 200, 14, OIL);
  B.pipeV(184, 200, 30, OIL);

  // sludge bowl and discharge pump
  B.rect(88, 288, 64, 34, { fill: '#9aa2ab', stroke: '#5a6068', name: 'Sludge space' });
  B.pipeV(119, 256, 32, OIL);
  B.pump(110, 336, 'G01_SEP_SLUDGE_PUMP', { size: 22, running: false });
  B.pipeV(121, 322, 14, OIL);
  B.pipeH(132, 347, 38, OIL);
  B.rect(170, 332, 104, 30, { fill: C.field, stroke: '#5a6068' });
  B.text(172, 338, 100, 'To sludge\ncollecting system', { size: 8.5, h: 20 });
  B.arrow(276, 342, 'right', { color: C.lube });

  // separator suction / return to the engine sump
  B.pipeV(94, 200, 190, OIL);
  B.pipeH(94, 390, 700, OIL);
  B.pipeH(94, 410, 700, OIL);
  B.arrow(430, 385, 'left', { color: C.lube });
  B.arrow(430, 405, 'right', { color: C.lube });

  /* ================= engine lube circuit ================= */
  const EZ = { x: 340, y: 130, w: 700, h: 250 };
  B.zone(EZ.x, EZ.y, EZ.w, EZ.h, 'Engine 021', { labelW: 150, labelSize: 9.5 });

  // LT-water cooled oil cooler
  B.shape(388, 156, 32, 30, 'exchanger', { name: 'Lube oil cooler' });
  B.pipeH(356, 171, 32, { color: C.cool, t: 2 });
  B.arrow(370, 166, 'right', { color: C.cool });
  B.pipeH(420, 171, 32, { color: C.cool, t: 2 });
  B.arrow(432, 166, 'right', { color: C.cool });
  B.text(458, 164, 90, 'LT water', { size: 9.5 });

  // automatic filter with its differential pressure
  const GALLERY_Y = 232;
  B.pipeV(404, 186, GALLERY_Y - 186, OIL);
  B.pipeH(404, GALLERY_Y, 26, OIL);
  B.valve(430, GALLERY_Y - 5, 'G01_LUBE_FILTER_V');
  B.pipeH(445, GALLERY_Y, 115, OIL);
  B.ro(516, 190, 84, 22, '0.7 bar', 'G01_LUBE_FILTER_DP', { bold: true, decimals: 1 });
  B.rect(552, GALLERY_Y - 9, 20, 18, { fill: '#3aa0a8', stroke: '#2c7d84',
    name: 'Filter' });
  B.pipeV(558, 212, 20, OIL);
  B.pipeH(572, GALLERY_Y, 252, OIL);
  B.arrow(660, GALLERY_Y - 5, 'right', { color: C.lube });

  // engine inlet conditions
  B.text(700, 178, 40, 'TC A', { size: 9 });
  B.ro(740, 174, 84, 20, '1.8 bar', 'G01_LUBE_TCA_PRESS', { decimals: 1 });
  B.text(700, 200, 40, 'TC B', { size: 9 });
  B.ro(740, 196, 84, 20, '1.7 bar', 'G01_LUBE_TCB_PRESS', { decimals: 1 });
  B.ro(740, 222, 84, 22, '4.6 bar', 'G01_LUBE_PRESS', { bold: true, decimals: 1 });
  B.ro(740, 246, 84, 22, '63 °C', 'G01_LUBE_TEMP', { bold: true, decimals: 0 });

  // the engine, with crankcase pressure and the mist vent
  B.engine(844, 208, 168, 60, 'G01_STATE',
    { state: 'running', text: '1', name: 'Genset 1' });
  B.ro(908, 174, 96, 22, '-0.2 mbar', 'G01_CRANKCASE_PRESS', { bold: true, decimals: 1 });
  B.pipeV(940, 102, 106, VENT);
  B.rect(920, 268, 18, 18, { fill: C.field, stroke: '#5a6068', radius: 9 });
  B.text(920, 273, 18, 'S', { size: 8.5, align: 'center' });

  // engine-driven pump and its standby, returning from the sump
  B.text(636, 292, 40, 'Auto', { size: 9 });
  B.pump(690, 286, 'G01_LUBE_PUMP_MAIN', { size: 26, running: true,
    color: '#5a6068', fill: C.field, name: 'Main lube pump' });
  B.pump(632, 306, 'G01_LUBE_PUMP_STBY', { size: 26, running: false,
    color: '#5a6068', fill: C.field, name: 'Standby lube pump' });
  B.pipeH(716, 299, 108, OIL);
  B.pipeV(824, 268, 31, OIL);
  B.pipeH(658, 299, 32, OIL);
  B.pipeH(404, 319, 228, OIL);
  B.pipeV(404, 232, 87, OIL);
  B.arrow(500, 314, 'left', { color: C.lube });

  /* ================= mobile pump connection ================= */
  B.pipeV(940, 286, 96, VENT);
  B.valve(933, 382, 'G01_MOBILE_PUMP_V', { open: false });
  B.pipeV(940, 393, 24, VENT);
  B.pipeH(918, 417, 44, VENT);
  B.text(892, 424, 130, 'Connection for\nmobile pump', { size: 8.5, h: 22 });

  return {
    screen_id: 'G1.Lube',
    title: 'G1 — Lube oil',
    unit: 'G1',
    layout: 'canvas',
    canvas: { width: 1160, height: 470, background: C.ground },
    elements: B.elements
  };
}
