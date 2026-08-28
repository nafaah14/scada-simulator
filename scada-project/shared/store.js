/* =====================================================================
   SCADA DATA ACCESS
   ---------------------------------------------------------------------
   One data layer for both the editor and the app shell, with two modes:

     live   — a backend is reachable: REST for config, WebSocket for
              streaming tag values and alarms.
     static — no backend (e.g. GitHub Pages): read the committed JSON
              files directly. Everything still renders; nothing ticks.

   Mode is detected once at startup, so the same pages work whether or
   not the server is running.
   ===================================================================== */
(function (global) {
  'use strict';

  const LS_SCREENS = 'scada.editor.screens.v1';

  const Store = {
    mode: 'static',          // 'live' | 'static'
    base: '',                // API base, e.g. '' when same-origin
    root: '..',              // path to scada-project/ from the calling page
    tags: new Map(),
    screenIndex: [],
    _socket: null,
    _listeners: { tags: [], alarms: [], status: [] }
  };

  /* ---------- boot -------------------------------------------------- */
  Store.init = async function (opts) {
    Object.assign(Store, opts || {});
    try {
      const res = await fetch(Store.base + '/api/health', { cache: 'no-store' });
      if (res.ok) Store.mode = 'live';
    } catch (e) {
      Store.mode = 'static';
    }
    await Store.loadTags();
    await Store.loadScreenIndex();
    emit('status', { mode: Store.mode });
    return Store.mode;
  };

  /* ---------- tags -------------------------------------------------- */
  Store.loadTags = async function () {
    const url = Store.mode === 'live'
      ? Store.base + '/api/tags'
      : Store.root + '/data/tags/genset-tags.json';
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const list = await res.json();
      Store.tags = new Map(list.map(t => [t.tag_id, t]));
    } catch (e) {
      console.warn('[store] tags unavailable:', e.message);
      Store.tags = new Map();
    }
    return Store.tags;
  };

  Store.getTag = id => Store.tags.get(id);

  Store.updateLimits = async function (tagId, patch) {
    if (Store.mode !== 'live') {
      const t = Store.tags.get(tagId);
      if (t) Object.assign(t, patch);
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
    if (Store.mode === 'live') {
      try {
        const res = await fetch(Store.base + '/api/screens', { cache: 'no-store' });
        Store.screenIndex = await res.json();
        return Store.screenIndex;
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
    if (Store.mode === 'live') {
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
    if (Store.mode === 'live') {
      const res = await fetch(Store.base + '/api/screens/' + encodeURIComponent(doc.screen_id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
      if (!res.ok) throw new Error('Save failed (HTTP ' + res.status + ')');
      return { where: 'server' };
    }
    const all = localScreens();
    all[doc.screen_id] = doc;
    localStorage.setItem(LS_SCREENS, JSON.stringify(all));
    return { where: 'browser' };
  };

  Store.deleteScreen = async function (screenId) {
    if (Store.mode === 'live') {
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
    if (Store.mode !== 'live' || Store._socket) return;
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
    if (Store.mode !== 'live') return [];
    try {
      const res = await fetch(Store.base + '/api/alarms', { cache: 'no-store' });
      return await res.json();
    } catch (e) { return []; }
  };
  Store.ackAlarm = async function (id) {
    if (Store.mode !== 'live') return;
    await fetch(Store.base + '/api/alarms/' + encodeURIComponent(id) + '/ack', { method: 'POST' });
  };

  global.ScadaStore = Store;
})(window);
