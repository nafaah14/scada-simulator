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
      label: 'Tank', group: 'Symbols', w: 80, h: 70, bind: true,
      props: { level: 60, caption: '' },
      style: { fill: '#ffffff', stroke: '#c3cad2', strokeWidth: 1 },
      fields: ['level', 'caption', 'fill', 'stroke', 'strokeWidth']
    },
    engine: {
      label: 'Engine block', group: 'Symbols', w: 64, h: 24, bind: true,
      props: { running: true, text: '' },
      style: { fontSize: 11 },
      fields: ['running', 'text', 'fontSize']
    },
    turbo: {
      label: 'Turbocharger', group: 'Symbols', w: 24, h: 44, bind: true,
      props: { running: true },
      style: { fill: '#e7ebef', stroke: '#5a6068', strokeWidth: 1 },
      fields: ['running', 'fill', 'stroke', 'strokeWidth']
    },
    breaker: {
      label: 'Breaker', group: 'Symbols', w: 14, h: 14, bind: true,
      props: { closed: true },
      style: { fill: '#2fa84f', stroke: '#1c6b32', strokeWidth: 1 },
      fields: ['closed', 'fill', 'stroke', 'strokeWidth']
    },
    gauge: {
      label: 'Gauge bar', group: 'Symbols', w: 26, h: 90, bind: true,
      props: { min: 0, max: 100, value: 60, orientation: 'vertical', marker: null },
      style: { fill: '#2fa84f', stroke: '#c3cad2', strokeWidth: 1 },
      fields: ['min', 'max', 'value', 'orientation', 'marker', 'fill', 'stroke', 'strokeWidth']
    },
    button: {
      label: 'Button', group: 'Symbols', w: 80, h: 24,
      props: { text: 'Button' },
      style: {
        fill: '#f6f8f9', stroke: '#c3cad2', strokeWidth: 1,
        color: '#3a4753', fontSize: 11, radius: 0
      },
      fields: ['text', 'fill', 'stroke', 'strokeWidth', 'color', 'fontSize', 'radius']
    }
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function div(cls) { const d = document.createElement('div'); d.className = cls; return d; }

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
        v = v.toFixed(dp);
      }
      const unit = p.unit || tag.engineering_unit || '';
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
      case 'tank': {
        const i = div('s-tank');
        i.style.background = s.fill || 'var(--bg-panel)';
        i.style.border = border;
        i.appendChild(div('roof'));
        const fill = div('fillbar');
        const tag = lookup(el, tags);
        const lvl = (opts.showAlarms && tag && typeof tag.value === 'number')
          ? tag.value : (p.level || 0);
        fill.style.height = Math.max(0, Math.min(100, lvl)) + '%';
        i.appendChild(fill);
        if (p.caption) { const c = div('cap'); c.textContent = p.caption; i.appendChild(c); }
        d.appendChild(i); break;
      }
      case 'engine': {
        const i = div('s-engine');
        const running = resolveBool(el, tags, p.running, opts);
        const a = running ? '#2fa84f' : '#3f8fce';
        const b = running ? '#218040' : '#2c6ea0';
        i.style.background =
          'repeating-linear-gradient(90deg,' + a + ',' + a + ' 5px,' + b + ' 5px,' + b + ' 10px)';
        i.style.fontSize = (s.fontSize || 11) + 'px';
        i.textContent = p.text || '';
        d.appendChild(i); break;
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
        const closed = resolveBool(el, tags, p.closed, opts);
        i.style.background = closed ? (s.fill || 'var(--green)') : 'var(--bg-field)';
        i.style.border = (s.strokeWidth || 1) + 'px solid ' +
          (closed ? (s.stroke || '#1c6b32') : 'var(--border-light)');
        d.appendChild(i); break;
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
        i.style.color = s.color || 'var(--text)';
        i.style.fontSize = (s.fontSize || 11) + 'px';
        d.appendChild(i); break;
      }
    }
    return d;
  }

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
