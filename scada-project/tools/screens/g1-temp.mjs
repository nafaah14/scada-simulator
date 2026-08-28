/* =====================================================================
   G1 → Temp
   ---------------------------------------------------------------------
   Drawn the way the real WOIS page is: the engine and alternator outline
   sit on a locked background layer and every measurement is placed on
   top of it. Rows run outer -> centre per cylinder (exhaust gas, liner 1,
   liner 2, big end bearing) into the main-bearing row on the crankshaft
   centreline, which both banks share.
   ===================================================================== */
export function g1Temp() {
  const els = [];
  let seq = 0;
  const id = () => 's' + (++seq);
  const add = o => { els.push({ id: id(), ...o }); return els[els.length - 1]; };

  const rect = (x, y, w, h, fill, stroke, extra) => add({
    type: 'rect', x, y, w, h,
    style: { fill, stroke: stroke || '#5a6068', strokeWidth: 1, radius: 0, opacity: 1 },
    props: {}, ...(extra || {})
  });
  const text = (x, y, w, t, opt = {}) => add({
    type: 'text', x, y, w, h: opt.h || 14,
    props: { text: t },
    style: { color: '#3a4753', fontSize: 9.5, bold: false, align: 'left', ...(opt.style || {}) },
    ...(opt.name ? { name: opt.name } : {})
  });
  const ro = (x, y, w, h, t, tag, opt = {}) => add({
    type: 'readout', x, y, w, h,
    bind: { value: tag || '' },
    props: { text: t, unit: opt.unit || '', decimals: opt.decimals ?? null },
    style: {
      fill: '#f6f8f9', stroke: '#c3cad2', strokeWidth: 1, color: '#172029',
      fontSize: 10.5, bold: false, align: 'center', radius: 0, ...(opt.style || {})
    },
    ...(opt.name ? { name: opt.name } : {})
  });

  const COL_X = i => 210 + i * 55, COL_W = 50;

  /* ---- background: engine + alternator outline (locked) ---- */
  rect(200, 112, 568, 80, '#9aa2ab', '#5a6068', { name: 'Bank B head', props: { bevel: true }, locked: true });
  rect(170, 192, 628, 212, '#9aa2ab', '#5a6068', { name: 'Engine block', props: { bevel: true }, locked: true });
  rect(200, 404, 568, 80, '#9aa2ab', '#5a6068', { name: 'Bank A head', props: { bevel: true }, locked: true });
  rect(798, 192, 62, 212, '#9aa2ab', '#5a6068', { name: 'Thrust housing', props: { bevel: true }, locked: true });
  rect(860, 278, 44, 26, '#8d959e', '#5a6068', { name: 'Coupling', locked: true });
  rect(904, 186, 252, 196, '#9aa2ab', '#5a6068', { name: 'Alternator', props: { bevel: true }, locked: true });
  rect(890, 214, 14, 60, '#8d959e', '#5a6068', { name: 'Alternator foot L', locked: true });
  rect(1156, 214, 14, 60, '#8d959e', '#5a6068', { name: 'Alternator foot R', locked: true });

  /* ---- turbochargers, non-driving end ---- */
  add({
    type: 'turbo', x: 178, y: 126, w: 26, h: 50, bind: { value: 'G01_TCB_SPEED' },
    props: { running: true }, style: { fill: '#e7ebef', stroke: '#5a6068', strokeWidth: 1 },
    name: 'TC B rotor'
  });
  add({
    type: 'turbo', x: 178, y: 418, w: 26, h: 50, bind: { value: 'G01_TCA_SPEED' },
    props: { running: true }, style: { fill: '#e7ebef', stroke: '#5a6068', strokeWidth: 1 },
    name: 'TC A rotor'
  });

  /* ---- bank B ---- */
  const bHead = ['B10', 'B9', 'B8', 'B7', 'B6', 'B5', 'B4', 'B3', 'B2', 'B1'];
  const bExh = [408, 405, 395, 407, 398, 398, 397, 407, 408, 405];
  const bLin1 = [116, 115, 115, 114, 115, 115, 113, 112, 117, 113];
  const bLin2 = [112, 113, 114, 113, 113, 112, 110, 112, 117, 108];
  const bBig = [79, 80, 78, 78, 83, 81, 79, 80, 78, 77];
  for (let i = 0; i < 10; i++) {
    const n = 10 - i;
    text(COL_X(i), 118, COL_W, bHead[i],
      { h: 13, style: { fontSize: 10, bold: true, align: 'center', color: '#1d242b' } });
    ro(COL_X(i), 136, COL_W, 20, bExh[i] + '°C', `G01_CYL_B_EXH_${n}`, { name: `B${n} exhaust` });
    ro(COL_X(i), 199, COL_W, 20, bLin1[i] + '°C', `G01_CYL_B_LINER1_${n}`, { name: `B${n} liner 1` });
    ro(COL_X(i), 221, COL_W, 20, bLin2[i] + '°C', `G01_CYL_B_LINER2_${n}`, { name: `B${n} liner 2` });
    ro(COL_X(i), 243, COL_W, 20, bBig[i] + '°C', `G01_CYL_B_BIGEND_${n}`, { name: `B${n} big end` });
  }
  text(300, 162, 220, 'Exhaust gas temperatures [°C]',
    { h: 12, style: { fontSize: 9.5, align: 'center', color: '#22282e' } });

  /* ---- main bearings on the crankshaft centreline ---- */
  const mainBrg = [88, 92, 93, 92, 92, 93, 90, 91, 92, 90, 90];
  for (let i = 0; i < 11; i++) {
    const n = 11 - i, x = 182 + i * 54;
    ro(x, 283, 48, 20, mainBrg[i] + '°C', `G01_MAIN_BRG_${n}`, { name: `Main bearing ${n}` });
    text(x, 306, 48, String(n), { h: 11, style: { fontSize: 9, align: 'center', color: '#2a3138' } });
  }

  /* ---- bank A (mirrored) ---- */
  const aHead = ['A10', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1'];
  const aExh = [398, 393, 383, 409, 391, 399, 399, 405, 395, 405];
  const aLin1 = [112, 114, 117, 120, 116, 119, 116, 114, 119, 111];
  const aLin2 = [111, 113, 114, 115, 113, 117, 114, 110, 118, 112];
  const aBig = [83, 86, 82, 84, 84, 80, 79, 86, 90, 83];
  for (let i = 0; i < 10; i++) {
    const n = 10 - i;
    ro(COL_X(i), 325, COL_W, 20, aBig[i] + '°C', `G01_CYL_A_BIGEND_${n}`, { name: `A${n} big end` });
    ro(COL_X(i), 347, COL_W, 20, aLin1[i] + '°C', `G01_CYL_A_LINER1_${n}`, { name: `A${n} liner 1` });
    ro(COL_X(i), 369, COL_W, 20, aLin2[i] + '°C', `G01_CYL_A_LINER2_${n}`, { name: `A${n} liner 2` });
    ro(COL_X(i), 428, COL_W, 20, aExh[i] + '°C', `G01_CYL_A_EXH_${n}`, { name: `A${n} exhaust` });
    text(COL_X(i), 452, COL_W, aHead[i],
      { h: 13, style: { fontSize: 10, bold: true, align: 'center', color: '#1d242b' } });
  }
  text(300, 410, 220, 'Exhaust gas temperatures [°C]',
    { h: 12, style: { fontSize: 9.5, align: 'center', color: '#22282e' } });

  /* ---- thrust bearing ---- */
  text(802, 262, 54, 'Thrust',
    { h: 12, style: { fontSize: 9.5, align: 'center', bold: true, color: '#1d242b' } });
  ro(804, 283, 50, 20, '80°C', 'G01_THRUST_BRG', { name: 'Thrust bearing' });
  text(804, 306, 50, '0', { h: 11, style: { fontSize: 9, align: 'center', color: '#2a3138' } });

  /* ---- alternator ---- */
  text(904, 194, 252, 'Generator',
    { h: 15, style: { fontSize: 12, bold: true, align: 'center', color: '#1d242b' } });
  const genCell = (x, y, w, label, val, tag) => {
    text(x, y, w, label,
      { h: 12, style: { fontSize: 9.5, align: 'center', bold: true, color: '#22282e' } });
    ro(x, y + 14, w, 22, val, tag, { style: { fontSize: 11, bold: true }, name: label });
  };
  genCell(990, 216, 80, 'Winding U', '92 °C', 'G01_GEN_WINDING_U');
  genCell(916, 268, 72, 'Bearing D', '77 °C', 'G01_GEN_BEARING_D');
  genCell(996, 268, 72, 'Winding V', '95 °C', 'G01_GEN_WINDING_V');
  genCell(1076, 268, 72, 'Bearing ND', '75 °C', 'G01_GEN_BEARING_ND');
  genCell(990, 318, 80, 'Winding W', '93 °C', 'G01_GEN_WINDING_W');

  text(1176, 168, 60, 'Air intake', { h: 12, style: { fontSize: 9, align: 'center' } });
  ro(1176, 186, 60, 22, '36 °C', 'G01_GEN_AIR_INTAKE', { style: { fontSize: 11, bold: true } });
  ro(1176, 388, 60, 22, '59 °C', 'G01_GEN_AIR_EXIT', { style: { fontSize: 11, bold: true } });
  text(1176, 410, 60, 'Air exit', { h: 12, style: { fontSize: 9, align: 'center' } });
  rect(1122, 346, 26, 26, '#f6f8f9', '#5a6068', { name: 'Excitation' });

  /* ---- status signals under the alternator ---- */
  [['Turn', 'G01_TURNING_GEAR'], ['E-stop', 'G01_EMERGENCY_STOP'], ['Lever', 'G01_STOP_LEVER']]
    .forEach(([lbl, tag], i) => {
      const x = 906 + i * 46;
      rect(x, 398, 40, 20, '#f6f8f9', '#8a94a0', { name: lbl + ' switch' });
      add({
        type: 'led', x: x + 15, y: 403, w: 10, h: 10, bind: { value: tag },
        props: { shape: 'circle', onColor: '#e5484d', offColor: '#2fa84f' },
        style: { fill: '#2fa84f', stroke: '#1c6b32', strokeWidth: 1 }, name: lbl
      });
      text(x, 420, 40, lbl, { h: 12, style: { fontSize: 9, align: 'center' } });
    });
  [['Minor alarm', 'G01_ALARM_MINOR'], ['Major alarm', 'G01_ALARM_MAJOR'],
   ['Slow down', 'G01_ALARM_SLOWDOWN'], ['Load reduction', 'G01_ALARM_LOADREDUCE']]
    .forEach(([lbl, tag], i) => {
      add({
        type: 'led', x: 1050 + i * 22, y: 402, w: 14, h: 14, bind: { value: tag },
        props: { shape: 'circle', onColor: '#e5484d', offColor: '#2fa84f' },
        style: { fill: '#2fa84f', stroke: '#1c6b32', strokeWidth: 1 }, name: lbl
      });
    });

  /* ---- turbocharger data ---- */
  text(30, 44, 150, 'TC B', { h: 13, style: { fontSize: 10, bold: true } });
  ro(30, 58, 90, 20, '340 °C', 'G01_TCB_EXH_OUT', { style: { align: 'right' } });
  text(126, 58, 150, 'Exh. gas temp outlet', { h: 20, style: { fontSize: 9.5 } });
  ro(30, 80, 90, 20, '508 °C', 'G01_TCB_EXH_IN', { style: { align: 'right' } });
  text(126, 80, 150, 'Exh. gas temp inlet', { h: 20, style: { fontSize: 9.5 } });
  ro(30, 102, 90, 20, '25160 rpm', 'G01_TCB_SPEED', { style: { align: 'right' } });
  text(126, 102, 150, 'Speed', { h: 20, style: { fontSize: 9.5 } });

  ro(30, 486, 90, 20, '25000 rpm', 'G01_TCA_SPEED', { style: { align: 'right' } });
  text(126, 486, 150, 'Speed', { h: 20, style: { fontSize: 9.5 } });
  ro(30, 508, 90, 20, '497 °C', 'G01_TCA_EXH_IN', { style: { align: 'right' } });
  text(126, 508, 150, 'Exh. gas temp inlet', { h: 20, style: { fontSize: 9.5 } });
  ro(30, 530, 90, 20, '336 °C', 'G01_TCA_EXH_OUT', { style: { align: 'right' } });
  text(126, 530, 150, 'Exh. gas temp outlet', { h: 20, style: { fontSize: 9.5 } });
  text(30, 552, 150, 'TC A', { h: 13, style: { fontSize: 10, bold: true } });

  /* ---- leader-line annotations ---- */
  const leaders = [
    [790, 56, 'Cylinder liner 2 temperature [°C]', 770, 60, 640, 225],
    [790, 74, 'Cylinder liner 1 temperature [°C]', 770, 78, 640, 205],
    [790, 98, 'Big end bearing temperatures [°C]', 770, 102, 640, 250],
    [790, 478, 'Big end bearing temperatures [°C]', 770, 486, 640, 332],
    [790, 500, 'Cylinder liner 1 temperature [°C]', 770, 506, 640, 352],
    [790, 522, 'Cylinder liner 2 temperature [°C]', 770, 528, 640, 374]
  ];
  leaders.forEach(([tx, ty, label, lx, ly, ex, ey]) => {
    add({
      type: 'led', x: tx - 12, y: ty + 2, w: 8, h: 8, bind: { value: '' },
      props: { shape: 'square' }, style: { fill: '#ffffff', stroke: '#5a6068', strokeWidth: 1 }
    });
    text(tx, ty, 210, label, { h: 14, style: { fontSize: 9.5 } });
    add({
      type: 'line', x: Math.min(lx, ex), y: Math.min(ly, ey),
      w: Math.abs(lx - ex), h: Math.abs(ly - ey),
      props: { dir: ly < ey ? 'tl-br' : 'bl-tr', dash: 0 },
      style: { stroke: '#ffffff', strokeWidth: 1 }
    });
  });
  add({
    type: 'led', x: 22, y: 290, w: 8, h: 8, bind: { value: '' },
    props: { shape: 'square' }, style: { fill: '#ffffff', stroke: '#5a6068', strokeWidth: 1 }
  });
  text(34, 286, 160, 'Bearing temperatures [°C]', { h: 14, style: { fontSize: 9.5 } });
  add({
    type: 'line', x: 150, y: 293, w: 32, h: 0, props: { dir: 'h', dash: 0 },
    style: { stroke: '#ffffff', strokeWidth: 1 }
  });

  /* ---- averages + summary ---- */
  ro(430, 504, 66, 20, '400 °C', 'G01_EXH_AVG_TEMP', { style: { bold: true } });
  text(502, 504, 180, 'Exhaust gas avg. temp.', { h: 20, style: { fontSize: 10 } });

  rect(150, 578, 600, 92, '#f2f4f6', '#c3cad2', { name: 'Summary panel' });
  const sum = (lx, ly, label, vx, val, tag, vw) => {
    text(lx, ly, 170, label, { h: 16, style: { fontSize: 10.5 } });
    ro(vx, ly - 2, vw || 96, 20, val, tag, { style: { align: 'right' } });
  };
  sum(164, 592, 'Engine speed', 336, '747 rpm', 'SCA011ST103PV');
  sum(164, 616, 'Running hours', 336, '5869 h', 'G01_RUNNING_HOURS');
  sum(452, 592, 'Gen. active power', 624, '8034 kW', 'SCA011PW104PV', 110);
  sum(452, 616, 'Gen. reactive power', 624, '303 kVAr', 'G01_GEN_REACTIVE_POWER', 110);
  sum(452, 640, 'Max available eng. power', 624, '8924 kW', 'G01_MAX_AVAIL_POWER', 110);

  return {
    screen_id: 'G1.Temp',
    title: 'G1 — Temperatures',
    unit: 'G1',
    layout: 'canvas',
    canvas: { width: 1400, height: 700, background: '#d4d8dc' },
    elements: els
  };
}
