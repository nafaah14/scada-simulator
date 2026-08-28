/* =====================================================================
   Common → Cooling
   ---------------------------------------------------------------------
   The plant seawater circuit. Flow reads left to right:

     sea ─▶ intake chambers (band screens) ─▶ suction header
       ─▶ four seawater pumps ─▶ discharge riser ─▶ supply header
       ─▶ main power house, one LT cooler per engine (VHA 011…061)
       ─▶ outlet header ─▶ overboard
     with the return header running back along the bottom, feeding the
     two MED distillation units on its way.

   Each pump bay is one table row: motor and bearing temperatures, its
   three permissives, start/stop, auto/manual, current, pressure, speed.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

const P = { color: C.cool, t: 5 };          // seawater piping
const INK = '#1d242b';

const SUCT_X = 392;      // pump suction header
const DISCH_X = 1000;    // pump discharge riser
const SUPPLY_Y = 244;    // supply header across to the power house
const RETURN_Y = 975;    // return header back along the bottom
const PH_IN_X = 1360;    // power house inlet header
const PH_OUT_X = 1650;   // power house outlet header

/* A source/destination flag: labelled box with a pointed end. */
function flag(B, x, y, w, label, dir = 'right') {
  B.rect(x, y, w, 26, { fill: '#eceff1', stroke: INK });
  B.text(x + 5, y + 5, w - 10, label, { size: 9, h: 18 });
  B.shape(dir === 'right' ? x + w : x - 16, y, 16, 26,
    dir === 'right' ? 'triangle-right' : 'triangle-left',
    { fill: '#eceff1', stroke: INK });
}

/* One seawater pump: the parameter bay, then its row on the header.
   The bay box encloses everything for that pump, the way the real page
   groups them, so BAY_PITCH is the only spacing number to tune. */
const BAY_PITCH = 226;

function pumpBay(B, o) {
  const { top, n, motor, bearing, running, standby, amps, bar, pct, lamps } = o;
  const tag = `COMMON_SWP${n}`;
  const pumpY = top + 160;

  B.zone(408, top, 368, 214, `Seawater pump ${n}`, { labelW: 160 });

  // motor winding temperatures (left) and bearing temperatures (right)
  motor.forEach((v, i) =>
    B.ro(418, top + 20 + i * 24, 78, 22, v + ' °C', `${tag}_T${i + 1}`,
      { decimals: 0, unit: '°C', fill: '#eceff1' }));
  bearing.forEach((v, i) =>
    B.ro(676, top + 20 + i * 24, 78, 22, v + ' °C', `${tag}_B${i + 1}`,
      { decimals: 0, unit: '°C', fill: '#eceff1' }));

  // permissives, then the commands they gate
  ['Rack in', 'Control power', 'Remote permit'].forEach((label, i) => {
    B.led(506, top + 22 + i * 18, `${tag}_${['RACK_IN', 'CTRL_POWER', 'PERMIT'][i]}`, {
      w: 11, h: 11, shape: 'square', fill: C.cool, offColor: '#b6bdc4', stroke: '#3d4349'
    });
    B.text(524, top + 21 + i * 18, 130, label, { size: 8.5 });
  });
  B.button(504, top + 82, 62, 20, 'Start', { disabled: running, size: 9 });
  B.button(504, top + 104, 62, 20, 'Stop', { disabled: !running, size: 9 });

  // remote control column, outside the bay
  B.led(790, top + 60, `${tag}_REMOTE`, { w: 11, h: 11, shape: 'square',
    fill: C.cool, offColor: '#b6bdc4', stroke: '#3d4349' });
  B.text(808, top + 59, 120, 'Remote permit', { size: 8.5 });
  B.button(786, top + 80, 62, 20, 'Auto', { disabled: true, size: 9 });
  B.button(786, top + 102, 62, 20, 'Manual', { size: 9 });

  // the pump itself, on the run between suction header and riser
  B.pipeH(SUCT_X, pumpY, DISCH_X - SUCT_X, P);
  B.valve(414, pumpY - 6, `${tag}_SUCT_VALVE`, { fill: C.cool });
  B.pump(548, pumpY - 14, `${tag}_RUNNING`, {
    size: 28, running, color: running ? C.cool : '#8a929b', name: `Seawater pump ${n}` });
  if (!running) B.text(524, pumpY + 8, 20, '0', { size: 8.5, align: 'right' });
  if (lamps) B.text(584, pumpY - 18, 70, 'Standby', { size: 9, bold: true });
  B.valve(760, pumpY - 6, `${tag}_DISCH_VALVE`, { fill: running ? C.cool : '#8a929b' });

  B.button(414, pumpY + 22, 66, 22, 'Standby', { disabled: !standby, size: 9 });
  B.ro(490, pumpY + 22, 92, 22, amps + ' A', `${tag}_CURRENT`,
    { bold: true, decimals: 0, unit: 'A', fill: '#eceff1' });
  // a pump that is not delivering shows its low discharge pressure in red
  B.ro(676, pumpY + 22, 86, 22, bar + ' bar', `${tag}_PRESSURE`,
    { bold: true, decimals: 1, unit: 'bar', fill: running ? '#eceff1' : C.red,
      color: running ? '#111820' : '#ffffff' });
  B.ro(786, pumpY + 22, 62, 22, pct + ' %', `${tag}_SPEED`,
    { decimals: 0, unit: '%', fill: '#eceff1' });
}

