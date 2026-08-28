/* =====================================================================
   G1 → Cooling
   ---------------------------------------------------------------------
   Three coupled water circuits:

     sea water  — pond pumps through the central cooler and the MED unit
     LT         — charge air coolers and the lube oil cooler, trimmed by
                  a temperature control valve
     HT         — engine jackets and the first charge air stage, trimmed
                  by its own control valve, with a preheater for standby

   Both engine circuits share the expansion vessel; the maintenance
   water tank tops them up.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

const W = { color: C.cool, t: 3 };          // cooling water
const WT = { color: C.cool, t: 2 };

export function g1Cooling() {
  const B = builder();

  /* ================= aux ventilation ================= */
  B.zone(96, 76, 176, 106, 'Aux ventilation', { labelW: 140, labelSize: 9.5 });
  [110, 152].forEach((y, i) => {
    B.pump(150, y, `G01_AUX_FAN_${i + 1}`, { size: 24, running: true,
      name: 'Aux ventilation fan ' + (i + 1) });
    B.shape(176, y + 4, 18, 16, 'triangle-right', { fill: '#9aa2ab' });
    B.ro(140, y + 24, 66, 18, '32 A', `G01_AUX_FAN_${i + 1}_A`, { size: 9, decimals: 0 });
  });

  /* ================= sea water system ================= */
  const SZ = { x: 24, y: 214, w: 268, h: 300 };
  B.zone(SZ.x, SZ.y, SZ.w, SZ.h, 'Sea Water System', { labelW: 160, labelSize: 10 });

  [['Front\nPond 2', 258], ['Front\nPond 1', 336]].forEach(([label, y], i) => {
    B.text(30, y - 6, 54, label, { size: 8.5, h: 20 });
    B.pump(84, y - 12, `G01_SW_PUMP_${i + 1}`, { size: 24, running: i === 0,
      name: label.replace('\n', ' ') + ' pump' });
    B.shape(110, y - 8, 16, 16, 'triangle-right', { fill: C.cool, stroke: '#007a00' });
    B.pump(84, y + 20, `G01_SW_PUMP_${i + 1}_STBY`, { size: 24, running: false,
      color: '#5a6068', fill: C.field });
    B.shape(110, y + 24, 16, 16, 'triangle-right', { fill: '#9aa2ab' });
    if (i === 1) B.text(30, y + 26, 60, 'Standby', { size: 8.5 });
    B.pipeH(108, y, 22, W);
    B.pipeV(130, y, 28, W);
  });
  B.pipeV(130, 258, 78, W);
  B.pipeH(130, 258, 26, W);

  B.valve(158, 305, 'G01_SW_V1');
  B.ro(134, 274, 66, 18, '3.0 bar', 'G01_SW_PRESS', { size: 9, decimals: 1 });
  B.ro(134, 294, 66, 18, '30 °C', 'G01_SW_TEMP', { size: 9, decimals: 0 });

  // VHA 031 — the sea water strainer / booster set
  B.zone(196, 286, 76, 90, 'VHA 031', { labelW: 60, labelSize: 8.5 });
  ['M', 'P', 'S'].forEach((l, i) => {
    B.rect(220, 306 + i * 22, 18, 18, { fill: C.field, stroke: '#5a6068', radius: 9 });
    B.text(220, 311 + i * 22, 18, l, { size: 8.5, align: 'center', bold: true });
  });
  B.pipeH(200, 315, 20, W);
  B.pipeH(238, 315, 34, W);
  B.valve(272, 310, 'G01_SW_V2');

  /* central cooler — sea water against the LT circuit */
  B.shape(292, 386, 22, 34, 'exchanger', { name: 'Central cooler' });
  B.pipeH(287, 315, 16, W);
  B.pipeV(303, 315, 71, W);
  B.pipeV(303, 420, 92, W);

  /* MED unit and overboard */
  B.ro(74, 452, 72, 22, '42 °C', 'G01_MED_IN_TEMP', { bold: true, decimals: 0 });
  B.ro(74, 486, 72, 22, '38 °C', 'G01_MED_OUT_TEMP', { bold: true, decimals: 0 });
  B.text(30, 516, 80, 'MED Unit', { size: 9 });
  B.pipeH(36, 463, 250, W);
  B.pipeH(36, 497, 250, W);
  B.arrow(40, 458, 'left', { color: C.cool });
  B.arrow(40, 492, 'left', { color: C.cool });

  /* fuel oil cooler off the sea water return */
  B.text(304, 546, 40, 'Auto', { size: 9 });
  B.pump(322, 558, 'G01_FO_COOLER_PUMP', { size: 24, running: true });
  B.shape(352, 560, 24, 22, 'exchanger', { name: 'Fuel oil cooler' });
  B.text(340, 588, 70, 'Fuel oil', { size: 8.5 });
  B.pipeV(334, 512, 46, W);
  B.pipeH(346, 570, 6, W);

  /* ================= maintenance water + expansion ================= */
  B.tank(452, 90, 62, 56, 'G01_MAINT_WATER_LEVEL', {
    level: 55, capacity: '6 m³', label: '', plate: '', switches: false, rows: []
  });
  B.text(438, 68, 130, 'Maintenance water\nVBA 901', { size: 8.5, h: 22 });
  B.rect(536, 96, 92, 22, { fill: C.field, stroke: '#5a6068' });
  B.text(538, 102, 88, 'Fresh water', { size: 8.5 });
  B.arrow(522, 102, 'left', { color: C.cool });
  B.pump(472, 152, 'G01_MAINT_WATER_PUMP', { size: 22, running: false });
  B.pipeV(483, 146, 6, W);
  B.pipeV(483, 174, 44, W);

  B.rect(690, 96, 44, 40, { fill: C.equipment, stroke: '#5a6068', radius: 6,
    name: 'Expansion vessel VEA031' });
  B.text(692, 104, 40, 'LT/HT', { size: 8.5, align: 'center' });
  B.led(724, 126, 'G01_EXP_VESSEL_LEVEL', { w: 13, h: 13, fill: '#d7dbdf',
    stroke: '#5a6068' });
  B.text(676, 70, 90, 'Expansion\nvessel', { size: 8.5, h: 22 });
  B.text(676, 140, 90, 'VEA 031', { size: 8.5 });
  B.pipeV(712, 136, 46, WT);
  B.pipeH(560, 182, 152, WT);

  /* ================= engine zone ================= */
  const EZ = { x: 396, y: 182, w: 660, h: 372 };
  B.zone(EZ.x, EZ.y, EZ.w, EZ.h, '', {});
  B.text(956, 202, 94, 'Engine 031', { size: 10, bold: true, align: 'right' });
  B.text(880, 154, 120, 'Engine speed', { size: 9, align: 'right' });
  B.ro(1004, 150, 76, 18, '749 rpm', 'SCA011ST103PV', { size: 9, decimals: 0 });
  B.text(858, 174, 142, 'Gen. active power', { size: 9, align: 'right' });
  B.ro(1004, 170, 76, 18, '7957 kW', 'SCA011PW104PV', { size: 9, decimals: 0 });

  /* ---- HT circuit ---- */
  const HT_Y = 240;
  B.rect(478, 190, 20, 20, { fill: C.field, stroke: '#5a6068', radius: 10 });
  B.text(478, 195, 20, 'TC', { size: 7.5, align: 'center', bold: true });
  B.ro(456, 214, 62, 20, '78 %', 'G01_HT_VALVE_POS', { size: 9, decimals: 0 });
  B.valve(480, 235, 'G01_HT_TC_VALVE');
  B.text(466, 250, 30, 'HT', { size: 9, bold: true });
  B.pipeV(488, 210, 25, W);

  B.pump(694, 230, 'G01_HT_PUMP', { size: 24, running: true, name: 'HT pump' });
  B.text(700, 216, 14, 'T', { size: 8 });
  B.ro(742, 206, 66, 20, '3.8 bar', 'G01_HT_PRESS', { size: 9, decimals: 1 });
  B.ro(742, 228, 66, 20, '90 °C', 'G01_HT_TEMP', { size: 9, decimals: 0 });
  B.pipeH(496, HT_Y, 198, W);
  B.pipeH(718, HT_Y, 24, W);
  B.pipeH(808, HT_Y, 132, W);
  B.arrow(600, HT_Y - 5, 'right', { color: C.cool });

  // preheater keeps a stopped engine warm
  B.zone(478, 286, 190, 78, 'Preheater VDA 031', { labelW: 150, labelSize: 8.5 });
  B.text(486, 316, 40, 'Auto', { size: 9 });
  B.pump(486, 330, 'G01_PREHEATER_PUMP', { size: 22, running: false });
  B.shape(516, 328, 26, 24, 'exchanger', { name: 'Preheater' });
  B.pipeH(508, 341, 8, W);
  B.pipeH(542, 341, 30, W);
  B.pipeV(572, 260, 81, W);

  /* ---- LT circuit ---- */
  const LT_Y = 520;
  B.rect(614, 496, 20, 20, { fill: C.field, stroke: '#5a6068', radius: 10 });
  B.text(614, 501, 20, 'TC', { size: 7.5, align: 'center', bold: true });
  B.ro(568, 498, 62, 20, '25 %', 'G01_LT_VALVE_POS', { size: 9, decimals: 0 });
  B.valve(546, 515, 'G01_LT_TC_VALVE');
  B.text(532, 530, 30, 'LT', { size: 9, bold: true });
  B.ro(458, 490, 66, 20, '82 °C', 'G01_HT_RETURN_TEMP', { size: 9, decimals: 0 });
  B.ro(322, 512, 60, 20, '32 °C', 'G01_LT_SUPPLY_TEMP', { size: 9, decimals: 0 });

  B.pump(694, 512, 'G01_LT_PUMP', { size: 24, running: true, name: 'LT pump' });
  B.text(700, 498, 14, 'T', { size: 8 });
  B.ro(742, 496, 66, 20, '3.9 bar', 'G01_LT_PRESS', { size: 9, decimals: 1 });
  B.ro(742, 518, 66, 20, '46 °C', 'G01_LT_TEMP', { size: 9, decimals: 0 });
  B.text(812, 522, 60, 'Lube oil', { size: 8.5 });
  B.pipeH(382, LT_Y, 164, W);
  B.pipeH(561, LT_Y, 133, W);
  B.pipeH(718, LT_Y, 24, W);
  B.pipeH(808, LT_Y, 132, W);
  B.arrow(640, LT_Y - 5, 'right', { color: C.cool });

  /* ---- coolers and the engine ---- */
  // charge air coolers, two stages per bank, fed HT then LT
  [[352, 'B'], [420, 'A']].forEach(([y, bank]) => {
    B.turbo(770, y - 24, 30, 44, `G01_TC${bank}_SPEED`, { running: true });
    B.shape(826, y - 16, 24, 32, 'exchanger', { name: `Charge air cooler ${bank}1` });
    B.shape(858, y - 16, 24, 32, 'exchanger', { name: `Charge air cooler ${bank}2` });
    B.pipeH(800, y, 26, { color: C.charge, t: 2 });
    B.pipeH(850, y, 8, { color: C.charge, t: 2 });
    B.pipeH(882, y, 34, { color: C.charge, t: 2 });
  });
  B.pipeV(838, 240, 96, W);
  B.pipeV(870, 436, 84, W);

  B.ro(918, 276, 62, 20, '96 °C', 'G01_HT_OUT_B', { size: 9, decimals: 0 });
  B.ro(918, 464, 62, 20, '96 °C', 'G01_HT_OUT_A', { size: 9, decimals: 0 });
  B.ro(672, 442, 62, 20, '74 °C', 'G01_HT_JACKET_TEMP', { size: 9, decimals: 0 });
  B.ro(752, 470, 62, 20, '59 °C', 'G01_LT_RETURN_TEMP', { size: 9, decimals: 0 });
  B.text(988, 280, 14, 'T', { size: 8 });
  B.text(1002, 280, 14, 'T', { size: 8 });

  // engine jackets — the cylinder banks the HT water passes through
  B.rect(916, 302, 128, 156, { fill: 'transparent', stroke: '#8a929b', dashed: true,
    name: 'Engine jackets' });
  [318, 442].forEach(y => {
    [0, 1, 2, 3].forEach(k =>
      B.shape(930 + k * 28, y, 14, 14, 'circle', { fill: C.cool, stroke: '#007a00' }));
  });
  B.pipeH(940, 240, 104, W);
  B.pipeV(1044, 240, 220, W);
  B.pipeH(940, 520, 104, W);

  /* ================= ambient ================= */
  B.rect(396, 578, 176, 44, { fill: '#e6e9ec', stroke: '#8a929b' });
  B.text(404, 586, 110, 'Ambient temperature', { size: 8.5 });
  B.ro(508, 583, 60, 16, '33.3 °C', 'COMMON_AMBIENT_TEMP', { size: 8.5, decimals: 1 });
  B.text(404, 604, 110, 'Absolute humidity', { size: 8.5 });
  B.ro(508, 601, 60, 16, '18.9 g/kg', 'COMMON_ABS_HUMIDITY', { size: 8.5, decimals: 1 });
  B.rect(618, 554, 32, 18, { fill: C.field, stroke: '#5a6068' });
  B.text(620, 559, 28, 'Lim', { size: 8, align: 'center' });

  return {
    screen_id: 'G1.Cooling',
    title: 'G1 — Cooling water',
    unit: 'G1',
    layout: 'canvas',
    canvas: { width: 1100, height: 640, background: C.ground },
    elements: B.elements
  };
}
