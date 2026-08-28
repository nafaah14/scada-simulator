/* =====================================================================
   Common → Start air
   ---------------------------------------------------------------------
   Two independent compressed-air systems: instrument air (TCA 901) into
   a service tank and an instrument tank, and starting air (TSA 901) into
   the receivers that crank the gensets. Air piping is drawn blue, which
   is how the real page separates it from the red fuel lines.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

const AIR = { color: C.air, t: 2 };

export function commonStartAir() {
  const B = builder();

  /* ---------- instrument air unit TCA 901 ---------- */
  B.zone(40, 130, 500, 190, 'Instrument air unit\nTCA 901');
  B.led(52, 186, 'COMMON_TCA901_REMOTE', { w: 12, h: 12 });
  B.text(70, 186, 140, 'Remote permit', { size: 9.5 });
  B.button(52, 208, 76, 20, 'Start');
  B.button(52, 232, 76, 20, 'Stop');

  [[196, 'COMMON_TCA901_C1'], [258, 'COMMON_TCA901_C2']].forEach(([y, tag], i) => {
    B.text(150, y - 6, 12, '▶', { size: 9, color: C.air });
    B.pump(168, y - 14, tag, { size: 28, running: true, color: '#5a6068', fill: C.field,
      name: 'Instrument air compressor ' + (i + 1) });
    B.pipeH(196, y, 44, AIR);
    // aftercooler
    B.rect(240, y - 14, 32, 28, { fill: C.field, stroke: '#5a6068', name: 'Cooler ' + (i + 1) });
    B.line(244, y - 10, 24, 20, { dir: 'bl-tr', color: '#5a6068' });
    B.pipeH(272, y, 40, AIR);
  });
  B.pipeV(312, 196, 62, AIR);
  B.pipeH(312, 196, 60, AIR);
  B.ro(372, 176, 82, 22, '32.5 °C', 'COMMON_TCA901_TEMP',
    { fill: C.red, color: '#fff', bold: true, size: 11 });
  B.pipeH(454, 196, 86, AIR);

  /* ---------- service + instrument tanks ---------- */
  B.text(560, 106, 130, 'Service tank', { size: 10.5, bold: true });
  B.rect(600, 128, 34, 96, { fill: C.equipment, stroke: '#5a6068', radius: 16, bevel: true,
    name: 'Service tank' });
  B.pipeV(617, 196, 0, AIR);
  B.pipeH(540, 196, 60, AIR);
  B.pipeH(634, 150, 60, AIR);
  B.valve(694, 145, 'COMMON_SERVICE_V', { open: true });
  B.pipeH(709, 150, 40, AIR);
  B.text(752, 143, 160, '▶ To consumers', { size: 10.5 });
  B.led(690, 92, 'COMMON_SERVICE_REMOTE', { w: 12, h: 12 });
  B.text(708, 92, 140, 'Remote permit', { size: 9.5 });
  B.button(690, 110, 66, 18, 'Open', { color: '#8a929b' });
  B.button(690, 130, 66, 18, 'Close');

  B.text(552, 236, 150, 'Instrument tank', { size: 10.5, bold: true });
  B.rect(600, 258, 34, 96, { fill: C.equipment, stroke: '#5a6068', radius: 16, bevel: true,
    name: 'Instrument tank' });
  B.pipeH(634, 290, 66, AIR);
  B.ro(700, 278, 82, 22, '7.1 bar', 'COMMON_INSTRUMENT_PRESS', { bold: true, size: 11 });
  B.pipeH(782, 290, 120, AIR);
  B.pipeV(902, 290, 74, AIR);
  B.text(846, 372, 150, '▼ To consumers', { size: 10.5 });

  /* ---------- control panel ---------- */
  B.rect(40, 356, 76, 56, { fill: C.panel, stroke: '#5a6068', name: 'Control panel BLA951' });
  B.text(42, 366, 72, 'Control\nPanel\nBLA 951', { size: 9, align: 'center', h: 44 });

  /* ---------- starting air unit TSA 901 ---------- */
  B.zone(40, 452, 330, 190, 'Starting air unit\nTSA 901');
  B.led(52, 508, 'COMMON_TSA901_REMOTE', { w: 12, h: 12 });
  B.text(70, 508, 140, 'Remote permit', { size: 9.5 });
  B.button(52, 530, 76, 20, 'Start');
  B.button(52, 554, 76, 20, 'Stop');

  [[520, 'COMMON_TSA901_C1'], [580, 'COMMON_TSA901_C2']].forEach(([y, tag], i) => {
    B.text(150, y - 6, 12, '▶', { size: 9, color: C.air });
    B.pump(168, y - 14, tag, { size: 28, running: true, color: '#5a6068', fill: C.field,
      name: 'Starting air compressor ' + (i + 1) });
    B.pipeH(196, y, 60, AIR);
  });
  B.pipeV(256, 520, 60, AIR);
  B.rect(256, 536, 32, 28, { fill: C.field, stroke: '#5a6068', name: 'Starting air cooler' });
  B.line(260, 540, 24, 20, { dir: 'bl-tr', color: '#5a6068' });
  B.pipeH(288, 550, 120, AIR);

  /* ---------- air receivers ---------- */
  B.rect(516, 452, 30, 92, { fill: C.equipmentDark, stroke: '#5a6068', radius: 14, bevel: true,
    name: 'Air receiver 2' });
  B.rect(536, 448, 30, 96, { fill: C.equipment, stroke: '#5a6068', radius: 14, bevel: true,
    name: 'Air receiver 1' });
  B.pipeV(551, 544, 22, AIR);
  B.pipeH(408, 566, 143, AIR);
  B.ro(600, 554, 92, 22, '27.8 bar', 'COMMON_START_AIR_PRESS', { bold: true, size: 11 });
  B.pipeH(692, 566, 210, AIR);

  /* ---------- gensets ---------- */
  const ROW = [120, 218, 316, 414, 512, 610];
  const RAIL_INSTR = 902, RAIL_START = 940, ENG_X = 1120;

  B.pipeV(RAIL_INSTR, ROW[0] + 14, ROW[5] - ROW[0], AIR);
  B.pipeV(RAIL_START, ROW[0] + 14, ROW[5] - ROW[0], AIR);

  const UNITS = [
    { n: 1, a: '27.6 bar', b: '27.6 bar', state: 'running' },
    { n: 2, a: '27.6 bar', b: '27.6 bar', state: 'running' },
    { n: 3, a: '27.7 bar', b: '27.6 bar', state: 'running' },
    { n: 4, a: '0.0 bar', b: '0.2 bar', state: 'stopped' },
    { n: 5, a: '27.5 bar', b: '27.6 bar', state: 'running' },
    { n: 6, a: '27.6 bar', b: '27.6 bar', state: 'running' }
  ];

  UNITS.forEach(u => {
    const y = ROW[u.n - 1], p = 'G0' + u.n;
    B.ro(950, y - 34, 88, 22, u.a, `${p}_START_AIR_PRESS_A`, { bold: true });
    B.ro(950, y - 8, 88, 22, u.b, `${p}_START_AIR_PRESS_B`, { bold: true });

    B.pipeH(RAIL_INSTR, y - 24, 48, AIR);
    B.pipeH(RAIL_START, y + 4, 10, AIR);
    B.pipeH(1038, y - 24, ENG_X - 1038, AIR);
    B.pipeH(1038, y + 4, ENG_X - 1038, AIR);

    B.engine(ENG_X, y - 30, 150, 56, `${p}_STATE`,
      { state: u.state, text: String(u.n), name: 'Genset ' + u.n });
  });

  return {
    screen_id: 'Common.StartAir',
    title: 'Common — Start air',
    unit: 'COMMON',
    layout: 'canvas',
    canvas: { width: 1340, height: 680, background: C.ground },
    elements: B.elements
  };
}