/* One engine's LT cooling module inside the power house. */
function vhaModule(B, top, plate, alarm) {
  const cx = 1440;
  B.zone(1382, top, 240, 138, plate, { labelW: 90, labelSize: 9 });

  // driver, pump casing and its two instrument bubbles
  B.bubble(cx - 13, top + 16, 26, 'M', { tag: `COMMON_${plate.replace(' ', '')}_MOTOR`,
    onState: 'active', size: 11, name: plate + ' motor' });
  B.pipeV(cx, top + 42, 8, { color: INK, t: 2 });
  B.shape(cx - 22, top + 50, 40, 42, 'volute', { fill: '#c9ced3', stroke: INK,
    name: plate + ' pump' });
  B.bubble(cx + 2, top + 50, 20, 'P', { size: 9 });
  B.bubble(cx + 2, top + 70, 20, 'S', {
    tag: `COMMON_${plate.replace(' ', '')}_ALARM`, state: alarm ? 'alarm' : 'normal',
    size: 9, name: plate + ' pump alarm' });
  B.shape(cx - 20, top + 96, 16, 14, 'triangle-down', { fill: '#eceff1', stroke: INK });

  // suction from the inlet header, through the two isolating valves
  B.pipeH(PH_IN_X, top + 70, cx - 22 - PH_IN_X, P);
  B.valve(1392, top + 64, '', { fill: C.cool });
  B.valve(1414, top + 64, '', { fill: C.cool });

  // discharge into the LT cooler and out to the outlet header
  B.pipeH(cx + 18, top + 70, 62, P);
  B.valve(1500, top + 64, '', { fill: C.cool });
  B.shape(1522, top + 50, 38, 42, 'exchanger', { fill: '#c9ced3', stroke: INK,
    name: plate + ' LT cooler' });
  B.pipeH(1560, top + 70, PH_OUT_X - 1560, P);
  // LT side leaving the cooler towards the engine
  [0, 1, 2].forEach(i =>
    B.arrow(1526 + i * 12, top + 94, 'down', { color: C.cool, w: 10, h: 12 }));
  B.text(1518, top + 108, 46, 'LT', { size: 9, bold: true, align: 'center' });
}

/* Remote-permit + Open/Close command block on an outlet valve. */
function valveCmd(B, x, y, tag, label) {
  B.led(x, y, `${tag}_PERMIT`, { w: 12, h: 12, shape: 'square',
    fill: C.cool, offColor: '#b6bdc4', stroke: '#3d4349' });
  B.text(x + 20, y - 1, 96, label || 'Remote permit', { size: 9 });
  B.button(x - 10, y + 20, 66, 24, 'Open', { disabled: true });
  B.button(x - 10, y + 46, 66, 24, 'Close');
}

