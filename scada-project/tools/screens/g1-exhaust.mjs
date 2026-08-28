/* =====================================================================
   G1 → Exh. gas
   ---------------------------------------------------------------------
   Air and exhaust path for both banks: filtered air (blue) is drawn
   through each turbocharger compressor, cooled in the charge air
   coolers and delivered to the cylinder banks; exhaust (yellow) leaves
   the banks, drives the turbines and goes out through the silencer and
   stack. The turbocharger wash unit taps in at the bottom left.
   ===================================================================== */
import { builder, C } from '../screen-builder.mjs';

const AIR = { color: C.charge, t: 3 };
const EXH = { color: C.exhaust, t: 4 };
const WASH = { color: C.cool, t: 2 };

export function g1Exhaust() {
  const B = builder();

  /* ================= stack ================= */
  B.rect(300, 96, 34, 76, { fill: C.exhaust, stroke: '#8a7f00',
    name: 'Exhaust silencer & stack' });
  [112, 128, 144, 160].forEach(y => B.pipeH(300, y, 34, { color: '#8a7f00', t: 1 }));
  B.pipeV(317, 60, 36, EXH);
  B.arrow(311, 46, 'up', { color: C.exhaust, w: 14, h: 14 });
  B.text(348, 108, 140, 'Exhaust gas\nsilencer & stack', { size: 9.5, h: 24 });

  /* ================= ambient + engine header ================= */
  B.rect(760, 132, 176, 44, { fill: '#e6e9ec', stroke: '#8a929b' });
  B.text(768, 140, 110, 'Ambient temperature', { size: 8.5 });
  B.ro(872, 137, 60, 16, '30.2 °C', 'COMMON_AMBIENT_TEMP', { size: 8.5, decimals: 1 });
  B.text(768, 158, 110, 'Absolute humidity', { size: 8.5 });
  B.ro(872, 155, 60, 16, '19.1 g/kg', 'COMMON_ABS_HUMIDITY', { size: 8.5, decimals: 1 });

  B.text(760, 190, 120, 'Engine speed', { size: 9, align: 'right' });
  B.ro(888, 186, 76, 18, '753 rpm', 'SCA011ST103PV', { size: 9, decimals: 0 });
  B.text(730, 210, 150, 'Gen. active power', { size: 9, align: 'right' });
  B.ro(888, 206, 76, 18, '7873 kW', 'SCA011PW104PV', { size: 9, decimals: 0 });
  B.text(720, 230, 160, 'Exhaust gas avg. temp.', { size: 9, align: 'right' });
  B.ro(888, 226, 76, 18, '400 °C', 'G01_EXH_AVG_TEMP', { size: 9, decimals: 0 });

  /* ================= engine zone ================= */
  const EZ = { x: 408, y: 240, w: 552, h: 296 };
  B.zone(EZ.x, EZ.y, EZ.w, EZ.h, 'Engine 011', { labelW: 130, labelSize: 9.5 });

  /* air intake filter, shared by both banks */
  B.shape(346, 348, 18, 84, 'filter', { name: 'Air intake filter' });
  B.rect(348, 342, 20, 16, { fill: C.field, stroke: '#5a6068', radius: 8 });
  B.text(348, 346, 20, 'P', { size: 8.5, align: 'center', bold: true });
  B.ro(338, 440, 56, 20, '33 °C', 'G01_AIR_INTAKE_TEMP', { size: 9, decimals: 0 });

  /* two identical banks: B on top, A below */
  const BANKS = [
    { id: 'B', y: 366, rpm: '25100 rpm', outT: '340 °C', inT: '508 °C', rpmAbove: true },
    { id: 'A', y: 424, rpm: '24950 rpm', outT: '335 °C', inT: '497 °C', rpmAbove: false }
  ];

  BANKS.forEach(bank => {
    const y = bank.y;
    const tag = `G01_TC${bank.id}`;

    // filtered air → compressor
    B.pipeH(364, y, 68, AIR);
    B.rect(432, y - 16, 46, 32, { fill: '#dfe3e7', stroke: '#3d4349',
      name: `TC ${bank.id} compressor` });
    [10, 22, 34].forEach(dx => B.pipeV(432 + dx, y - 16, 32, { color: '#3d4349', t: 1 }));
    B.pipeH(478, y, 82, AIR);

    // turbocharger rotor
    B.turbo(560, y - 24, 34, 48, `${tag}_SPEED`, { running: true,
      name: `Turbocharger ${bank.id}` });
    B.ro(bank.rpmAbove ? 566 : 566, bank.rpmAbove ? y - 60 : y + 32, 78, 20,
      bank.rpm, `${tag}_SPEED`, { size: 9, decimals: 0 });

    // exhaust in from the bank, out to the stack
    B.ro(496, bank.rpmAbove ? y - 60 : y + 32, 66, 20, bank.outT,
      `${tag}_EXH_OUT`, { size: 9, decimals: 0 });
    B.ro(646, bank.rpmAbove ? y - 60 : y + 32, 66, 20, bank.inT,
      `${tag}_EXH_IN`, { size: 9, decimals: 0 });

    // charge air coolers, two stages per bank
    B.pipeH(594, y, 96, AIR);
    B.shape(690, y - 15, 26, 30, 'exchanger', { name: `Charge air cooler ${bank.id}1` });
    B.shape(718, y - 15, 26, 30, 'exchanger', { name: `Charge air cooler ${bank.id}2` });
    B.pipeH(744, y, 40, AIR);
  });

  // charge air receiver conditions, shared
  B.pipeV(784, BANKS[0].y, BANKS[1].y - BANKS[0].y, AIR);
  const midY = (BANKS[0].y + BANKS[1].y) / 2;
  B.ro(752, midY - 11, 74, 22, '2.77 bar', 'G01_CHARGE_AIR_PRESS',
    { bold: true, decimals: 2 });
  B.ro(838, midY - 11, 66, 22, '57 °C', 'G01_CHARGE_AIR_TEMP',
    { bold: true, decimals: 0 });
  B.pipeH(826, midY, 12, AIR);
  B.pipeH(904, midY, 20, AIR);
  B.pipeV(924, BANKS[0].y - 26, (BANKS[1].y + 26) - (BANKS[0].y - 26), AIR);

  /* cylinder banks — charge air in, exhaust out */
  BANKS.forEach(bank => {
    const y = bank.y;
    B.text(838, bank.rpmAbove ? y - 46 : y + 34, 80, 'Bank ' + bank.id,
      { size: 10, bold: true });
    [0, 1].forEach(g => {
      const gx = 828 + g * 62;
      B.pipeH(gx, y, 40, AIR);
      [0, 1].forEach(k => {
        B.shape(gx + 4 + k * 24, y - 11, 22, 22, 'circle',
          { fill: C.exhaust, stroke: '#8a7f00', name: `Cyl exhaust ${bank.id}${g * 2 + k + 1}` });
      });
      B.pipeV(gx + 15, y - 26, 15, EXH);
      B.pipeV(gx + 39, y - 26, 15, EXH);
    });
  });

  // exhaust manifolds gather above/below each bank and run to the turbines
  B.pipeH(680, BANKS[0].y - 26, 264, EXH);
  B.pipeH(680, BANKS[1].y + 26, 264, EXH);
  B.pipeV(680, BANKS[0].y - 26, 24, EXH);
  B.pipeV(680, BANKS[1].y + 2, 24, EXH);

  // turbine exhaust out to the stack
  B.pipeV(577, BANKS[0].y - 60, 36, EXH);
  B.pipeH(340, BANKS[0].y - 60, 237, EXH);
  B.pipeV(340, 172, BANKS[0].y - 60 - 172, EXH);

  /* ================= turbocharger wash ================= */
  const WZ = { x: 160, y: 512, w: 160, h: 96 };
  B.zone(WZ.x, WZ.y, WZ.w, WZ.h, 'Wärtsilä Turbocharger Wash',
    { labelW: 152, labelSize: 8.5 });
  B.rect(58, 536, 96, 22, { fill: C.field, stroke: '#5a6068' });
  B.text(60, 540, 92, 'Water from\npiperack', { size: 8, h: 20 });
  B.arrow(150, 542, 'right', { color: C.cool });
  B.rect(58, 566, 96, 22, { fill: C.field, stroke: '#5a6068' });
  B.text(60, 572, 92, 'Compressed air', { size: 8 });
  B.arrow(150, 572, 'right', { color: C.charge });

  [['V001', 186, 547], ['V002', 246, 547],
   ['V003', 186, 577], ['V004', 246, 577],
   ['V005', 186, 601], ['V006', 288, 601]].forEach(([v, x, y]) => {
    B.text(x - 4, y - 18, 32, v, { size: 7.5 });
    B.valve(x, y - 5, `G01_TCWASH_${v}`, { open: false });
  });
  B.pipeH(168, 547, 18, WASH);
  B.pipeH(201, 547, 45, WASH);
  B.pipeH(261, 547, 60, WASH);
  B.pipeH(168, 577, 18, { color: C.charge, t: 2 });
  B.pipeH(201, 577, 45, { color: C.charge, t: 2 });
  B.pipeH(261, 577, 60, { color: C.charge, t: 2 });
  B.pipeH(168, 601, 18, { color: C.charge, t: 2 });
  B.pipeH(201, 601, 87, { color: C.charge, t: 2 });
  B.arrow(288, 596, 'right', { color: C.charge });

  // wash lines up into each turbocharger
  B.pipeH(321, 547, 165, WASH);
  B.pipeV(486, 480, 67, WASH);
  B.arrow(481, 470, 'up', { color: C.cool });
  B.pipeH(321, 577, 320, WASH);
  B.pipeV(641, 470, 107, WASH);
  B.arrow(636, 460, 'up', { color: C.cool });
  B.pipeH(321, 601, 424, { color: C.charge, t: 2 });
  B.pipeV(745, 470, 131, { color: C.charge, t: 2 });
  B.arrow(740, 460, 'up', { color: C.charge });

  return {
    screen_id: 'G1.Exhaust',
    title: 'G1 — Exhaust gas',
    unit: 'G1',
    layout: 'canvas',
    canvas: { width: 1000, height: 630, background: C.ground },
    elements: B.elements
  };
}
