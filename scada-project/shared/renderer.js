/* =====================================================================
   SCADA SHARED RENDERER
   ---------------------------------------------------------------------
   One renderer, used by both the layout editor and the runtime app shell,
   so a screen looks identical in both. Loaded as a plain <script> — no
   build step — and exposed as window.Scada.

   A screen is a JSON document:
     { screen_id, title, layout:"canvas", canvas:{width,height,background},
       elements:[ {id,type,x,y,w,h,name?,locked?,hidden?,bind?,props?,style?} ] }

   `elements` is flat and paint-ordered: index 0 is furthest back.
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---------- element type registry ---------------------------------
     Each type declares its default box, props, style, and which
     inspector fields the editor should expose. Adding a symbol type =
     one entry here + one case in renderElement().                     */
  const TYPES = {
    rect: {
      label: 'Rectangle', group: 'Background', w: 160, h: 80,
      style: { fill: '#9aa2ab', stroke: '#5a6068', strokeWidth: 1, radius: 0, opacity: 1 },
      props: { bevel: false, dashed: false },
      fields: ['fill', 'stroke', 'strokeWidth', 'radius', 'opacity', 'bevel', 'dashed']
    },
    line: {
      label: 'Line', group: 'Background', w: 120, h: 60,
      style: { stroke: '#7c8896', strokeWidth: 1 },
      props: { dir: 'tl-br', dash: 0 },
      fields: ['stroke', 'strokeWidth', 'dir', 'dash']
    },
    pipe: {
      label: 'Pipe', group: 'Background', w: 140, h: 3,
      style: { fill: '#8a2f2f' },
      fields: ['fill']
    },
    /* Process-equipment outlines that recur across the aux systems —
       one type with a `kind`, rather than a type per shape. */
    shape: {
      label: 'Shape', group: 'Background', w: 30, h: 30,
      props: { kind: 'exchanger' },
      style: { fill: '#c9ced3', stroke: '#3d4349', strokeWidth: 1 },
      fields: ['kind', 'fill', 'stroke', 'strokeWidth']
    },
    /* Flow direction marker that sits on a pipe run. */
    arrow: {
      label: 'Flow arrow', group: 'Background', w: 12, h: 12,
      props: { dir: 'right' },
      style: { fill: '#8a2f2f' },
      fields: ['arrowDir', 'fill']
    },
    text: {
      label: 'Text label', group: 'Background', w: 130, h: 16,
      props: { text: 'Label' },
      style: { color: '#3a4753', fontSize: 11, bold: false, align: 'left' },
      fields: ['text', 'color', 'fontSize', 'bold', 'align']
    },

    readout: {
      label: 'Readout', group: 'Symbols', w: 60, h: 20, bind: true,
      props: { text: '0', unit: '', decimals: null },
      style: {
        fill: '#f6f8f9', stroke: '#c3cad2', strokeWidth: 1, color: '#172029',
        fontSize: 11, bold: false, align: 'center', radius: 0
      },
      fields: ['text', 'unit', 'decimals', 'fill', 'stroke', 'strokeWidth',
               'color', 'fontSize', 'bold', 'align', 'radius']
    },
    led: {
      label: 'Status LED', group: 'Symbols', w: 12, h: 12, bind: true,
      props: { shape: 'circle', onColor: null, offColor: null },
      style: { fill: '#2fa84f', stroke: '#1c6b32', strokeWidth: 0 },
      fields: ['shape', 'fill', 'onColor', 'offColor', 'stroke', 'strokeWidth']
    },
    pump: {
      label: 'Pump', group: 'Symbols', w: 20, h: 20, bind: true,
      props: { running: true },
      style: { fill: '#ffffff', stroke: '#2fa84f', strokeWidth: 2 },
      fields: ['running', 'fill', 'stroke', 'strokeWidth']
    },
    valve: {
      label: 'Valve', group: 'Symbols', w: 15, h: 11, bind: true,
      props: { open: true },
      style: { fill: '#2fa84f' },
      fields: ['open', 'fill']
    },
    tank: {
      label: 'Tank', group: 'Symbols', w: 96, h: 118, bind: true,
      props: {
        level: 60, capacity: '25 m³', label: 'LFO day tank', plate: 'PBF 901',
        switches: true,
        rows: [{ tag: '', text: '78.4 %' }, { tag: '', text: '30 °C' }, { tag: '', text: '30 °C' }]
      },
      style: { fill: '#9aa2ab', stroke: '#3d4349', strokeWidth: 1 },
      fields: ['rows', 'level', 'capacity', 'label', 'plate', 'switches', 'fill', 'stroke']
    },
    engine: {
      label: 'Genset', group: 'Symbols', w: 150, h: 54, bind: true,
      props: { state: 'running', text: '1', cylinders: 9 },
      style: {},
      fields: ['state', 'text', 'cylinders']
    },
    turbo: {
      label: 'Turbocharger', group: 'Symbols', w: 24, h: 44, bind: true,
      props: { running: true },
      style: { fill: '#e7ebef', stroke: '#5a6068', strokeWidth: 1 },
      fields: ['running', 'fill', 'stroke', 'strokeWidth']
    },
    breaker: {
      label: 'Breaker', group: 'Symbols', w: 14, h: 14, bind: true,
      props: { state: 'closed' },
      style: { fill: '#2fa84f', stroke: '#1c6b32', strokeWidth: 1 },
      fields: ['breakerState', 'strokeWidth']
    },
    /* Switchgear primitives — these repeat dozens of times on a
       single-line diagram, so they are symbols rather than drawings. */
    relay: {
      label: 'Relay / meter', group: 'Symbols', w: 38, h: 46, bind: true,
      props: { kind: 'relay' },
      style: { fill: '#c9ced3', stroke: '#3d4349', strokeWidth: 1 },
      fields: ['relayKind', 'fill', 'stroke']
    },
    transformer: {
      label: 'Transformer', group: 'Symbols', w: 40, h: 58,
      props: { windings: 2 },
      style: { stroke: '#3d4349', strokeWidth: 2, fill: 'transparent' },
      fields: ['stroke', 'strokeWidth', 'fill']
    },
    /* The lettered circle the P&IDs hang on everything: M on a motor,
       S on a switch, P/S on a pump, LT on a cooler. Bindable, because
       most of them go red or green with the thing they sit on. */
    bubble: {
      label: 'Instrument bubble', group: 'Symbols', w: 24, h: 24, bind: true,
      props: { text: 'M', state: 'normal', onState: 'alarm' },
      style: { fill: '#ffffff', stroke: '#1d242b', strokeWidth: 1.5,
               color: '#1d242b', fontSize: 11, bold: true },
      fields: ['text', 'bubbleState', 'onState', 'fill', 'stroke', 'strokeWidth',
               'color', 'fontSize', 'bold']
    },
    isolator: {
      label: 'Isolator / earth', group: 'Symbols', w: 30, h: 32, bind: true,
      props: { closed: false, earth: true },
      style: { stroke: '#3d4349', strokeWidth: 2 },
      fields: ['closed', 'earth', 'stroke', 'strokeWidth']
    },
    /* Automation-network primitives. The network pages are a hundred
       near-identical cabinets, so a rack is data (its module list) and
       not a hand-drawn group. */
    iorack: {
      label: 'PLC / IO rack', group: 'Automation', w: 150, h: 46,
      props: { title: 'CFA901 A1', modules: ['PS', 'CPU', 'DO', 'DI', 'AI'], alarms: [] },
      style: { fill: '#8d959e', stroke: '#1d242b', strokeWidth: 1,
               headerFill: '#4a7fb5', color: '#f2e200' },
      fields: ['title', 'modules', 'alarms', 'fill', 'stroke', 'headerFill', 'color']
    },
    netswitch: {
      label: 'Network switch', group: 'Automation', w: 22, h: 44,
      props: { ports: 8, cols: 2 },
      style: { fill: '#c9ced3', stroke: '#3d4349', strokeWidth: 1 },
      fields: ['ports', 'cols', 'fill', 'stroke']
    },
    /* Titled instrument box: VAMP relay, AVR, operator panel, drive. */
    device: {
      label: 'Field device', group: 'Automation', w: 56, h: 34,
      props: { title: 'VAMP', text: '260', glyph: 'none' },
      style: { fill: '#b9bfa8', stroke: '#1d242b', strokeWidth: 1,
               headerFill: '#4a7fb5', color: '#1d242b', fontSize: 10 },
      fields: ['title', 'text', 'glyph', 'fill', 'stroke', 'headerFill',
               'color', 'fontSize']
    },
    /* Per-cylinder bar chart: the exhaust-gas page is this one element. */
    barchart: {
      label: 'Bar chart', group: 'Automation', w: 900, h: 500,
      props: {
        bars: [], min: 0, max: 600, unit: '°C', average: null,
        alarmLine: null, shutdownLine: null, gridStep: 60, showAverage: true
      },
      style: { fill: '#00a000', stroke: '#1d242b', strokeWidth: 1,
               plotFill: '#a9b0b6', color: '#1d242b', fontSize: 11 },
      fields: ['bars', 'min', 'max', 'unit', 'average', 'alarmLine',
               'shutdownLine', 'gridStep', 'showAverage', 'fill', 'plotFill',
               'stroke', 'color', 'fontSize']
    },
    gauge: {
      label: 'Gauge bar', group: 'Symbols', w: 26, h: 90, bind: true,
      props: { min: 0, max: 100, value: 60, orientation: 'vertical', marker: null },
      style: { fill: '#2fa84f', stroke: '#c3cad2', strokeWidth: 1 },
      fields: ['min', 'max', 'value', 'orientation', 'marker', 'fill', 'stroke', 'strokeWidth']
    },
    button: {
      label: 'Button', group: 'Symbols', w: 80, h: 24,
      props: { text: 'Button', disabled: false },
      style: {
        fill: '#f6f8f9', stroke: '#c3cad2', strokeWidth: 1,
        color: '#3a4753', fontSize: 11, radius: 0
      },
      fields: ['text', 'disabled', 'fill', 'stroke', 'strokeWidth', 'color',
               'fontSize', 'radius']
    }
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function div(cls) { const d = document.createElement('div'); d.className = cls; return d; }
  function svgEl(name, attrs) {
    const n = document.createElementNS(SVG_NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ---------- plant state model -------------------------------------
     Equipment state drives colour everywhere on the HMI, so it lives
     here rather than being hardcoded per screen. Any unit can be in any
     of these at any time.                                             */
  const EQUIP_STATE = {
    running:     { body: '#00a000', trim: '#007a00', text: '#ffffff', label: 'Running' },
    stopped:     { body: '#1f4fd8', trim: '#173da8', text: '#ffffff', label: 'Stopped' },
    maintenance: { body: '#ffe000', trim: '#c9b000', text: '#1a1a00', label: 'Maintenance' },
    trip:        { body: '#e01010', trim: '#a80c0c', text: '#ffffff', label: 'Shutdown / trip' },
    unknown:     { body: '#9aa2ab', trim: '#6b7480', text: '#1d242b', label: 'Unknown' }
  };

  const BREAKER_STATE = {
    closed:  { fill: '#00a000', stroke: '#007a00', label: 'Closed' },
    open:    { fill: '#ffffff', stroke: '#5a6068', label: 'Open' },
    trip:    { fill: '#e01010', stroke: '#a80c0c', label: 'Tripped' },
    unknown: { fill: '#9aa2ab', stroke: '#6b7480', label: 'Unknown' }
  };

  /* Resolve equipment state from a bound tag. The tag may be a state
     string ("RUNNING", "MAINTENANCE"…) or a plain running boolean, so
     both wiring styles work while the real tag list is still settling. */
  function resolveState(el, tags, allowed, fallback) {
    const explicit = (el.props && el.props.state);
    const tag = lookup(el, tags);
    let v = tag ? tag.value : undefined;
    if (v === undefined || v === null) v = explicit;
    if (typeof v === 'string') {
      const k = v.toLowerCase();
      if (allowed[k]) return k;
      if (k === 'run') return 'running';
      if (k === 'stop' || k === 'off') return 'stopped';
      if (k === 'shutdown' || k === 'tripped' || k === 'fault') return 'trip';
      if (k === 'true') return allowed.running ? 'running' : 'closed';
      if (k === 'false') return allowed.running ? 'stopped' : 'open';
    }
    if (typeof v === 'boolean') return v ? (allowed.running ? 'running' : 'closed')
                                        : (allowed.running ? 'stopped' : 'open');
    if (typeof v === 'number') return v !== 0 ? (allowed.running ? 'running' : 'closed')
                                              : (allowed.running ? 'stopped' : 'open');
    return allowed[explicit] ? explicit : fallback;
  }

  /* A tank row shows a live tag when bound, else its static text. */
  function rowText(row, tags) {
    if (!row) return '';
    if (row.tag && tags) {
      const t = (tags instanceof Map) ? tags.get(row.tag) : tags[row.tag];
      if (t && t.value != null) {
        let v = t.value;
        if (typeof v === 'number') {
          const dp = row.decimals != null ? row.decimals : (Number.isInteger(v) ? 0 : 1);
          v = noNegZero(v.toFixed(dp));
        }
        const unit = row.unit === null ? '' : (row.unit || t.engineering_unit || '');
        return unit ? v + ' ' + unit : String(v);
      }
    }
    return row.text || '';
  }

  /* ---------- alarm evaluation (shared with the server) -------------
     Returns the most severe state a value sits in, so a readout can
     colour itself the same way the alarm engine classifies it.        */
  function alarmStateFor(tag) {
    if (!tag || tag.value == null) return 'normal';
    if (tag.sensor_fault) return 'fault';
    const v = Number(tag.value);
    if (Number.isNaN(v)) return 'normal';
    const sd = tag.shutdown_limits || {}, al = tag.alarm_limits || {};
    if (sd.hi != null && v >= sd.hi) return 'shutdown';
    if (sd.lo != null && v <= sd.lo) return 'shutdown';
    if (al.hihi != null && v >= al.hihi) return 'hihi';
    if (al.lolo != null && v <= al.lolo) return 'lolo';
    if (al.hi != null && v >= al.hi) return 'hi';
    if (al.lo != null && v <= al.lo) return 'lo';
    return 'normal';
  }

  const ALARM_COLOURS = {
    shutdown: { fill: '#e5484d', color: '#ffffff' },
    hihi:     { fill: '#e5484d', color: '#ffffff' },
    lolo:     { fill: '#e5484d', color: '#ffffff' },
    hi:       { fill: '#d99418', color: '#1a1005' },
    lo:       { fill: '#d99418', color: '#1a1005' },
    fault:    { fill: '#8a5cd6', color: '#ffffff' }
  };

  /* ---------- value resolution --------------------------------------
     A bound element shows the live tag value when the tag exists,
     otherwise it falls back to its static props.text. That keeps a
     screen readable before the simulation backend is wired up.        */
  function displayValue(el, tags) {
    const p = el.props || {};
    const tag = lookup(el, tags);
    if (tag && tag.value != null) {
      let v = tag.value;
      if (typeof v === 'number') {
        const dp = (p.decimals != null) ? p.decimals : inferDecimals(v);
        v = noNegZero(v.toFixed(dp));
      }
      const unit = p.unit === null ? '' : (p.unit || tag.engineering_unit || '');
      return unit ? v + ' ' + unit : String(v);
    }
    return (p.text || '') + (p.unit ? ' ' + p.unit : '');
  }
  function inferDecimals(v) { return Number.isInteger(v) ? 0 : 1; }
  function lookup(el, tags) {
    const id = el.bind && el.bind.value;
    if (!id || !tags) return null;
    return (tags instanceof Map) ? tags.get(id) : tags[id];
  }

  /* ---------- the renderer ------------------------------------------
     opts.tags     — Map or object keyed by tag_id (optional)
     opts.showAlarms — colour readouts by alarm state (runtime: yes,
                       editor: no, so styling stays predictable)       */
  function renderElement(el, opts) {
    opts = opts || {};
    const tags = opts.tags;
    const d = document.createElement('div');
    d.className = 'el';
    d.dataset.id = el.id;
    d.dataset.type = el.type;
    d.style.left = el.x + 'px';
    d.style.top = el.y + 'px';
    d.style.width = el.w + 'px';
    d.style.height = el.h + 'px';
    if (el.hidden) d.style.display = 'none';
    if (el.locked) d.classList.add('locked');

    const tagId = el.bind && el.bind.value;
    if (tagId) d.dataset.tag = tagId;

    const s = el.style || {}, p = el.props || {};
    const border = s.strokeWidth ? s.strokeWidth + 'px solid ' + (s.stroke || '#000') : 'none';

    switch (el.type) {
      case 'rect': {
        const i = div('s-rect');
        i.style.background = s.fill || 'transparent';
        i.style.border = s.strokeWidth
          ? s.strokeWidth + 'px ' + (p.dashed ? 'dashed' : 'solid') + ' ' + (s.stroke || '#000')
          : 'none';
        i.style.borderRadius = (s.radius || 0) + 'px';
        if (s.opacity != null) i.style.opacity = s.opacity;
        if (p.bevel) {
          i.style.boxShadow =
            'inset 0 2px 4px rgba(255,255,255,.35), inset 0 -3px 6px rgba(0,0,0,.28)';
        }
        d.appendChild(i); break;
      }
      case 'line': {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 's-line');
        svg.setAttribute('width', el.w);
        svg.setAttribute('height', el.h);
        const ln = document.createElementNS(SVG_NS, 'line');
        const pts = {
          'tl-br': [0, 0, el.w, el.h], 'bl-tr': [0, el.h, el.w, 0],
          'h': [0, el.h / 2, el.w, el.h / 2], 'v': [el.w / 2, 0, el.w / 2, el.h]
        }[p.dir || 'tl-br'];
        ln.setAttribute('x1', pts[0]); ln.setAttribute('y1', pts[1]);
        ln.setAttribute('x2', pts[2]); ln.setAttribute('y2', pts[3]);
        ln.setAttribute('stroke', s.stroke || '#7c8896');
        ln.setAttribute('stroke-width', s.strokeWidth || 1);
        if (p.dash) ln.setAttribute('stroke-dasharray', p.dash + ' ' + p.dash);
        svg.appendChild(ln); d.appendChild(svg); break;
      }
      case 'pipe': {
        const i = div('s-rect');
        i.style.background = s.fill || 'var(--pipe)';
        d.appendChild(i); break;
      }
      case 'shape': {
        const svg = svgEl('svg', {
          class: 's-shape', viewBox: '0 0 100 100',
          preserveAspectRatio: 'none', width: '100%', height: '100%'
        });
        const fill = s.fill || '#c9ced3';
        const stroke = s.stroke || '#3d4349';
        const sw = (s.strokeWidth ?? 1) * 1.6;      // viewBox is unit-scaled
        const base = { fill, stroke, 'stroke-width': sw, 'vector-effect': 'non-scaling-stroke' };

        switch (p.kind) {
          case 'diamond':
            svg.appendChild(svgEl('polygon', { points: '50,2 98,50 50,98 2,50', ...base }));
            break;
          case 'circle':
            svg.appendChild(svgEl('ellipse', { cx: 50, cy: 50, rx: 48, ry: 48, ...base }));
            break;
          case 'triangle-up':
            svg.appendChild(svgEl('polygon', { points: '50,2 98,98 2,98', ...base })); break;
          case 'triangle-down':
            svg.appendChild(svgEl('polygon', { points: '2,2 98,2 50,98', ...base })); break;
          case 'triangle-right':
            svg.appendChild(svgEl('polygon', { points: '2,2 98,50 2,98', ...base })); break;
          case 'triangle-left':
            svg.appendChild(svgEl('polygon', { points: '98,2 98,98 2,50', ...base })); break;
          case 'filter':
            // hatched box — an air/oil filter element
            svg.appendChild(svgEl('rect', { x: 1, y: 1, width: 98, height: 98, ...base }));
            for (let k = -100; k < 100; k += 22) {
              svg.appendChild(svgEl('line', {
                x1: k, y1: 100, x2: k + 100, y2: 0,
                stroke, 'stroke-width': sw * 0.7, 'vector-effect': 'non-scaling-stroke'
              }));
            }
            break;
              case 'monitor':
            // operator workstation — screen, stand, keyboard
            svg.appendChild(svgEl('rect', { x: 4, y: 2, width: 92, height: 60, ...base }));
            svg.appendChild(svgEl('rect', {
              x: 11, y: 9, width: 78, height: 46, fill: '#e7ebef', stroke,
              'stroke-width': sw * 0.6, 'vector-effect': 'non-scaling-stroke' }));
            svg.appendChild(svgEl('rect', { x: 42, y: 62, width: 16, height: 10, ...base }));
            svg.appendChild(svgEl('polygon', { points: '10,98 90,98 98,80 2,80', ...base }));
            break;
          case 'printer':
            svg.appendChild(svgEl('rect', { x: 20, y: 2, width: 60, height: 26, ...base }));
            svg.appendChild(svgEl('rect', { x: 2, y: 28, width: 96, height: 44, ...base }));
            svg.appendChild(svgEl('rect', {
              x: 22, y: 72, width: 56, height: 24, fill: '#e7ebef', stroke,
              'stroke-width': sw * 0.6, 'vector-effect': 'non-scaling-stroke' }));
            break;
          case 'vessel':
            // upright cylinder — dosing tank, air receiver, filter pot
            svg.appendChild(svgEl('rect', {
              x: 1, y: 1, width: 98, height: 98, rx: 22, ry: 10, ...base }));
            [14, 86].forEach(y => svg.appendChild(svgEl('line', {
              x1: 1, y1: y, x2: 99, y2: y,
              stroke, 'stroke-width': sw * 0.7, 'vector-effect': 'non-scaling-stroke'
            })));
            break;
          case 'separator': {
            // plate-pack separator — the coalescing stack with its inlet V
            svg.appendChild(svgEl('rect', { x: 1, y: 1, width: 98, height: 98, ...base }));
            [8, 16, 24, 32, 68, 76, 84, 92].forEach(x => svg.appendChild(svgEl('line', {
              x1: x, y1: 4, x2: x, y2: 96,
              stroke, 'stroke-width': sw * 0.7, 'vector-effect': 'non-scaling-stroke'
            })));
            svg.appendChild(svgEl('polyline', {
              points: '43,4 50,52 57,4', fill: 'none',
              stroke, 'stroke-width': sw * 1.4, 'vector-effect': 'non-scaling-stroke'
            }));
            break;
          }
          case 'volute':
            // pump casing — flat suction face, volute bulge on the discharge
            svg.appendChild(svgEl('path', {
              d: 'M4,6 H48 A46,44 0 0 1 48,94 H4 Z', ...base }));
            break;
          case 'exchanger':
          default:
            // heat exchanger — box with the diagonal flow line
            svg.appendChild(svgEl('rect', { x: 1, y: 1, width: 98, height: 98, ...base }));
            svg.appendChild(svgEl('line', {
              x1: 8, y1: 92, x2: 92, y2: 8,
              stroke, 'stroke-width': sw, 'vector-effect': 'non-scaling-stroke'
            }));
            break;
        }
        d.appendChild(svg); break;
      }
      case 'arrow': {
        const svg = svgEl('svg', {
          class: 's-shape', viewBox: '0 0 100 100',
          preserveAspectRatio: 'none', width: '100%', height: '100%'
        });
        const pts = {
          right: '5,5 95,50 5,95', left: '95,5 5,50 95,95',
          up: '50,5 95,95 5,95', down: '5,5 95,5 50,95'
        }[p.dir || 'right'];
        svg.appendChild(svgEl('polygon', { points: pts, fill: s.fill || 'var(--pipe)' }));
        d.appendChild(svg); break;
      }
      case 'text': {
        const i = div('s-text');
        i.textContent = p.text || '';
        i.style.color = s.color || 'var(--text)';
        i.style.fontSize = (s.fontSize || 11) + 'px';
        i.style.fontWeight = s.bold ? '700' : '400';
        i.style.justifyContent =
          { left: 'flex-start', center: 'center', right: 'flex-end' }[s.align || 'left'];
        d.appendChild(i); break;
      }
      case 'readout': {
        const i = div('s-readout');
        i.textContent = displayValue(el, tags);
        i.style.background = s.fill || 'var(--bg-field)';
        i.style.border = border;
        i.style.borderRadius = (s.radius || 0) + 'px';
        i.style.color = s.color || 'var(--text-bright)';
        i.style.fontSize = (s.fontSize || 11) + 'px';
        i.style.fontWeight = s.bold ? '700' : '400';
        i.style.justifyContent =
          { left: 'flex-start', center: 'center', right: 'flex-end' }[s.align || 'center'];
        if (opts.showAlarms) {
          const state = alarmStateFor(lookup(el, tags));
          const c = ALARM_COLOURS[state];
          if (c) {
            i.style.background = c.fill;
            i.style.color = c.color;
            d.dataset.alarm = state;
          }
        }
        d.appendChild(i); break;
      }
      case 'led': {
        const i = div('s-led');
        let fill = s.fill || 'var(--green)';
        if (opts.showAlarms) {
          const tag = lookup(el, tags);
          if (tag) {
            if (tag.data_type === 'digital') {
              /* A digital LED means different things in different places —
                 "Remote permit" true is healthy, "Emergency stop" true is
                 not. So the element says which state is which rather than
                 the renderer guessing: onColor when the tag is true,
                 offColor when false. Defaults keep true = the styled
                 colour, which reads as healthy. */
              const on = tag.value === true || tag.value === 1 ||
                         tag.value === 'ON' || tag.value === 'TRUE';
              fill = on
                ? (p.onColor || s.fill || 'var(--green)')
                : (p.offColor || '#9aa2ab');
            } else {
              const c = ALARM_COLOURS[alarmStateFor(tag)];
              if (c) fill = c.fill;
            }
          }
        }
        i.style.background = fill;
        i.style.border = border;
        i.style.borderRadius = (p.shape === 'square') ? '1px' : '50%';
        d.appendChild(i); break;
      }
      case 'pump': {
        const i = div('s-pump');
        const running = resolveBool(el, tags, p.running, opts);
        const col = running ? (s.stroke || 'var(--green)') : 'var(--border-light)';
        i.style.background = s.fill || 'var(--bg-panel)';
        i.style.border = (s.strokeWidth || 2) + 'px solid ' + col;
        const t = div('tri');
        t.style.borderLeft = '6px solid ' + col;
        i.appendChild(t); d.appendChild(i); break;
      }
      case 'valve': {
        const i = div('s-valve');
        const open = resolveBool(el, tags, p.open, opts);
        i.style.background = open ? (s.fill || 'var(--green)') : 'var(--text-dim)';
        d.appendChild(i); break;
      }
      /* A whole vessel in one element: gable roof with its vent, the
         stacked readout rows, the level column with its two switches,
         capacity, and the name plate. Rows are data (props.rows), so a
         3-row day tank and a 5-row storage tank are the same symbol. */
      case 'tank': {
        const i = div('s-tank');
        const rows = Array.isArray(p.rows) ? p.rows : [];
        const shell = s.fill || '#9aa2ab';

        const roof = div('tk-roof');
        roof.style.background = shell;
        i.appendChild(roof);
        const vent = div('tk-vent');
        vent.style.borderColor = s.stroke || '#3d4349';
        i.appendChild(vent);

        const body = div('tk-body');
        body.style.background = shell;
        body.style.border = '1px solid ' + (s.stroke || '#3d4349');

        const rowWrap = div('tk-rows');
        rows.forEach(r => {
          const rd = div('tk-row');
          rd.textContent = rowText(r, tags);
          if (r.tag) rd.dataset.tag = r.tag;
          rowWrap.appendChild(rd);
        });
        body.appendChild(rowWrap);

        if (p.capacity) {
          const cap = div('tk-cap');
          cap.textContent = p.capacity;
          body.appendChild(cap);
        }

        // level column — red fill, the way the real page draws it
        const col = div('tk-level');
        const tag = lookup(el, tags);
        const lvl = (tag && typeof tag.value === 'number') ? tag.value : (p.level || 0);
        const fill = div('tk-fill');
        fill.style.height = Math.max(0, Math.min(100, lvl)) + '%';
        col.appendChild(fill);
        body.appendChild(col);
        i.appendChild(body);

        if (p.switches !== false) {
          ['tk-lsh', 'tk-lsl'].forEach(cls => {
            const sw = div('tk-lsw ' + cls);
            sw.textContent = 'L';
            i.appendChild(sw);
          });
        }

        if (p.label || p.plate) {
          const nm = div('tk-name');
          nm.textContent = [p.label, p.plate].filter(Boolean).join('\n');
          i.appendChild(nm);
        }
        d.appendChild(i); break;
      }

      /* The genset drawn as it appears on the real HMI: turbo end, engine
         block with head/liner/crankcase detail, coupling, and alternator
         carrying the unit number. Colour is the state, not a boolean —
         any unit can be running, stopped, on maintenance or tripped. */
      case 'engine': {
        const state = resolveState(el, tags, EQUIP_STATE, p.state || 'running');
        const c = EQUIP_STATE[state] || EQUIP_STATE.unknown;
        const cyl = Math.max(4, Math.min(12, p.cylinders || 9));

        const svg = svgEl('svg', {
          class: 's-enginesvg', viewBox: '0 0 200 72',
          preserveAspectRatio: 'none', width: '100%', height: '100%'
        });
        const g = svgEl('g', {});
        const put = (n, a) => g.appendChild(svgEl(n, a));

        // skid
        put('rect', { x: 4, y: 62, width: 192, height: 8, fill: c.body, stroke: c.trim });
        // turbocharger stack at the non-driving end
        put('rect', { x: 6, y: 22, width: 14, height: 14, fill: c.body, stroke: c.trim });
        put('rect', { x: 10, y: 14, width: 8, height: 8, fill: c.body, stroke: c.trim });
        put('rect', { x: 4, y: 36, width: 20, height: 14, fill: c.body, stroke: c.trim });
        put('polygon', { points: '24,50 24,62 14,62', fill: c.body, stroke: c.trim });
        // engine block
        put('rect', { x: 24, y: 20, width: 96, height: 42, fill: c.body, stroke: c.trim });
        put('rect', { x: 118, y: 26, width: 12, height: 30, fill: c.body, stroke: c.trim });
        // cylinder heads, liners, crankcase doors
        const step = 88 / cyl;
        for (let k = 0; k < cyl; k++) {
          const x = 28 + k * step;
          put('rect', { x, y: 22, width: step - 2.5, height: 9, fill: '#c9ced3', stroke: c.trim });
          put('rect', { x, y: 36, width: step - 2.5, height: 6, fill: '#c9ced3', stroke: c.trim });
          put('circle', { cx: x + (step - 2.5) / 2, cy: 52, r: 3.6,
            fill: '#c9ced3', stroke: c.trim });
        }
        // coupling + alternator
        put('rect', { x: 130, y: 38, width: 8, height: 12, fill: c.body, stroke: c.trim });
        put('rect', { x: 138, y: 24, width: 54, height: 38, fill: c.body, stroke: c.trim });
        put('rect', { x: 152, y: 16, width: 26, height: 10, fill: c.body, stroke: c.trim });
        put('rect', { x: 141, y: 30, width: 12, height: 26, fill: '#c9ced3', stroke: c.trim });
        put('rect', { x: 177, y: 30, width: 12, height: 26, fill: '#c9ced3', stroke: c.trim });
        put('rect', { x: 192, y: 36, width: 6, height: 14, fill: c.body, stroke: c.trim });

        if (p.text) {
          const t = svgEl('text', {
            x: 165, y: 48, 'text-anchor': 'middle',
            'font-size': 17, 'font-weight': '700', fill: c.text,
            'font-family': 'Segoe UI, Arial, sans-serif'
          });
          t.textContent = p.text;
          g.appendChild(t);
        }
        svg.appendChild(g);
        d.appendChild(svg);
        d.dataset.state = state;
        d.title = (p.text ? 'Genset ' + p.text + ' — ' : '') + c.label;
        break;
      }
      case 'turbo': {
        const i = div('s-turbo');
        i.style.background = s.fill || '#e7ebef';
        i.style.border = border;
        const running = resolveBool(el, tags, p.running, opts);
        const col = running ? 'var(--green)' : '#9aa2ab';
        for (let k = 0; k < 2; k++) {
          const c = document.createElement('i');
          c.style.background = 'linear-gradient(180deg, ' + col + ' 50%, #d3d8dd 50%)';
          i.appendChild(c);
        }
        d.appendChild(i); break;
      }
      case 'breaker': {
        const i = div('s-brk');
        const state = resolveState(el, tags, BREAKER_STATE,
          p.state || (p.closed === false ? 'open' : 'closed'));
        const b = BREAKER_STATE[state] || BREAKER_STATE.unknown;
        i.style.background = b.fill;
        i.style.border = (s.strokeWidth || 1) + 'px solid ' + b.stroke;
        d.appendChild(i);
        d.dataset.state = state;
        d.title = 'Breaker — ' + b.label;
        break;
      }
      /* Protection relay / power meter face. */
      case 'relay': {
        const svg = svgEl('svg', {
          class: 's-shape', viewBox: '0 0 100 120',
          preserveAspectRatio: 'none', width: '100%', height: '100%'
        });
        const fill = s.fill || '#c9ced3', stroke = s.stroke || '#3d4349';
        const line = { stroke, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' };
        svg.appendChild(svgEl('rect', { x: 3, y: 3, width: 94, height: 114,
          fill, ...line }));
        svg.appendChild(svgEl('rect', { x: 12, y: 14, width: 76, height: 34,
          fill: '#eceff1', ...line }));
        // keypad — a meter has more buttons than a protection relay
        const cols = p.kind === 'meter' ? 4 : 3;
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < cols; c++) {
            svg.appendChild(svgEl('rect', {
              x: 14 + c * (74 / cols), y: 58 + r * 26,
              width: 74 / cols - 8, height: 18,
              fill: '#8a929b', stroke, 'stroke-width': 1,
              'vector-effect': 'non-scaling-stroke'
            }));
          }
        }
        d.appendChild(svg); break;
      }

      /* Two-winding transformer. */
      case 'transformer': {
        const svg = svgEl('svg', {
          class: 's-shape', viewBox: '0 0 100 140',
          preserveAspectRatio: 'none', width: '100%', height: '100%'
        });
        const attrs = {
          fill: s.fill && s.fill !== 'transparent' ? s.fill : 'none',
          stroke: s.stroke || '#3d4349',
          'stroke-width': s.strokeWidth || 2,
          'vector-effect': 'non-scaling-stroke'
        };
        svg.appendChild(svgEl('circle', { cx: 50, cy: 44, r: 40, ...attrs }));
        svg.appendChild(svgEl('circle', { cx: 50, cy: 96, r: 40, ...attrs }));
        d.appendChild(svg); break;
      }

      /* Isolator with its earthing switch — open blade unless closed. */
      case 'isolator': {
        const svg = svgEl('svg', {
          class: 's-shape', viewBox: '0 0 100 100',
          preserveAspectRatio: 'none', width: '100%', height: '100%'
        });
        const closed = resolveBool(el, tags, p.closed, opts);
        const line = {
          stroke: s.stroke || '#3d4349', 'stroke-width': s.strokeWidth || 2,
          'vector-effect': 'non-scaling-stroke', fill: 'none'
        };
        svg.appendChild(svgEl('line', { x1: 20, y1: 0, x2: 20, y2: 32, ...line }));
        // the blade stands off when open, meets the contact when closed
        svg.appendChild(svgEl('line', {
          x1: 20, y1: 32, x2: closed ? 20 : 56, y2: closed ? 74 : 34, ...line
        }));
        svg.appendChild(svgEl('line', { x1: 6, y1: 74, x2: 34, y2: 74, ...line }));
        svg.appendChild(svgEl('line', { x1: 20, y1: 74, x2: 20, y2: 100, ...line }));
        if (p.earth !== false) {
          svg.appendChild(svgEl('line', { x1: 60, y1: 52, x2: 92, y2: 52, ...line }));
          svg.appendChild(svgEl('line', { x1: 66, y1: 62, x2: 86, y2: 62, ...line }));
          svg.appendChild(svgEl('line', { x1: 72, y1: 72, x2: 80, y2: 72, ...line }));
          svg.appendChild(svgEl('line', { x1: 76, y1: 34, x2: 76, y2: 52, ...line }));
        }
        d.appendChild(svg);
        d.dataset.state = closed ? 'closed' : 'open';
        break;
      }

      case 'gauge': {
        const i = div('s-gauge');
        i.style.background = 'var(--bg-field)';
        i.style.border = border;
        const tag = lookup(el, tags);
        const raw = (opts.showAlarms && tag && typeof tag.value === 'number')
          ? tag.value : Number(p.value || 0);
        const min = Number(p.min ?? 0), max = Number(p.max ?? 100);
        const pct = Math.max(0, Math.min(100, ((raw - min) / ((max - min) || 1)) * 100));
        const fill = div('gfill');
        fill.style.background = s.fill || 'var(--green)';
        if (p.orientation === 'horizontal') {
          fill.style.left = '0'; fill.style.bottom = '0'; fill.style.top = '0';
          fill.style.width = pct + '%'; fill.style.height = 'auto';
        } else {
          fill.style.left = '0'; fill.style.right = '0'; fill.style.bottom = '0';
          fill.style.height = pct + '%';
        }
        i.appendChild(fill);
        // the amber line is the max-available marker on P/Active Power
        if (p.marker != null) {
          const mPct = Math.max(0, Math.min(100,
            ((Number(p.marker) - min) / ((max - min) || 1)) * 100));
          const mk = div('gmark');
          if (p.orientation === 'horizontal') { mk.style.left = mPct + '%'; mk.style.top = '0';
            mk.style.bottom = '0'; mk.style.width = '2px'; }
          else { mk.style.bottom = mPct + '%'; mk.style.left = '0'; mk.style.right = '0';
            mk.style.height = '2px'; }
          i.appendChild(mk);
        }
        d.appendChild(i); break;
      }
      case 'button': {
        const i = div('s-btn');
        i.textContent = p.text || '';
        i.style.background = s.fill || 'var(--bg-field)';
        i.style.border = border;
        i.style.borderRadius = (s.radius || 0) + 'px';
        // a command the operator may not give right now is drawn greyed,
        // the way the real page greys Start while the pump is running
        i.style.color = p.disabled ? '#9aa2ab' : (s.color || 'var(--text)');
        i.style.fontSize = (s.fontSize || 11) + 'px';
        d.appendChild(i); break;
      }
      /* A PLC or IO rack: name plate over a row of module cards, each
         card carrying its type letters stacked vertically (PS, CPU, DI,
         AO …). The module list is data, so a 13-slot rack and a 5-slot
         rack are the same element with a different array. */
      case 'iorack': {
        const mods = Array.isArray(p.modules) ? p.modules : [];
        const bad = new Set((p.alarms || []).map(Number));
        const i = div('s-iorack');
        i.style.border = '1px solid ' + (s.stroke || '#1d242b');

        const head = div('ior-head');
        head.textContent = p.title || '';
        head.style.background = s.headerFill || '#4a7fb5';
        i.appendChild(head);

        const body = div('ior-body');
        body.style.background = s.fill || '#8d959e';
        mods.forEach((m, k) => {
          const card = div('ior-mod' + (bad.has(k) ? ' alarm' : ''));
          card.style.color = bad.has(k) ? '#ffffff' : (s.color || '#f2e200');
          String(m).split('').forEach(ch => {
            const l = div('ior-ch');
            l.textContent = ch;
            card.appendChild(l);
          });
          body.appendChild(card);
        });
        i.appendChild(body);
        d.appendChild(i); break;
      }
      /* Ethernet switch / IO module — a card with its port dots. */
      case 'netswitch': {
        const i = div('s-netswitch');
        i.style.background = s.fill || '#c9ced3';
        i.style.border = '1px solid ' + (s.stroke || '#3d4349');
        const grid = div('nsw-grid');
        grid.style.gridTemplateColumns = 'repeat(' + Math.max(1, p.cols || 2) + ', 1fr)';
        for (let k = 0; k < Math.max(0, p.ports || 0); k++) grid.appendChild(div('nsw-port'));
        i.appendChild(grid);
        d.appendChild(i); break;
      }
      /* Titled instrument box — VAMP relay, AVR, operator panel, drive. */
      case 'device': {
        const i = div('s-device');
        i.style.background = s.fill || '#b9bfa8';
        i.style.border = '1px solid ' + (s.stroke || '#1d242b');
        i.style.fontSize = (s.fontSize || 10) + 'px';
        if (p.title) {
          const h = div('dev-head');
          h.textContent = p.title;
          h.style.background = s.headerFill || '#4a7fb5';
          i.appendChild(h);
        }
        if (p.glyph && p.glyph !== 'none') {
          const g = div('dev-glyph');
          g.textContent = { wave: '∿∿', keys: '⠿', trend: '📈' }[p.glyph] || '';
          i.appendChild(g);
        }
        if (p.text) {
          const t = div('dev-text');
          t.textContent = p.text;
          t.style.color = s.color || '#1d242b';
          i.appendChild(t);
        }
        d.appendChild(i); break;
      }
      /* Per-cylinder bar chart. Bars read their own tags, so the same
         element serves the exhaust page live and in the editor. */
      case 'barchart': {
        const bars = Array.isArray(p.bars) ? p.bars : [];
        const min = Number(p.min ?? 0), max = Number(p.max ?? 100);
        const span = (max - min) || 1;
        const vals = bars.map(b => {
          const t = (opts.showAlarms && b.tag && tags) ? tags[b.tag] : null;
          return (t && typeof t.value === 'number') ? t.value : Number(b.value || 0);
        });
        const avg = p.average != null ? Number(p.average)
          : (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
        const pct = v => Math.max(0, Math.min(100, ((v - min) / span) * 100));

        const i = div('s-barchart');
        i.style.fontSize = (s.fontSize || 11) + 'px';
        i.style.color = s.color || '#1d242b';

        const plot = div('bc-plot');
        plot.style.background = s.plotFill || '#a9b0b6';
        plot.style.border = '1px solid ' + (s.stroke || '#1d242b');

        // the band above the shutdown line is lighter — it is the zone
        // the operator must never see a bar reach
        if (p.shutdownLine != null) {
          const danger = div('bc-danger');
          danger.style.height = (100 - pct(Number(p.shutdownLine))) + '%';
          plot.appendChild(danger);
        }
        const step = Number(p.gridStep || 0);
        if (step > 0) {
          for (let v = min + step; v < max; v += step) {
            const g = div('bc-grid');
            g.style.bottom = pct(v) + '%';
            plot.appendChild(g);
          }
        }
        [['alarm', p.alarmLine], ['shutdown', p.shutdownLine]].forEach(([cls, v]) => {
          if (v == null) return;
          const l = div('bc-limit ' + cls);
          l.style.bottom = pct(Number(v)) + '%';
          plot.appendChild(l);
        });

        const cols = div('bc-cols');
        bars.forEach((b, k) => {
          const col = div('bc-col');
          const bar = div('bc-bar');
          bar.style.height = pct(vals[k]) + '%';
          bar.style.background = s.fill || '#00a000';
          if (b.tag) bar.dataset.tag = b.tag;
          col.appendChild(bar);
          cols.appendChild(col);
        });
        plot.appendChild(cols);

        if (p.showAverage !== false) {
          const a = div('bc-avg');
          a.style.bottom = pct(avg) + '%';
          plot.appendChild(a);
        }
        i.appendChild(plot);

        const axis = div('bc-axis');
        bars.forEach(b => {
          const l = div('bc-tick');
          l.textContent = b.label || '';
          axis.appendChild(l);
        });
        i.appendChild(axis);
        d.appendChild(i); break;
      }
      /* Lettered circle. Colour follows a bound digital when there is one,
         so an S bubble goes red on its alarm and an M goes green when the
         motor runs — which of those it means is props.onState. */
      case 'bubble': {
        const st = BUBBLE_STATE[bubbleStateFor(el, tags, p, opts)] || {};
        const i = div('s-bubble');
        i.style.background = st.fill || s.fill || '#ffffff';
        i.style.border = (s.strokeWidth ?? 1.5) + 'px solid ' + (s.stroke || '#1d242b');
        i.style.color = st.color || s.color || '#1d242b';
        i.style.fontSize = (s.fontSize || 11) + 'px';
        i.style.fontWeight = s.bold === false ? '400' : '700';
        i.textContent = p.text || '';
        d.appendChild(i); break;
      }
    }
    return d;
  }

  /* Bubble colours. `normal` keeps whatever the style says, so an author
     can draw a grey process bubble without fighting the state map. */
  const BUBBLE_STATE = {
    normal: {},
    active: { fill: '#00a000', color: '#ffffff' },
    alarm:  { fill: '#e01010', color: '#ffffff' },
    warn:   { fill: '#ffe000', color: '#1a1a00' }
  };

  function bubbleStateFor(el, tags, p, opts) {
    const base = p.state || 'normal';
    if (!opts || !opts.showAlarms) return base;
    const tag = lookup(el, tags);
    if (!tag || tag.value == null) return base;
    if (typeof tag.value === 'string' && BUBBLE_STATE[tag.value.toLowerCase()]) {
      return tag.value.toLowerCase();
    }
    return resolveBool(el, tags, false, opts) ? (p.onState || 'alarm') : base;
  }

  /* A deviation of -0.4 rounds to "-0", which reads as a fault on a
     page whose whole point is the sign of the number. */
  function noNegZero(str) { return /^-0(\.0*)?$/.test(str) ? str.slice(1) : str; }

  /* A boolean-ish symbol prefers its bound digital tag at runtime and
     falls back to the static prop when unbound or in the editor. */
  function resolveBool(el, tags, fallback, opts) {
    if (!opts || !opts.showAlarms) return !!fallback;
    const tag = lookup(el, tags);
    if (!tag || tag.value == null) return !!fallback;
    const v = tag.value;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return ['ON', 'TRUE', 'RUN', 'RUNNING', 'OPEN', 'CLOSED', 'AUTO']
      .includes(v.toUpperCase());
    return !!fallback;
  }

  /* ---------- whole-screen render ----------------------------------- */
  function renderScreen(container, screen, opts) {
    opts = opts || {};
    container.innerHTML = '';
    container.style.width = screen.canvas.width + 'px';
    container.style.height = screen.canvas.height + 'px';
    if (screen.canvas.background) container.style.background = screen.canvas.background;
    const frag = document.createDocumentFragment();
    (screen.elements || []).forEach(el => frag.appendChild(renderElement(el, opts)));
    container.appendChild(frag);
    return container;
  }

  /* Update only what changed — avoids rebuilding the DOM every tick. */
  function updateBoundValues(container, screen, tags, opts) {
    opts = Object.assign({ showAlarms: true }, opts || {}, { tags });
    (screen.elements || []).forEach(el => {
      if (!el.bind || !el.bind.value) return;
      const node = container.querySelector('.el[data-id="' + el.id + '"]');
      if (!node) return;
      const fresh = renderElement(el, opts);
      node.replaceWith(fresh);
    });
  }

  global.Scada = {
    TYPES, renderElement, renderScreen, updateBoundValues,
    displayValue, alarmStateFor, ALARM_COLOURS
  };
})(window);
