/* =====================================================================
   SCADA SIMULATOR SERVER
   ---------------------------------------------------------------------
   Express for config (tags, screens, alarms, instructor controls) and a
   WebSocket for the live stream. Also serves the frontend, so the whole
   thing runs from one origin with no CORS or proxy setup.

     npm start          → http://localhost:3000
   ===================================================================== */
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TagStore } from './tags.js';
import { Simulation } from './simulation.js';
import { AlarmEngine } from './alarms.js';
import { ScreenStore } from './screens.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(HERE, '..', '..');          // scada-project/
const DATA = join(PROJECT, 'data');
const PORT = process.env.PORT || 3000;
const TICK_MS = Number(process.env.TICK_MS || 1000);

/* ---------- wire up the domain ------------------------------------- */
const tags = new TagStore(DATA);
const tagCount = tags.load();

const screens = new ScreenStore(DATA);
screens.writeIndex();

const sim = new Simulation(tags, { tickMs: TICK_MS });
sim.init(['G1']);

const alarms = new AlarmEngine(tags, DATA);

/* ---------- http ---------------------------------------------------- */
const app = express();
app.use(express.json({ limit: '8mb' }));   // screen documents can be large

const api = express.Router();

api.get('/health', (_req, res) => res.json({
  ok: true, tags: tags.tags.size, screens: screens.index().length,
  tickMs: TICK_MS, units: sim.snapshotUnits()
}));

/* -- tags -- */
api.get('/tags', (_req, res) => res.json(tags.all()));
api.get('/tags/:id', (req, res) => {
  const tag = tags.get(req.params.id);
  return tag ? res.json(tag) : res.status(404).json({ error: 'Unknown tag' });
});
api.patch('/tags/:id/limits', (req, res) => {
  const tag = tags.setLimits(req.params.id, req.body || {});
  if (!tag) return res.status(404).json({ error: 'Unknown tag' });
  broadcast({ type: 'tags', data: [tag] });
  res.json(tag);
});

/* -- screens -- */
api.get('/screens', (_req, res) => res.json(screens.index()));
api.get('/screens/:id', (req, res) => {
  const doc = screens.get(req.params.id);
  return doc ? res.json(doc) : res.status(404).json({ error: 'Unknown screen' });
});
api.put('/screens/:id', (req, res) => {
  try {
    const doc = { ...req.body, screen_id: req.params.id };
    screens.save(doc);
    broadcast({ type: 'screen-saved', data: { screen_id: doc.screen_id } });
    res.json({ ok: true, screen_id: doc.screen_id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
api.delete('/screens/:id', (req, res) => {
  screens.remove(req.params.id);
  res.json({ ok: true });
});

/* -- alarms -- */
api.get('/alarms', (_req, res) => res.json(alarms.activeList()));
api.get('/alarms/history', (req, res) =>
  res.json(alarms.history(Number(req.query.limit) || 200)));
api.post('/alarms/ack-all', (_req, res) => {
  const acked = alarms.ackAll();
  broadcast({ type: 'alarms', data: alarms.activeList() });
  res.json({ acknowledged: acked.length });
});
api.post('/alarms/:id/ack', (req, res) => {
  const record = alarms.ack(req.params.id);
  if (!record) return res.status(404).json({ error: 'Unknown alarm' });
  broadcast({ type: 'alarms', data: alarms.activeList() });
  res.json(record);
});

/* -- instructor controls -- */
api.get('/sim', (_req, res) => res.json({
  units: sim.snapshotUnits(), faults: sim.listFaults(), tickMs: TICK_MS
}));
api.post('/sim/unit/:id/state', (req, res) => {
  const u = sim.setUnitState(req.params.id, String(req.body.state || '').toUpperCase());
  return u ? res.json(u) : res.status(400).json({ error: 'Unknown unit or state' });
});
api.post('/sim/unit/:id/load', (req, res) => {
  const u = sim.setLoad(req.params.id, Number(req.body.load));
  return u ? res.json(u) : res.status(400).json({ error: 'Unknown unit' });
});
api.post('/sim/fault', (req, res) => {
  const { tag_id, mode, value } = req.body || {};
  if (!tag_id || !mode) return res.status(400).json({ error: 'tag_id and mode are required' });
  res.json({ faults: sim.injectFault(tag_id, mode, value) });
});

/* -- operator commands (digital writes) -- */
api.post('/command', (req, res) => {
  const { tag_id, value } = req.body || {};
  const tag = tags.setValue(tag_id, value);
  if (!tag) return res.status(404).json({ error: 'Unknown tag' });
  broadcast({ type: 'tags', data: [{ tag_id, value: tag.value }] });
  res.json(tag);
});

app.use('/api', api);

/* ---------- static frontend ----------------------------------------- */
app.use('/data', express.static(join(PROJECT, 'data')));
app.use('/shared', express.static(join(PROJECT, 'shared')));
app.use('/editor', express.static(join(PROJECT, 'editor')));
app.use('/', express.static(join(PROJECT, 'mockups')));

/* ---------- websocket ------------------------------------------------ */
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}

wss.on('connection', socket => {
  // hand a new client the current world so it renders correctly at once
  socket.send(JSON.stringify({ type: 'tags', data: tags.all() }));
  socket.send(JSON.stringify({ type: 'alarms', data: alarms.activeList() }));
});

/* ---------- the loop -------------------------------------------------- */
setInterval(() => {
  const changed = sim.tick();
  if (changed.length) broadcast({ type: 'tags', data: changed });
  const events = alarms.scan();
  if (events.length) broadcast({ type: 'alarms', data: alarms.activeList() });
}, TICK_MS);

server.listen(PORT, () => {
  console.log(`SCADA simulator listening on http://localhost:${PORT}`);
  console.log(`  tags     ${tagCount}`);
  console.log(`  screens  ${screens.index().length}`);
  console.log(`  tick     ${TICK_MS} ms`);
  console.log(`  editor   http://localhost:${PORT}/editor/`);
});

process.on('SIGINT', () => {
  console.log('\nstopping…');
  sim.stop();
  alarms.persist();
  tags.persist();
  process.exit(0);
});
