/* =====================================================================
   G1 → Exh. gas (graph)
   ---------------------------------------------------------------------
   The same 20 cylinder exhaust temperatures as the Temp page, drawn as
   a bar chart against the bank average. Absolute temperature only tells
   you the engine is hot; the deviation row underneath is what finds a
   misfiring cylinder, because a cylinder that stops burning drops well
   below the average long before it trips anything.

   Both the bars and the deviation readouts come from the same tags the
   Temp page uses — this is a second view of one data set, not a second
   copy of it.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

const BANKS = ['A', 'B'];
const CYLS = 10;
const SCALE_MAX = 600;
const ALARM = 500;        // Hi on every cylinder exhaust tag
const SHUTDOWN = 540;

const PLOT_X = 300;
const PLOT_Y = 120;
const PLOT_W = 1300;
const PLOT_H = 560;

export function g1ExhGraph() {
  const B = builder();

  const cyls = [];
  for (const bank of BANKS) {
    for (let n = 1; n <= CYLS; n++) {
      cyls.push({ label: `${bank}${n}`, tag: `G01_CYL_${bank}_EXH_${n}` });
    }
  }
  // representative values for the static/editor view; live tags override
  const SAMPLE = [406, 394, 404, 399, 397, 390, 407, 382, 391, 398,
                  408, 405, 395, 397, 399, 396, 406, 394, 406, 406];
  const AVG = 399;

  /* ---- legend ---- */
  B.pipeH(1360, 96, 40, { color: C.red, t: 2 });
  B.text(1406, 88, 70, 'Alarm', { size: 11, bold: true, color: C.red });
  B.pipeH(1478, 96, 40, { color: '#1d242b', t: 2 });
  B.text(1524, 88, 90, 'Shutdown', { size: 11, bold: true, color: C.red });
  B.rect(1350, 80, 264, 26, { fill: 'transparent', stroke: '#8a929b' });

  /* ---- the chart ---- */
  B.barchart(PLOT_X, PLOT_Y, PLOT_W, PLOT_H,
    cyls.map((c, i) => ({ ...c, value: SAMPLE[i] })), {
      min: 0, max: SCALE_MAX, unit: '°C', gridStep: 50,
      alarmLine: ALARM, shutdownLine: SHUTDOWN, average: null,
      name: 'Cylinder exhaust gas temperatures'
    });

  // scale annotations sit outside the plot, as on the real page
  B.text(180, PLOT_Y - 8, 110, `${SCALE_MAX} °C`, { size: 14, bold: true, align: 'right' });
  B.text(180, PLOT_Y + PLOT_H * (1 - SHUTDOWN / SCALE_MAX) - 8, 110, `${SHUTDOWN} °C`,
    { size: 14, bold: true, align: 'right', color: C.red });
  // the average line carries its own value out at the right-hand margin
  B.pipeH(PLOT_X + PLOT_W, PLOT_Y + PLOT_H * (1 - AVG / SCALE_MAX), 44,
    { color: '#1d242b', t: 1 });
  B.ro(PLOT_X + PLOT_W + 48, PLOT_Y + PLOT_H * (1 - AVG / SCALE_MAX) - 14, 76, 26,
    String(AVG), 'G01_EXH_AVG_TEMP',
    { size: 13, bold: true, decimals: 0, fill: 'transparent', stroke: 'transparent',
      align: 'left', name: 'Bank average' });

  /* ---- readout rows under the chart ----
     One column per cylinder, aligned to the bars above by using the same
     width and step, so the page stays lined up if a cylinder is added. */
  const step = PLOT_W / cyls.length;
  const cellW = step - 6;
  const ROW_Y = PLOT_Y + PLOT_H + 30;

  [['Temperature', 0, t => t, { bold: true }],
   ['Deviation', 34, t => t + '_DEV', {}]]
    .forEach(([label, dy, tagOf, opt]) => {
      B.text(120, ROW_Y + dy + 8, 170, label, { size: 12, bold: true, align: 'right' });
      cyls.forEach((c, i) => {
        const v = tagOf(c.tag).endsWith('_DEV') ? SAMPLE[i] - AVG : SAMPLE[i];
        B.ro(PLOT_X + i * step + 3, ROW_Y + dy, cellW, 30, String(v), tagOf(c.tag),
          { size: 12, bold: !!opt.bold, decimals: 0, unit: null, fill: '#f6f8f9' });
      });
    });

  B.text(120, ROW_Y + 80, 170, 'Active power', { size: 12, bold: true, align: 'right' });
  B.ro(PLOT_X, ROW_Y + 72, 150, 30, '7904 kW', 'G01_KW',
    { size: 12, bold: true, decimals: 0, unit: 'kW' });
  B.text(700, ROW_Y + 80, 170, 'Engine speed', { size: 12, bold: true, align: 'right' });
  B.ro(884, ROW_Y + 72, 150, 30, '753 rpm', 'G01_ENGINE_SPEED',
    { size: 12, bold: true, decimals: 0, unit: 'rpm' });

  return {
    screen_id: 'G1.ExhGraph',
    title: 'G1 — Exhaust gas temperatures',
    unit: 'G1',
    layout: 'canvas',
    canvas: { width: 1720, height: 840, background: C.ground },
    elements: B.elements
  };
}
