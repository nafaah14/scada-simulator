/* =====================================================================
   G1 → Fuel
   ---------------------------------------------------------------------
   Engine fuel booster module PCA011: the day-tank feeder unit supplies a
   mixing tank, a circulation loop holds the engine inlet at temperature,
   and clean/dirty leak drains return to storage or oily-water treatment.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

export function g1Fuel() {
  const B = builder();
  const SPINE = 300;                     // main fuel line height

  /* ---------- header readouts ---------- */
  B.text(1090, 34, 130, 'Engine speed', { size: 10.5, align: 'right' });
  B.ro(1230, 30, 86, 20, '748 rpm', 'SCA011ST103PV', { align: 'right', bold: true });
  B.text(1040, 58, 180, 'Gen. active power', { size: 10.5, align: 'right' });
  B.ro(1230, 54, 86, 20, '7833 kW', 'SCA011PW104PV', { align: 'right', bold: true });

  /* ---------- feeder unit PCA901 ---------- */
  B.zone(40, 210, 300, 190, 'Feeder unit\nPCA901');
  B.outArrow(6, 262, 130, 'Day Tank Area', { size: 9.5 });
  B.pipeH(0, SPINE - 40, 60);
  B.pipeH(0, SPINE + 20, 60);

  [[SPINE - 40, 'COMMON_PCA901_P1', true], [SPINE + 20, 'COMMON_PCA901_P2', false]]
    .forEach(([y, tag, running], i) => {
      B.led(64, y - 22, `${tag}_MODE`, { w: 10, h: 10, fill: '#e9ecef', stroke: '#5a6068' });
      B.valve(60, y - 5, `${tag}_V`);
      B.pipeH(75, y, 18);
      B.text(88, y - 26, 34, 'Auto', { size: 9 });
      B.pump(93, y - 10, tag, { size: 20, running, name: 'Feeder pump ' + (i + 1) });
      B.text(115, y + 6, 10, String(i + 1), { size: 8.5 });
      B.pipeH(113, y, 22);
      B.ro(135, y - 10, 62, 20, '4.6 bar', 'PCA901_PRESS', { align: 'right' });
      B.pipeH(197, y, 40);
    });
  B.ro(120, 226, 60, 20, '49 %', 'COMMON_PCA901_SPEED_PCT', { bold: true });

  // the two branches merge and leave the feeder unit
  B.pipeV(237, SPINE - 40, 60);
  B.pipeH(237, SPINE, 60);
  B.ro(268, SPINE - 34, 62, 20, '4.6 bar', 'PCA901_PRESS', { align: 'right' });

  /* ---------- booster module PCA011 ---------- */
  B.zone(360, 100, 900, 480, 'Engine fuel booster module PCA011');
  B.pipeH(297, SPINE, 100);

  // strainer + filter on the inlet
  B.rect(400, SPINE - 8, 16, 16, { fill: C.field, stroke: '#5a6068', name: 'Strainer' });
  B.pipeH(416, SPINE, 34);

  /* mixing tank */
  B.rect(452, 190, 92, 220, { fill: C.equipment, stroke: '#5a6068', bevel: true,
    name: 'Mixing tank' });
  B.rect(456, 300, 84, 106, { fill: '#7d858e', stroke: '#5a6068' });
  B.text(456, 198, 84, 'Mixing tank', { size: 9.5, align: 'center', color: '#f2f4f6' });
  B.text(456, 392, 84, 'LFO', { size: 9, align: 'center', color: '#f2f4f6' });
  B.ro(462, 156, 72, 20, '4.0 bar', 'G01_MIXTANK_PRESS', { bold: true, decimals: 1 });
  B.led(534, 358, 'G01_MIXTANK_LEVEL', { w: 14, h: 14, fill: '#e9ecef', stroke: '#5a6068' });
  B.ro(430, 430, 100, 20, '1513.0 kg/h', 'G01_MIXTANK_FLOW', { bold: true });
  B.ro(430, 452, 100, 20, '31.6 °C', 'G01_MIXTANK_TEMP', { bold: true, decimals: 1 });
  B.button(430, 486, 100, 30, 'Shift+F\nFuel data');
  B.pipeV(490, 410, 20);

  /* circulation pumps + loop */
  B.pipeH(544, SPINE, 60);
  B.zone(600, 232, 74, 140, '', { stroke: '#8a929b' });
  B.text(608, 218, 60, 'Auto', { size: 9 });
  B.pump(618, 240, 'G01_CIRC_PUMP2', { size: 24, running: false, name: 'Circ pump 2' });
  B.text(642, 250, 10, '2', { size: 8.5 });
  B.pump(618, 320, 'G01_CIRC_PUMP1', { size: 24, running: true, name: 'Circ pump 1' });
  B.text(642, 330, 10, '1', { size: 8.5 });
  B.pipeV(630, 264, 56);
  B.valve(604, 276, 'G01_CIRC_V1', { open: true });
  B.valve(652, 276, 'G01_CIRC_V2', { open: true });
  B.ro(596, 388, 74, 20, '42 °C', 'G01_CIRC_TEMP', { bold: true, decimals: 0 });
  // return leg back into the mixing tank base
  B.pipeV(630, 344, 76);
  B.pipeH(490, 420, 140);

  /* control panel + engine inlet */
  B.pipeH(674, SPINE, 96);
  B.rect(880, 150, 78, 56, { fill: C.panel, stroke: '#5a6068', name: 'Control panel BJA011' });
  B.text(882, 160, 74, 'Control\nPanel\nBJA 011', { size: 9, align: 'center', h: 44 });
  B.ro(800, 160, 66, 20, '36 °C', 'G01_CTRLPANEL_TEMP', { bold: true, decimals: 0 });
  B.pump(760, SPINE - 14, 'G01_INLET_PRESS_SENSOR',
    { size: 28, running: true, color: '#5a6068', fill: C.field });
  B.text(760, SPINE - 6, 28, 'P', { size: 10, align: 'center', bold: true });
  B.pipeV(774, 206, 80);
  B.pipeH(788, SPINE, 62);

  /* 4-way mixing valve */
  B.rect(852, SPINE - 22, 44, 44, { fill: C.field, stroke: '#5a6068', name: 'Mixing valve' });
  B.rect(862, SPINE - 12, 24, 24, { fill: '#3f8fce', stroke: '#2c6ea0' });
  B.pipeH(896, SPINE, 54);

  B.ro(956, SPINE - 34, 66, 20, '40 °C', 'G01_ENGINE_INLET_TEMP', { bold: true, decimals: 0 });
  B.ro(956, SPINE - 10, 66, 20, '8.8 bar', 'G01_ENGINE_INLET_PRESS', { bold: true, decimals: 1 });
  B.pipeH(1022, SPINE, 40);
  B.engine(1062, SPINE - 34, 150, 68, 'G01_RUNNING', { running: true, name: 'Genset 1' });
  B.led(1078, SPINE + 38, 'G01_MOUNT_L1', { w: 14, h: 14, fill: '#e9ecef', stroke: '#5a6068' });
  B.led(1186, SPINE + 38, 'G01_MOUNT_L2', { w: 14, h: 14, fill: '#e9ecef', stroke: '#5a6068' });

  /* ---------- LT loop ---------- */
  B.pipeV(774, SPINE + 14, 150);
  B.rect(766, 400, 16, 16, { fill: C.field, stroke: '#5a6068', name: 'LT strainer' });
  B.text(700, 432, 40, 'Auto', { size: 9 });
  B.button(700, 448, 54, 18, 'Start');
  B.button(700, 468, 54, 18, 'Stop');
  B.pump(762, 446, 'G01_LT_PUMP', { size: 24, running: true, name: 'LT pump' });
  B.text(760, 480, 30, 'LT', { size: 9.5, align: 'center' });
  B.ro(806, 440, 66, 20, '749', 'G01_LT_COUNT', { decimals: 0 });
  B.pipeV(774, 470, 90);

  /* ---------- leak tanks ----------
     Both drains run below the tanks so the outgoing headers don't cut
     through the vessels they collect from. */
  // dirty leak — drains from the circulation loop
  B.rect(560, 486, 92, 52, { fill: C.equipment, stroke: '#5a6068', bevel: true,
    name: 'Dirty leak tank' });
  B.text(562, 498, 88, 'Dirty leak\ntank', { size: 9, align: 'center', color: '#f2f4f6', h: 24 });
  B.led(646, 492, 'G01_DIRTYLEAK_LEVEL', { w: 14, h: 14, fill: '#e9ecef', stroke: '#5a6068' });
  B.ro(560, 458, 60, 20, '37 °C', 'G01_DIRTYLEAK_TEMP', { decimals: 0 });
  B.pipeV(606, 420, 66);
  B.pipeV(606, 538, 30);
  B.text(516, 548, 40, 'Auto', { size: 9 });
  B.pump(536, 558, 'G01_DIRTY_PUMP', { size: 22, running: false });
  B.pipeH(558, 568, 48);
  B.pipeH(150, 568, 386);
  B.outArrow(20, 562, 200, 'To oily water treatment');

  // clean leak — drains from the LT loop
  B.rect(830, 486, 92, 52, { fill: C.equipment, stroke: '#5a6068', bevel: true,
    name: 'Clean leak tank' });
  B.text(832, 498, 88, 'Clean leak\ntank', { size: 9, align: 'center', color: '#f2f4f6', h: 24 });
  B.led(916, 492, 'G01_CLEANLEAK_LEVEL', { w: 14, h: 14, fill: '#e9ecef', stroke: '#5a6068' });
  B.ro(940, 486, 88, 20, '13 ltr/h', 'G01_CLEANLEAK_FLOW', { decimals: 0 });
  B.text(786, 578, 40, 'Auto', { size: 9 });
  B.pump(806, 588, 'G01_CLEAN_PUMP', { size: 22, running: true });
  B.pipeV(876, 538, 60);
  B.pipeH(828, 598, 48);

  // return to storage
  B.pipeH(150, 598, 656);
  B.outArrow(20, 592, 200, 'Return to storage tank');

  return {
    screen_id: 'G1.Fuel',
    title: 'G1 — Fuel',
    unit: 'G1',
    layout: 'canvas',
    canvas: { width: 1360, height: 640, background: C.ground },
    elements: B.elements
  };
}