export function commonCooling() {
  const B = builder();

  /* ================= seawater intake ================= */
  [62, 200, 552].forEach((y, i) => {
    flag(B, 20, y, 92, 'Seawater');
    B.rect(128, y + 2, 18, 22, { fill: '#2f7f8a', stroke: INK,
      name: `Intake gate ${i + 1}` });
    B.pipeH(146, y + 13, 10, { color: INK, t: 3 });
  });

  // the first intake also feeds the reserved bay for the future extension
  B.pipeV(156, 40, 35, P);
  B.pipeH(156, 40, 40, P);
  flag(B, 196, 27, 92, 'Future\nextension');

  B.rect(156, 100, 200, 640, { fill: 'transparent', stroke: INK, strokeWidth: 1,
    name: 'Seawater intake basin' });
  B.pipeH(156, 420, 200, { color: INK, t: 1 });
  B.shape(198, 412, 18, 16, 'triangle-down', { fill: 'transparent', stroke: INK });

  [100, 420].forEach((cTop, c) => {
    B.ro(166, cTop + 18, 84, 26, '3.0 m', `COMMON_SW_BASIN${c + 1}_LEVEL`,
      { bold: true, decimals: 1, unit: 'm', fill: '#eceff1' });
    B.ro(256, cTop + 18, 84, 26, '4.1 m', `COMMON_SW_BASIN${c + 1}_DEPTH`,
      { bold: true, decimals: 1, unit: 'm', fill: '#eceff1' });
    B.bubble(240, cTop + 62, 24, 'S', { tag: `COMMON_SW_BASIN${c + 1}_ALARM`,
      name: `Basin ${c + 1} level switch` });
    B.shape(240, cTop + 100, 24, 66, 'filter', { fill: '#c9ced3', stroke: INK,
      name: `Band screen ${c + 1}` });
  });
  B.shape(240, 640, 24, 66, 'filter', { fill: '#c9ced3', stroke: INK,
    name: 'Band screen 3' });

  // basin ─▶ pump suction header
  [260, 640].forEach(y => {
    B.pipeH(356, y, SUCT_X - 356, P);
    B.arrow(360, y - 6, 'right', { color: C.cool, w: 12, h: 12 });
  });
  B.pipeV(SUCT_X, 260, 656, P);

  /* ================= seawater pumps ================= */
  B.zone(400, 40, 470, 920, 'Seawater pumps', { labelW: 0 });

  const PUMPS = [
    { n: 4, motor: [89, 87, 89, 52, 59], bearing: [86, 89, 88, 59, 55],
      running: true, standby: true, amps: 245, bar: 3.4, pct: 100 },
    { n: 3, motor: [32, 32, 32, 32, 32], bearing: [39, 32, 32, 32, 41],
      running: false, standby: true, amps: 0, bar: 0.3, pct: 0 },
    { n: 2, motor: [93, 91, 91, 45, 59], bearing: [91, 91, 92, 50, 52],
      running: true, standby: true, amps: 244, bar: 3.5, pct: 100 },
    { n: 1, motor: [32, 35, 32, 32, 32], bearing: [32, 32, 32, 32, 34],
      running: false, standby: false, amps: 0, bar: 0.3, pct: 100, lamps: true }
  ];
  PUMPS.forEach((p, i) => pumpBay(B, { ...p, top: 48 + i * BAY_PITCH }));

  /* ================= discharge riser and supply header ================= */
  B.pipeV(DISCH_X, SUPPLY_Y, 916 - SUPPLY_Y, P);
  B.pipeH(DISCH_X, SUPPLY_Y, PH_IN_X - DISCH_X, P);
  B.ro(1120, SUPPLY_Y - 72, 96, 26, '2.9 bar', 'COMMON_SW_HEADER_PRESSURE',
    { bold: true, decimals: 1, unit: 'bar', fill: '#eceff1' });
  B.ro(1120, SUPPLY_Y - 44, 96, 26, '29 °C', 'COMMON_SW_HEADER_TEMP',
    { bold: true, decimals: 0, unit: '°C', fill: '#eceff1' });

  // top cross-connection: booster set on the header out of the pump house
  B.pipeV(1072, 52, SUPPLY_Y - 52, P);
  B.pipeH(940, 52, 132, P);
  B.valve(946, 46, '', { fill: C.cool });
  B.pump(986, 39, 'COMMON_SW_BOOSTER1_RUNNING', { size: 26, color: C.cool,
    name: 'Seawater booster 1' });
  B.valve(1046, 46, '', { fill: C.cool });

  /* ================= main power house ================= */
  B.zone(1370, 36, 262, 930, 'Main power house', { labelW: 160 });
  B.pipeV(PH_IN_X, SUPPLY_Y, 700, P);
  B.pipeV(PH_OUT_X, 106, 820, P);

  ['VHA 011', 'VHA 021', 'VHA 031', 'VHA 041', 'VHA 051', 'VHA 061']
    .forEach((plate, i) => vhaModule(B, 60 + i * 150, plate, plate === 'VHA 041'));

  /* ================= outlet and overboard ================= */
  B.shape(1638, 520, 24, 20, 'triangle-down', { fill: C.cool, stroke: INK });
  B.shape(1638, 540, 24, 20, 'triangle-up', { fill: C.cool, stroke: INK });
  valveCmd(B, 1686, 522, 'COMMON_SW_OUTLET1');

  B.shape(1638, 890, 24, 20, 'triangle-down', { fill: C.cool, stroke: INK });
  B.shape(1638, 910, 24, 20, 'triangle-up', { fill: C.cool, stroke: INK });
  valveCmd(B, 1686, 892, 'COMMON_SW_OUTLET2');

  B.pipeH(PH_OUT_X, 540, 150, P);
  B.shape(1790, 530, 22, 20, 'triangle-down', { fill: C.cool, stroke: INK });
  B.shape(1790, 550, 22, 20, 'triangle-up', { fill: C.cool, stroke: INK });
  B.button(1840, 556, 66, 24, 'Open', { disabled: true });
  B.button(1840, 582, 66, 24, 'Close');
  B.led(1832, 530, 'COMMON_SW_OVERBOARD_PERMIT', { w: 12, h: 12, shape: 'square',
    fill: C.cool, offColor: '#b6bdc4', stroke: '#3d4349' });
  B.pipeV(1800, 570, RETURN_Y - 570, P);
  B.ro(1790, RETURN_Y + 12, 92, 26, '38 °C', 'COMMON_SW_OVERBOARD_TEMP',
    { bold: true, decimals: 0, unit: '°C', fill: '#eceff1' });

  /* ================= return header ================= */
  B.pipeH(112, RETURN_Y, 1688, P);
  B.pipeV(PH_OUT_X, 926, RETURN_Y - 926, P);
  B.valve(946, RETURN_Y - 6, '', { fill: C.cool });
  B.pump(986, RETURN_Y - 13, 'COMMON_SW_BOOSTER2_RUNNING', { size: 26, color: C.cool,
    name: 'Seawater booster 2' });
  B.valve(1046, RETURN_Y - 6, '', { fill: C.cool });
  B.arrow(1240, RETURN_Y - 6, 'left', { color: C.cool, w: 12, h: 12 });
  B.ro(1300, RETURN_Y - 13, 96, 26, '44 °C', 'COMMON_SW_RETURN_TEMP',
    { bold: true, decimals: 0, unit: '°C', fill: C.red, color: '#ffffff' });

  /* ================= MED distillation units ================= */
  [['MED unit 1', 'CFA 951', 754], ['MED unit 2', 'CFA 952', 856]].forEach(
    ([label, plate, top]) => {
      B.zone(150, top, 216, 96, label, { labelW: 120 });
      B.ro(298, top + 4, 62, 20, plate, '', { size: 9, bold: true, fill: '#c9ced3' });
      B.text(160, top + 36, 100, 'Unit running', { size: 9.5, bold: true });
      B.rect(266, top + 30, 44, 22, { fill: '#ffffff', stroke: '#5a6068' });
      B.text(160, top + 68, 100, 'Unit stopped', { size: 9.5, bold: true });
      B.led(266, top + 62, `COMMON_${plate.replace(' ', '')}_STOPPED`, {
        w: 44, h: 22, shape: 'square', fill: C.cool, offColor: '#b6bdc4',
        stroke: '#3d4349', name: plate + ' stopped' });
      B.pipeH(112, top + 44, 38, P);
      B.pipeH(366, top + 44, 14, P);
      B.arrow(116, top + 38, 'right', { color: C.cool, w: 11, h: 11 });
    });
  // MED feed taps the basin and drops past both units
  B.pipeH(112, 700, 44, P);
  B.pipeV(112, 700, 202, P);
  B.pipeV(380, 798, RETURN_Y - 798, P);
  flag(B, 60, RETURN_Y + 26, 108, 'Seawater outfall', 'left');
  B.pipeV(188, RETURN_Y, 39, P);
  B.pipeH(168, RETURN_Y + 39, 20, P);

  return {
    screen_id: 'Common.Cooling',
    title: 'Common — Cooling (seawater)',
    unit: 'COMMON',
    layout: 'canvas',
    canvas: { width: 1920, height: 1040, background: C.ground },
    elements: B.elements
  };
}
