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
    ['PBF 901', 78.4, [30, 30], 'PBF901_LEVEL'],
    ['PBF 904', 73.4, [30, 30], 'PBF904_LEVEL'],
    ['PBF 902', 80.1, [30, 30], 'PBF902_LEVEL'],
    ['PBF 905', 66.5, [31, 30], 'PBF905_LEVEL'],
    ['PBF 903', 75.2, [30, 30], 'PBF903_LEVEL'],
    ['PBF 906', 66.4, [30, 30], 'PBF906_LEVEL']
  ];
  const TW = 96, TH = 112, COL = [30, 180], ROWY = [76, 248, 420];
  const HEADER_X = 306;

  TANKS.forEach((t, i) => {
    const [label, pct, temps, tag] = t;
    const key = label.replace(' ', '');
    const col = i % 2, row = Math.floor(i / 2);
    const x = COL[col], y = ROWY[row];

    B.tank(x, y, TW, TH, tag, {
      level: pct, capacity: '25 m³', label: 'LFO day tank', plate: label, name: label,
      rows: [
        { tag, text: pct.toFixed(1) + ' %', unit: '%', decimals: 1 },
        ...temps.map((tv, k) => ({
          tag: `COMMON_${key}_T${k + 1}`, text: tv + ' °C', unit: '°C', decimals: 0
        }))
      ]
    });

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

  /* Any unit can be in any state at any time — the screen just binds the
     state tag and the symbol picks the colour. The values below are only
     the fallback shown before the simulation connects. */
  const UNITS = [
    { n: 1, flow: '1555 kg/h', kw: '7887 kW', kvar: '335 kVAr', state: 'running' },
    { n: 2, flow: '1567 kg/h', kw: '7883 kW', kvar: '299 kVAr', state: 'running' },
    { n: 3, flow: '1468 kg/h', kw: '7890 kW', kvar: '323 kVAr', state: 'running' },
    { n: 4, flow: '0 kg/h', kw: '0 kW', kvar: '0 kVAr', state: 'stopped' },
    { n: 5, flow: '1594 kg/h', kw: '7894 kW', kvar: '307 kVAr', state: 'running' },
    { n: 6, flow: '1545 kg/h', kw: '7875 kW', kvar: '315 kVAr', state: 'running' }
  ];

  UNITS.forEach(u => {
    const y = ROW[u.n - 1];
    const p = 'G0' + u.n;
    const live = u.state === 'running';

    /* booster branch: valve → duplex pump → flow */
    B.pipeH(BOOST_X, y, 16);
    B.valve(BOOST_X + 16, y - 5, `${p}_BOOSTER_V`, { open: live });
    B.pipeH(BOOST_X + 31, y, 8);
    B.pump(BOOST_X + 39, y - 24, `${p}_BOOSTER_P1`, { size: 17, running: live });
    B.pump(BOOST_X + 39, y + 7, `${p}_BOOSTER_P2`, { size: 17, running: false });
    B.pipeV(BOOST_X + 47.5, y - 7, 14);
    B.pipeH(BOOST_X + 56, y, 10);
    B.ro(BOOST_X + 66, y - 10, 72, 20, u.flow, `${p}_BOOSTER_FLOW`, { align: 'right' });
    B.pipeH(BOOST_X + 138, y, ENG_X - (BOOST_X + 138));

    /* genset + breaker + measurements */
    B.engine(ENG_X, y - 26, 150, 54, `${p}_STATE`,
      { state: u.state, text: String(u.n), name: 'Genset ' + u.n });
    B.pipeH(ENG_X + 150, y, 12, { color: '#5a6068', t: 2 });
    B.breaker(ENG_X + 162, y - 7, `${p}_BREAKER_STATE`,
      { state: live ? 'closed' : 'open' });
    B.pipeH(ENG_X + 176, y, 14, { color: '#5a6068', t: 2 });
    B.ro(ENG_X + 190, y - 10, 74, 20, u.kw, `${p}_KW`, { align: 'right' });
    B.ro(ENG_X + 268, y - 10, 74, 20, u.kvar, `${p}_KVAR`, { align: 'right' });
    B.ro(ENG_X + 346, y - 10, 80, 20, '1.00', `${p}_PF`,
      { align: 'right', unit: 'cos phi', decimals: 2 });
  });

  /* ---------- busbars ---------- */
  const BUS_X = ENG_X + 446;
  B.pipeV(BUS_X, ROW[0] - 14, (ROW[2] + 14) - (ROW[0] - 14), { color: '#5a6068', t: 3 });
  B.pipeV(BUS_X, ROW[3] - 14, (ROW[5] + 14) - (ROW[3] - 14), { color: '#5a6068', t: 3 });
  [0, 1, 2, 3, 4, 5].forEach(i => B.pipeH(ENG_X + 426, ROW[i], BUS_X - (ENG_X + 426),
    { color: '#5a6068', t: 2 }));
  B.text(BUS_X + 10, ROW[0] - 6, 90, 'Busbar 1', { size: 10.5, color: '#39414a' });
  B.text(BUS_X + 10, ROW[3] - 6, 90, 'Busbar 2', { size: 10.5, color: '#39414a' });

  // bus tie between the two busbars
  const tieY = (ROW[2] + ROW[3]) / 2;
  B.pipeV(BUS_X, ROW[2] + 14, tieY - 7 - (ROW[2] + 14), { color: '#5a6068', t: 3 });
  B.breaker(BUS_X - 7, tieY - 7, 'COMMON_BUSTIE_STATE', { state: 'closed', name: 'Bus tie' });
  B.pipeV(BUS_X, tieY + 7, (ROW[3] - 14) - (tieY + 7), { color: '#5a6068', t: 3 });

  /* ---------- plant totals + maintenance ---------- */
  // the Maintenance selector is what puts a unit into the yellow state
  B.button(482, 566, 110, 26, 'Maintenance', { name: 'Maintenance selector' });
  B.ro(ENG_X + 4, 566, 96, 24, '39.5 MW', 'COMMON_PLANT_MW', { bold: true, size: 11 });
  B.ro(ENG_X + 106, 566, 96, 24, '1.6 MVAr', 'COMMON_PLANT_MVAR', { bold: true, size: 11 });
  B.ro(ENG_X + 208, 566, 96, 24, '50.00 Hz', 'COMMON_BUSBAR1_FREQ',
    { bold: true, size: 11, decimals: 2 });

  return {
    screen_id: 'Common.Overview',
    title: 'Common — Overview',
    unit: 'COMMON',
    layout: 'canvas',
    canvas: { width: 1640, height: 640, background: C.ground },
    elements: B.elements
  };
}
