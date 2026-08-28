/* =====================================================================
   SCADA DATA ACCESS
   ---------------------------------------------------------------------
   One data layer for both the editor and the app shell, with three modes:

     live      — the Node backend is reachable: REST for config,
                 WebSocket for streaming tag values and alarms.
     simulated — no tick server, but the page runs the *same* simulation
                 and alarm engine locally (shared/simulation.js and
                 shared/alarm-engine.js). This is what static hosting
                 like Cloudflare Pages gets: every viewer gets their own
                 independent plant, which suits training — one trainee
                 breaking things doesn't disturb another.
     static    — simulation could not be started; render the committed
                 snapshot and don't tick.

   Screen persistence is separate from all of this: `apiScreens` is set
   when *some* screen API exists (the Node server, or Cloudflare Pages
   Functions), and saving then writes server-side rather than to
   localStorage.

   Mode is detected once at startup, so the same pages work in all cases.
   ===================================================================== */
(function (global) {
  'use strict';

  const LS_SCREENS = 'scada.editor.screens.v1';

  const Store = {
    mode: 'static',          // 'live' | 'simulated' | 'static'
    apiScreens: false,       // a screen API exists (Node server or Pages Functions)
    base: '',                // API base, e.g. '' when same-origin
    root: '..',              // path to scada-project/ from the calling page
    tags: new Map(),
    screenIndex: [],
    _socket: null,
    _sim: null,
    _alarms: null,
    _simTimer: null,
    _listeners: { tags: [], alarms: [], status: [] }
  };

  /* ---------- boot -------------------------------------------------- */
  Store.init = async function (opts) {
    Object.assign(Store, opts || {});

    // Which backend, if any, is answering?
    let health = null;
    try {
      const res = await fetch(Store.base + '/api/health', { cache: 'no-store' });
      if (res.ok) health = await res.json();
    } catch (e) { /* no backend at all */ }

    if (health) {
      // Only route screen writes to the API if that API can actually store
      // them — Pages Functions without a KV binding report screens:false,
      // and we fall back to localStorage rather than failing every save.
      Store.apiScreens = health.screens !== false;
      // The Node server ticks; Pages Functions cannot, and say so.
      Store.mode = health.ticks === false ? 'simulated' : 'live';
    }

    await Store.loadTags();
    await Store.loadScreenIndex();

    // The editor passes simulate:false — values shifting under the cursor
    // while you position elements is a distraction, not a feature.
    if (Store.mode !== 'live' && Store.simulate !== false) {
      const ok = await Store.startLocalSimulation();
      Store.mode = ok ? 'simulated' : 'static';
    }

    emit('status', { mode: Store.mode, apiScreens: Store.apiScreens });
    return Store.mode;
  };

  /* ---------- browser-side simulation --------------------------------
     Uses the same engine modules the server runs, so behaviour and alarm
     rules can't drift between hosted and local.                        */
  Store.startLocalSimulation = async function (opts) {
    if (Store._simTimer) return true;
    if (!Store.tags.size) return false;
    try {
      const [{ Simulation }, { AlarmEngine }] = await Promise.all([
        import(Store.root + '/shared/simulation.js'),
        import(Store.root + '/shared/alarm-engine.js')
      ]);

      const tickMs = (opts && opts.tickMs) || 1000;
      const tagSource = {
        all: () => [...Store.tags.values()],
        get: id => Store.tags.get(id)
      };

      Store._sim = new Simulation(tagSource, { tickMs });
      Store._sim.init((opts && opts.units) || undefined);   // default: all six
      Store._alarms = new AlarmEngine(tagSource);

      Store._simTimer = setInterval(() => {
        const changed = Store._sim.tick();
        if (changed.length) emit('tags', changed);
        const events = Store._alarms.scan();
        if (events.length) emit('alarms', Store._alarms.activeList());
      }, tickMs);
      return true;
    } catch (e) {
      console.warn('[store] local simulation unavailable:', e.message);
      return false;
    }
  };

  Store.stopLocalSimulation = function () {
    if (Store._simTimer) clearInterval(Store._simTimer);
    Store._simTimer = null;
  };

  /* ---------- tags -------------------------------------------------- */
  Store.loadTags = async function () {
    // the expanded runtime set first, then the authored file as a fallback
    const urls = Store.mode === 'live'
      ? [Store.base + '/api/tags']
      : [Store.root + '/data/tags/tags.generated.json',
         Store.root + '/data/tags/genset-tags.json'];
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const list = await res.json();
        Store.tags = new Map(list.map(t => [t.tag_id, t]));
        return Store.tags;
      } catch (e) { /* try the next source */ }
    }
    console.warn('[store] no tag database could be loaded');
    Store.tags = new Map();
    return Store.tags;
  };

  Store.getTag = id => Store.tags.get(id);

  Store.updateLimits = async function (tagId, patch) {
    if (Store.mode !== 'live') {
      // applies to this browser's own simulation
      const t = Store.tags.get(tagId);
      if (t) {
        if (patch.alarm_limits) t.alarm_limits = { ...t.alarm_limits, ...patch.alarm_limits };
        if (patch.shutdown_limits) t.shutdown_limits = { ...t.shutdown_limits, ...patch.shutdown_limits };
        if (patch.sensor_fault !== undefined) t.sensor_fault = !!patch.sensor_fault;
      }
      return t;
    }
    const res = await fetch(Store.base + '/api/tags/' + encodeURIComponent(tagId) + '/limits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error('Could not save limits (HTTP ' + res.status + ')');
    const updated = await res.json();
    Store.tags.set(updated.tag_id, updated);
    return updated;
  };

  /* ---------- screens ----------------------------------------------- */
  Store.loadScreenIndex = async function () {
    if (Store.apiScreens) {
      try {
        const res = await fetch(Store.base + '/api/screens', { cache: 'no-store' });
        if (res.ok) {
          Store.screenIndex = await res.json();
          return Store.screenIndex;
        }
      } catch (e) { console.warn('[store] screen index:', e.message); }
    }
    try {
      const res = await fetch(Store.root + '/data/screens-v2/index.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      Store.screenIndex = await res.json();
    } catch (e) {
      console.warn('[store] no screen index:', e.message);
      Store.screenIndex = [];
    }
    // locally-edited screens still show up when there's no backend
    Object.values(localScreens()).forEach(doc => {
      if (!Store.screenIndex.some(s => s.screen_id === doc.screen_id)) {
        Store.screenIndex.push({ screen_id: doc.screen_id, title: doc.title, local: true });
      }
    });
    return Store.screenIndex;
  };

  Store.loadScreen = async function (screenId) {
    if (Store.apiScreens) {
      const res = await fetch(Store.base + '/api/screens/' + encodeURIComponent(screenId),
        { cache: 'no-store' });
      if (res.ok) return await res.json();
    }
    const local = localScreens()[screenId];
    if (local) return local;
    const entry = Store.screenIndex.find(s => s.screen_id === screenId);
    const file = (entry && entry.file) || fileNameFor(screenId);
    const res = await fetch(Store.root + '/data/screens-v2/' + file, { cache: 'no-store' });
    if (!res.ok) throw new Error('Screen "' + screenId + '" not found');
    return await res.json();
  };

  Store.saveScreen = async function (doc) {
    if (Store.apiScreens) {
      const res = await fetch(Store.base + '/api/screens/' + encodeURIComponent(doc.screen_id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error('Save failed (HTTP ' + res.status + ') ' + detail.slice(0, 120));
      }
      const body = await res.json().catch(() => ({}));
      return { where: body.where || 'server' };
    }
    const all = localScreens();
    all[doc.screen_id] = doc;
    localStorage.setItem(LS_SCREENS, JSON.stringify(all));
    return { where: 'browser' };
  };

  Store.deleteScreen = async function (screenId) {
    if (Store.apiScreens) {
      await fetch(Store.base + '/api/screens/' + encodeURIComponent(screenId), { method: 'DELETE' });
    }
    const all = localScreens();
    delete all[screenId];
    localStorage.setItem(LS_SCREENS, JSON.stringify(all));
  };

  function localScreens() {
    try { return JSON.parse(localStorage.getItem(LS_SCREENS) || '{}'); }
    catch (e) { return {}; }
  }
  function fileNameFor(id) { return id.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json'; }

  /* ---------- commands ---------------------------------------------- */
  Store.sendCommand = async function (tagId, value) {
    if (Store.mode !== 'live') {
      const t = Store.tags.get(tagId);
      if (t) t.value = value;
      emit('tags', [{ tag_id: tagId, value }]);
      return;
    }
    await fetch(Store.base + '/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId, value })
    });
  };

  /* ---------- live stream ------------------------------------------- */
  Store.connect = function () {
    if (Store.mode !== 'live' || Store._socket) return;   // simulated mode ticks locally
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = Store.base
      ? Store.base.replace(/^http/, 'ws') + '/ws'
      : proto + '//' + location.host + '/ws';
    let retry = 0;

    const open = () => {
      const ws = new WebSocket(url);
      Store._socket = ws;

      ws.addEventListener('open', () => {
        retry = 0;
        emit('status', { mode: 'live', connected: true });
      });

      ws.addEventListener('message', ev => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (msg.type === 'tags') {
          msg.data.forEach(u => {
            const t = Store.tags.get(u.tag_id);
            if (t) Object.assign(t, u); else Store.tags.set(u.tag_id, u);
          });
          emit('tags', msg.data);
        } else if (msg.type === 'alarms') {
          emit('alarms', msg.data);
        }
      });

      ws.addEventListener('close', () => {
        Store._socket = null;
        emit('status', { mode: 'live', connected: false });
        retry = Math.min(retry + 1, 6);
        setTimeout(open, 500 * Math.pow(2, retry));   // back off, keep trying
      });

      ws.addEventListener('error', () => ws.close());
    };
    open();
  };

  /* ---------- events ------------------------------------------------- */
  Store.on = function (evt, fn) {
    (Store._listeners[evt] = Store._listeners[evt] || []).push(fn);
    return Store;
  };
  function emit(evt, payload) {
    (Store._listeners[evt] || []).forEach(fn => {
      try { fn(payload); } catch (e) { console.error('[store] listener error', e); }
    });
  }

  /* ---------- alarms ------------------------------------------------- */
  Store.getAlarms = async function () {
    if (Store._alarms) return Store._alarms.activeList();
    if (Store.mode !== 'live') return [];
    try {
      const res = await fetch(Store.base + '/api/alarms', { cache: 'no-store' });
      return await res.json();
    } catch (e) { return []; }
  };

  Store.ackAlarm = async function (id) {
    if (Store._alarms) {
      Store._alarms.ack(id);
      emit('alarms', Store._alarms.activeList());
      return;
    }
    if (Store.mode !== 'live') return;
    await fetch(Store.base + '/api/alarms/' + encodeURIComponent(id) + '/ack', { method: 'POST' });
  };

  Store.ackAllAlarms = async function () {
    if (Store._alarms) {
      Store._alarms.ackAll();
      emit('alarms', Store._alarms.activeList());
      return;
    }
    if (Store.mode !== 'live') return;
    await fetch(Store.base + '/api/alarms/ack-all', { method: 'POST' });
  };

  /* Fault injection — drives this browser's simulation when local. */
  Store.injectFault = async function (tagId, mode, value) {
    if (Store._sim) return Store._sim.injectFault(tagId, mode, value);
    if (Store.mode !== 'live') return [];
    const res = await fetch(Store.base + '/api/sim/fault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId, mode, value })
    });
    const body = await res.json();
    return body.faults || [];
  };

  Store.setUnitState = async function (unitId, state) {
    if (Store._sim) return Store._sim.setUnitState(unitId, state);
    if (Store.mode !== 'live') return null;
    const res = await fetch(
      Store.base + '/api/sim/unit/' + encodeURIComponent(unitId) + '/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      });
    return await res.json();
  };

  global.ScadaStore = Store;
})(window);
