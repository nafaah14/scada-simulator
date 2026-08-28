/* =====================================================================
   Common → Overview
   ---------------------------------------------------------------------
   Plant-wide flow: six LFO day tanks feed a duplex feeder unit, which
   feeds six booster units, one per genset, into the electrical
   single-line. Laid out left→right the way the real WOIS page reads.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

export function commonOverview() {
  const B = builder();

  /* ---------- zone dividers ---------- */
  const ZY = 60, ZH = 560;
  [[20, 300, 'Fuel oil system'], [330, 130, 'Feeder system'],
   [470, 230, 'Booster system'], [710, 660, 'Electrical system']]
    .forEach(([x, w, label]) => {
      B.text(x + 6, 40, w, label.toUpperCase(),
        { size: 10, bold: true, color: '#4a545e' });
      B.line(x + w + 6, ZY, 0, ZH, { dir: 'v', color: '#9aa2ab', dash: 4 });
    });

  /* ---------- fuel oil system: 6 day tanks ---------- */
  const TANKS = [
    ['PBF 901', 78.4, [30, 30, 0], 'PBF901_LEVEL', true],
    ['PBF 904', 73.4, [30, 30, 30], 'PBF904_LEVEL', false],
    ['PBF 902', 80.1, [30, 30, 30], 'PBF902_LEVEL', false],
    ['PBF 905', 66.5, [31, 30, 30], 'PBF905_LEVEL', false],
    ['PBF 903', 75.2, [30, 30, 30], 'PBF903_LEVEL', false],
    ['PBF 906', 66.4, [30, 30, 30], 'PBF906_LEVEL', false]
  ];
  const TW = 92, TH = 108, COL = [30, 176], ROWY = [80, 250, 420];
  const HEADER_X = 300;

  TANKS.forEach((t, i) => {
    const [label, pct, temps, tag] = t;
    const col = i % 2, row = Math.floor(i / 2);
    const x = COL[col], y = ROWY[row];

    // vessel body with the roof, plus the red level column on its right
    B.tank(x, y, TW, TH, tag, { level: pct, fill: '#e9ecef', name: label });
    B.ro(x + 4, y + 26, 56, 16, pct.toFixed(1) + ' %', tag, { size: 10, bold: true });
    temps.forEach((tv, k) => {
      B.ro(x + 4, y + 44 + k * 17, 56, 15, tv + ' °C',
        `COMMON_${label.replace(' ', '')}_T${k + 1}`,
        { size: 9.5, decimals: 0 });
    });
    B.text(x + 4, y + 96, 56, '25 m³', { size: 8.5, color: '#39414a' });
    B.led(x + TW - 12, y + 22, `COMMON_${label.replace(' ', '')}_LSW`,
      { w: 11, h: 11, fill: '#e9ecef', stroke: '#5a6068' });
    B.text(x, y + TH + 2, TW, 'LFO day tank', { size: 8.5, align: 'center' });
    B.text(x, y + TH + 12, TW, label, { size: 8.5, align: 'center' });

    // tank outlet → header
    const cy = y + TH / 2;
    if (col === 0) {
      B.pipeH(x + TW, cy, COL[1] - (x + TW));
      B.valve(x + TW + 22, cy - 5, `COMMON_${label.replace(' ', '')}_V`, { open: row !== 0 });
    } else {
      B.pipeH(x + TW, cy, HEADER_X - (x + TW));
      B.valve(x + TW + 24, cy - 5, `COMMON_${label.replace(' ', '')}_V`);
    }
  });
  // vertical header collecting all three rows
  B.pipeV(HEADER_X, ROWY[0] + TH / 2, (ROWY[2] + TH / 2) - (ROWY[0] + TH / 2));

  /* ---------- feeder system: duplex pump ---------- */
  const FEED_Y = 300;
  B.pipeH(HEADER_X, FEED_Y, 60);
  B.pump(360, FEED_Y - 22, 'COMMON_FEEDER_P1', { size: 20, running: true, name: 'Feeder pump 1' });
  B.pump(360, FEED_Y + 2, 'COMMON_FEEDER_P2', { size: 20, running: false, name: 'Feeder pump 2' });
  B.pipeV(370, FEED_Y - 12, 24);
  B.pipeH(380, FEED_Y, 90);

  /* ---------- booster system + electrical, one row per genset ---------- */
  const ROW = [90, 175, 260, 345, 430, 515];
  const BOOST_X = 470, ENG_X = 730;
  B.pipeV(BOOST_X, ROW[0], ROW[5] - ROW[0]);

  const UNITS = [
    { n: 1, flow: '1555 kg/h', kw: '7887 kW', kvar: '335 kVAr', run: true },
    { n: 2, flow: '1567 kg/h', kw: '7883 kW', kvar: '299 kVAr', run: true },
    { n: 3, flow: '1468 kg/h', kw: '7890 kW', kvar: '323 kVAr', run: true },
    { n: 4, flow: '0 kg/h', kw: '0 kW', kvar: '0 kVAr', run: false },
    { n: 5, flow: '1594 kg/h', kw: '7894 kW', kvar: '307 kVAr', run: true },
    { n: 6, flow: '1545 kg/h', kw: '7875 kW', kvar: '315 kVAr', run: true }
  ];

  UNITS.forEach(u => {
    const y = ROW[u.n - 1];
    const p = 'G0' + u.n;

    /* booster branch: valve → duplex pump → flow */
    B.pipeH(BOOST_X, y, 16);
    B.valve(BOOST_X + 16, y - 5, `${p}_BOOSTER_V`, { open: u.run });
    B.pipeH(BOOST_X + 31, y, 8);
    B.pump(BOOST_X + 39, y - 24, `${p}_BOOSTER_P1`, { size: 17, running: u.run });
    B.pump(BOOST_X + 39, y + 7, `${p}_BOOSTER_P2`, { size: 17, running: false });
    B.pipeV(BOOST_X + 47.5, y - 7, 14);
    B.pipeH(BOOST_X + 56, y, 10);
    B.ro(BOOST_X + 66, y - 10, 72, 20, u.flow, `${p}_BOOSTER_FLOW`, { align: 'right' });
    B.pipeH(BOOST_X + 138, y, ENG_X - (BOOST_X + 138));

    /* genset + breaker + measurements */
    B.engine(ENG_X, y - 15, 96, 30, `${p}_RUNNING`,
      { running: u.run, text: String(u.n), size: 12, name: 'Genset ' + u.n });
    B.pipeH(ENG_X + 96, y, 18, { color: '#5a6068', t: 2 });
    B.breaker(ENG_X + 114, y - 7, `${p}_BREAKER`, { closed: u.run });
    B.pipeH(ENG_X + 128, y, 16, { color: '#5a6068', t: 2 });
    B.ro(ENG_X + 144, y - 10, 74, 20, u.kw, `${p}_KW`, { align: 'right' });
    B.ro(ENG_X + 222, y - 10, 74, 20, u.kvar, `${p}_KVAR`, { align: 'right' });
    B.ro(ENG_X + 300, y - 10, 80, 20, '1.00', `${p}_PF`,
      { align: 'right', unit: 'cos phi', decimals: 2 });
  });

  /* ---------- busbars ---------- */
  const BUS_X = ENG_X + 400;
  B.pipeV(BUS_X, ROW[0] - 14, (ROW[2] + 14) - (ROW[0] - 14), { color: '#5a6068', t: 3 });
  B.pipeV(BUS_X, ROW[3] - 14, (ROW[5] + 14) - (ROW[3] - 14), { color: '#5a6068', t: 3 });
  [0, 1, 2, 3, 4, 5].forEach(i => B.pipeH(ENG_X + 380, ROW[i], BUS_X - (ENG_X + 380),
    { color: '#5a6068', t: 2 }));
  B.text(BUS_X + 10, ROW[0] - 6, 90, 'Busbar 1', { size: 10.5, color: '#39414a' });
  B.text(BUS_X + 10, ROW[3] - 6, 90, 'Busbar 2', { size: 10.5, color: '#39414a' });

  // bus tie between the two busbars
  const tieY = (ROW[2] + ROW[3]) / 2;
  B.pipeV(BUS_X, ROW[2] + 14, tieY - 7 - (ROW[2] + 14), { color: '#5a6068', t: 3 });
  B.breaker(BUS_X - 7, tieY - 7, 'COMMON_BUSTIE', { closed: true, name: 'Bus tie' });
  B.pipeV(BUS_X, tieY + 7, (ROW[3] - 14) - (tieY + 7), { color: '#5a6068', t: 3 });

  /* ---------- plant totals + maintenance ---------- */
  B.button(482, 560, 96, 24, 'Maintenance');
  B.ro(ENG_X + 4, 566, 92, 22, '39.5 MW', 'COMMON_PLANT_MW', { bold: true, size: 11 });
  B.ro(ENG_X + 102, 566, 92, 22, '1.6 MVAr', 'COMMON_PLANT_MVAR', { bold: true, size: 11 });
  B.ro(ENG_X + 200, 566, 92, 22, '50.00 Hz', 'COMMON_BUSBAR1_FREQ',
    { bold: true, size: 11, decimals: 2 });

  return {
    screen_id: 'Common.Overview',
    title: 'Common — Overview',
    unit: 'COMMON',
    layout: 'canvas',
    canvas: { width: 1560, height: 640, background: C.ground },
    elements: B.elements
  };
}
