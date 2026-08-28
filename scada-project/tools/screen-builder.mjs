/* =====================================================================
   Small builder used by the screen generators.
   ---------------------------------------------------------------------
   Keeps each screen definition readable: geometry stays visible instead
   of being buried under repeated element boilerplate.
   ===================================================================== */

export function builder() {
  const els = [];
  let seq = 0;
  const id = () => 's' + (++seq);
  const push = o => { const e = { id: id(), ...o }; els.push(e); return e; };

  const B = {
    elements: els,

    /* ---- background ---- */
    rect: (x, y, w, h, opt = {}) => push({
      type: 'rect', x, y, w, h,
      props: { bevel: !!opt.bevel },
      style: {
        fill: opt.fill ?? '#c9ced3', stroke: opt.stroke ?? '#5a6068',
        strokeWidth: opt.strokeWidth ?? 1, radius: opt.radius ?? 0,
        opacity: opt.opacity ?? 1
      },
      ...(opt.name ? { name: opt.name } : {}),
      ...(opt.locked ? { locked: true } : {})
    }),

    /* A dashed grouping box with a corner label, e.g. "Feeder unit PCA901". */
    zone: (x, y, w, h, label, opt = {}) => {
      push({
        type: 'rect', x, y, w, h, props: { dashed: true },
        style: { fill: 'transparent', stroke: opt.stroke ?? '#6b7480', strokeWidth: 1, radius: 0 },
        name: label || 'zone', locked: true
      });
      if (label) {
        const lines = String(label).split('\n').length;
        B.text(x + 8, y + 6, opt.labelW ?? 190, label,
          { size: opt.labelSize ?? 10, bold: true, color: '#1d242b', h: lines * 13 });
      }
    },

    text: (x, y, w, t, opt = {}) => push({
      type: 'text', x, y, w, h: opt.h ?? 13,
      props: { text: t },
      style: {
        color: opt.color ?? '#1d242b', fontSize: opt.size ?? 9.5,
        bold: !!opt.bold, align: opt.align ?? 'left'
      },
      ...(opt.name ? { name: opt.name } : {})
    }),

    /* ---- piping ---- */
    pipeH: (x, y, w, opt = {}) => push({
      type: 'pipe', x, y: y - ((opt.t ?? 3) / 2), w, h: opt.t ?? 3,
      props: {}, style: { fill: opt.color ?? '#8a2f2f' }
    }),
    pipeV: (x, y, h, opt = {}) => push({
      type: 'pipe', x: x - ((opt.t ?? 3) / 2), y, w: opt.t ?? 3, h,
      props: {}, style: { fill: opt.color ?? '#8a2f2f' }
    }),
    line: (x, y, w, h, opt = {}) => push({
      type: 'line', x, y, w, h,
      props: { dir: opt.dir ?? 'tl-br', dash: opt.dash ?? 0 },
      style: { stroke: opt.color ?? '#ffffff', strokeWidth: opt.t ?? 1 }
    }),

    /* Process equipment outline: exchanger | filter | diamond | circle |
       triangle-up | triangle-down | triangle-left | triangle-right */
    shape: (x, y, w, h, kind, opt = {}) => push({
      type: 'shape', x, y, w, h,
      props: { kind },
      style: {
        fill: opt.fill ?? '#c9ced3', stroke: opt.stroke ?? '#3d4349',
        strokeWidth: opt.strokeWidth ?? 1
      },
      ...(opt.name ? { name: opt.name } : {})
    }),

    /* Flow-direction marker sitting on a pipe run. */
    arrow: (x, y, dir, opt = {}) => push({
      type: 'arrow', x, y, w: opt.w ?? 11, h: opt.h ?? 11,
      props: { dir },
      style: { fill: opt.color ?? '#8a2f2f' }
    }),

    /* ---- symbols ---- */
    ro: (x, y, w, h, text, tag, opt = {}) => push({
      type: 'readout', x, y, w, h,
      bind: { value: tag || '' },
      props: { text, unit: opt.unit !== undefined ? opt.unit : '',
               decimals: opt.decimals ?? null },
      style: {
        fill: opt.fill ?? '#f6f8f9', stroke: opt.stroke ?? '#8a929b',
        strokeWidth: opt.strokeWidth ?? 1, color: opt.color ?? '#111820',
        fontSize: opt.size ?? 10.5, bold: !!opt.bold,
        align: opt.align ?? 'center', radius: 0
      },
      ...(opt.name ? { name: opt.name } : {})
    }),

    led: (x, y, tag, opt = {}) => push({
      type: 'led', x, y, w: opt.w ?? 12, h: opt.h ?? 12,
      bind: { value: tag || '' },
      props: {
        shape: opt.shape ?? 'circle',
        onColor: opt.onColor ?? null,
        offColor: opt.offColor ?? null
      },
      style: {
        fill: opt.fill ?? '#2fa84f', stroke: opt.stroke ?? '#1c6b32',
        strokeWidth: opt.strokeWidth ?? 1
      },
      ...(opt.name ? { name: opt.name } : {})
    }),

    pump: (x, y, tag, opt = {}) => push({
      type: 'pump', x, y, w: opt.size ?? 20, h: opt.size ?? 20,
      bind: { value: tag || '' },
      props: { running: opt.running !== false },
      style: {
        fill: opt.fill ?? '#ffffff',
        stroke: opt.color ?? '#2fa84f', strokeWidth: opt.strokeWidth ?? 2
      },
      ...(opt.name ? { name: opt.name } : {})
    }),

    valve: (x, y, tag, opt = {}) => push({
      type: 'valve', x, y, w: opt.w ?? 15, h: opt.h ?? 11,
      bind: { value: tag || '' },
      props: { open: opt.open !== false },
      style: { fill: opt.fill ?? '#2fa84f' },
      ...(opt.name ? { name: opt.name } : {})
    }),

    /* A whole vessel in one element — rows are data, so a 3-row day tank
       and a 5-row storage tank are the same symbol. */
    tank: (x, y, w, h, tag, opt = {}) => push({
      type: 'tank', x, y, w, h,
      bind: { value: tag || '' },
      props: {
        level: opt.level ?? 60,
        capacity: opt.capacity ?? '',
        label: opt.label ?? '',
        plate: opt.plate ?? '',
        switches: opt.switches !== false,
        rows: opt.rows ?? []
      },
      style: { fill: opt.fill ?? '#9aa2ab', stroke: opt.stroke ?? '#3d4349', strokeWidth: 1 },
      ...(opt.name ? { name: opt.name } : {})
    }),

    /* state: running | stopped | maintenance | trip */
    engine: (x, y, w, h, tag, opt = {}) => push({
      type: 'engine', x, y, w, h,
      bind: { value: tag || '' },
      props: {
        state: opt.state ?? (opt.running === false ? 'stopped' : 'running'),
        text: opt.text ?? '',
        cylinders: opt.cylinders ?? 9
      },
      style: {},
      ...(opt.name ? { name: opt.name } : {})
    }),

    turbo: (x, y, w, h, tag, opt = {}) => push({
      type: 'turbo', x, y, w, h,
      bind: { value: tag || '' },
      props: { running: opt.running !== false },
      style: { fill: opt.fill ?? '#e7ebef', stroke: '#5a6068', strokeWidth: 1 },
      ...(opt.name ? { name: opt.name } : {})
    }),

    /* state: closed | open | trip */
    breaker: (x, y, tag, opt = {}) => push({
      type: 'breaker', x, y, w: opt.size ?? 14, h: opt.size ?? 14,
      bind: { value: tag || '' },
      props: { state: opt.state ?? (opt.closed === false ? 'open' : 'closed') },
      style: { fill: '#2fa84f', stroke: '#1c6b32', strokeWidth: opt.strokeWidth ?? 1 },
      ...(opt.name ? { name: opt.name } : {})
    }),

    /* kind: relay | meter */
    relay: (x, y, w, h, kind, opt = {}) => push({
      type: 'relay', x, y, w, h,
      bind: { value: opt.tag || '' },
      props: { kind: kind || 'relay' },
      style: { fill: opt.fill ?? '#c9ced3', stroke: '#3d4349', strokeWidth: 1 },
      ...(opt.name ? { name: opt.name } : {})
    }),

    transformer: (x, y, w, h, opt = {}) => push({
      type: 'transformer', x, y, w, h,
      props: { windings: 2 },
      style: { stroke: opt.stroke ?? '#3d4349', strokeWidth: opt.strokeWidth ?? 2,
               fill: opt.fill ?? 'transparent' },
      ...(opt.name ? { name: opt.name } : {})
    }),

    isolator: (x, y, w, h, tag, opt = {}) => push({
      type: 'isolator', x, y, w, h,
      bind: { value: tag || '' },
      props: { closed: !!opt.closed, earth: opt.earth !== false },
      style: { stroke: opt.stroke ?? '#3d4349', strokeWidth: opt.strokeWidth ?? 2 },
      ...(opt.name ? { name: opt.name } : {})
    }),

    gauge: (x, y, w, h, tag, opt = {}) => push({
      type: 'gauge', x, y, w, h,
      bind: { value: tag || '' },
      props: {
        min: opt.min ?? 0, max: opt.max ?? 100, value: opt.value ?? 0,
        orientation: opt.orientation ?? 'vertical', marker: opt.marker ?? null
      },
      style: { fill: opt.fill ?? '#2fa84f', stroke: '#8a929b', strokeWidth: 1 },
      ...(opt.name ? { name: opt.name } : {})
    }),

    /* ---- automation network ---- */

    /* A PLC or IO rack. `modules` are the slot type letters, e.g.
       ['PS','CPU','CPU','DO','DI','AO','AI']. */
    iorack: (x, y, w, h, title, modules, opt = {}) => push({
      type: 'iorack', x, y, w, h,
      props: { title, modules, alarms: opt.alarms || [] },
      style: {
        fill: opt.fill ?? '#8d959e', stroke: opt.stroke ?? '#1d242b', strokeWidth: 1,
        headerFill: opt.headerFill ?? '#4a7fb5', color: opt.color ?? '#f2e200'
      },
      ...(opt.name ? { name: opt.name } : { name: title })
    }),

    netswitch: (x, y, w, h, ports, opt = {}) => push({
      type: 'netswitch', x, y, w, h,
      props: { ports, cols: opt.cols ?? 2 },
      style: { fill: opt.fill ?? '#c9ced3', stroke: opt.stroke ?? '#3d4349',
               strokeWidth: 1 },
      ...(opt.name ? { name: opt.name } : {})
    }),

    device: (x, y, w, h, title, text, opt = {}) => push({
      type: 'device', x, y, w, h,
      props: { title, text, glyph: opt.glyph ?? 'none' },
      style: {
        fill: opt.fill ?? '#b9bfa8', stroke: opt.stroke ?? '#1d242b', strokeWidth: 1,
        headerFill: opt.headerFill ?? '#4a7fb5', color: opt.color ?? '#1d242b',
        fontSize: opt.size ?? 10
      },
      ...(opt.name ? { name: opt.name } : { name: [title, text].filter(Boolean).join(' ') })
    }),

    barchart: (x, y, w, h, bars, opt = {}) => push({
      type: 'barchart', x, y, w, h,
      props: {
        bars, min: opt.min ?? 0, max: opt.max ?? 600, unit: opt.unit ?? '°C',
        average: opt.average ?? null, alarmLine: opt.alarmLine ?? null,
        shutdownLine: opt.shutdownLine ?? null, gridStep: opt.gridStep ?? 60,
        showAverage: opt.showAverage !== false
      },
      style: {
        fill: opt.fill ?? '#00a000', stroke: opt.stroke ?? '#1d242b', strokeWidth: 1,
        plotFill: opt.plotFill ?? '#a9b0b6', color: opt.color ?? '#1d242b',
        fontSize: opt.size ?? 11
      },
      ...(opt.name ? { name: opt.name } : {})
    }),

    /* Lettered P&ID bubble — M, S, P, LT, G. */
    bubble: (x, y, size, text, opt = {}) => push({
      type: 'bubble', x, y, w: size, h: opt.h ?? size,
      bind: { value: opt.tag || '' },
      props: { text, state: opt.state || 'normal', onState: opt.onState || 'alarm' },
      style: {
        fill: opt.fill ?? '#ffffff', stroke: opt.stroke ?? '#1d242b',
        strokeWidth: opt.strokeWidth ?? 1.5, color: opt.color ?? '#1d242b',
        fontSize: opt.size ?? 10, bold: opt.bold !== false
      },
      ...(opt.name ? { name: opt.name } : {})
    }),

    button: (x, y, w, h, label, opt = {}) => push({
      type: 'button', x, y, w, h,
      props: { text: label, disabled: !!opt.disabled },
      style: {
        fill: opt.fill ?? '#e4e7ea', stroke: opt.stroke ?? '#8a929b', strokeWidth: 1,
        color: opt.color ?? '#1d242b', fontSize: opt.size ?? 10, radius: 0
      },
      ...(opt.name ? { name: opt.name } : {})
    }),

    /* An arrow-terminated label, e.g. "◀ To oily water treatment". */
    outArrow: (x, y, w, label, opt = {}) =>
      B.text(x, y, w, '◀ ' + label, { size: opt.size ?? 10, color: opt.color ?? '#1d242b' })
  };

  return B;
}

/* WOIS palette — the real HMI is a mid-grey ground with darker equipment. */
export const C = {
  ground: '#d2d6da',
  panel: '#c9ced3',
  equipment: '#9aa2ab',
  equipmentDark: '#8d959e',
  field: '#f6f8f9',
  fuel: '#8a2f2f',      // fuel oil piping
  lube: '#8a2f2f',      // lube oil piping
  air: '#3050a0',       // compressed air piping
  charge: '#0000c8',    // charge air
  exhaust: '#f2e200',   // exhaust gas
  cool: '#00a000',      // cooling water (HT / LT)
  water: '#2f7fb0',
  green: '#2fa84f',
  red: '#e5484d',
  amber: '#d99418',
  ink: '#1d242b'
};
