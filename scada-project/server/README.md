# SCADA Simulator Backend

Tag service, simulation engine, alarm engine and screen store for the WOIS
training simulator. Express + `ws`, no build step.

## Run it

```bash
cd scada-project/server
npm install
npm start                 # http://localhost:3000
PORT=3210 npm start       # if 3000 is taken
```

Then open:

| | |
|---|---|
| App shell | <http://localhost:3000/> |
| Screen editor | <http://localhost:3000/editor/> |
| Health check | <http://localhost:3000/api/health> |

The server also serves the frontend, so everything is same-origin — no CORS
or proxy setup.

## Two modes, one frontend

`shared/store.js` probes `/api/health` at startup:

- **live** — the server is up: REST for config, WebSocket for streaming values.
- **static** — no server (e.g. GitHub Pages): the committed JSON files are read
  directly. Screens still render, nothing ticks.

That's why the GitHub Pages link keeps working without a backend, and why you
should never assume a value is live — the header badge says which mode you're in.

## Architecture

```
                    ┌───────────────┐
   genset-tags.json │   TagStore    │  values in memory (simulated),
   + generated  ───▶│               │  limit edits → data/runtime/
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
 ┌────────────┐      ┌────────────┐      ┌─────────────┐
 │ Simulation │      │   Alarm    │      │ ScreenStore │
 │ tick loop  │─────▶│  engine    │      │  JSON files │
 └────────────┘      └─────┬──────┘      └──────┬──────┘
        │                  │                    │
        └──────────────────┴────────────────────┘
                           │
                    WebSocket + REST
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        app shell                  screen editor
              └──── shared/renderer.js ─┘
```

Both frontends render through the **same** `renderElement()`, so a screen looks
identical in the editor and in the app.

### Why values aren't persisted

The simulation rewrites every analog tag each tick; writing that to disk would
thrash it for no benefit, since a training session always starts from a known
state. What *is* persisted is what a user changes: alarm/shutdown limits and
sensor-fault flags go to `data/runtime/tag-overrides.json` (gitignored), applied
over the authored tags at startup. Editing a limit therefore survives a restart
without ever touching `genset-tags.json`.

## API

### Tags
| Method | Path | Notes |
|---|---|---|
| GET | `/api/tags` | full tag list |
| GET | `/api/tags/:id` | one tag |
| PATCH | `/api/tags/:id/limits` | `{alarm_limits, shutdown_limits, sensor_fault}` — persisted |

### Screens
| Method | Path | Notes |
|---|---|---|
| GET | `/api/screens` | index (rebuilt from disk each call) |
| GET | `/api/screens/:id` | one screen document |
| PUT | `/api/screens/:id` | save — writes `data/screens-v2/<id>.json` |
| DELETE | `/api/screens/:id` | remove |

### Alarms
| Method | Path | Notes |
|---|---|---|
| GET | `/api/alarms` | active list, worst first |
| GET | `/api/alarms/history?limit=200` | event log |
| POST | `/api/alarms/:id/ack` | acknowledge one |
| POST | `/api/alarms/ack-all` | acknowledge all |

### Instructor controls
| Method | Path | Body |
|---|---|---|
| GET | `/api/sim` | unit states + active faults |
| POST | `/api/sim/unit/:id/state` | `{"state":"RUNNING\|STARTING\|STOPPING\|STOPPED"}` |
| POST | `/api/sim/unit/:id/load` | `{"load":0.85}` (fraction of rated) |
| POST | `/api/sim/fault` | `{"tag_id":"…","mode":"stuck\|drift\|offset\|clear","value":600}` |
| POST | `/api/command` | `{"tag_id":"…","value":…}` — digital writes |

Fault injection is the training payload. For example, to make a bearing creep
until it alarms:

```bash
curl -X POST localhost:3000/api/sim/fault -H 'Content-Type: application/json' \
  -d '{"tag_id":"G01_MAIN_BRG_5","mode":"drift","value":0.4}'
```

### WebSocket `/ws`

On connect the server sends a full `tags` snapshot and the active `alarms`, then
streams deltas:

```jsonc
{ "type": "tags",   "data": [ { "tag_id": "…", "value": 412.6 } ] }  // changed only
{ "type": "alarms", "data": [ /* full active list */ ] }
```

The client reconnects with exponential backoff, so restarting the server
doesn't require a page reload.

## Alarm lifecycle

Edge-triggered — an event is raised when a tag *enters* a state, not every tick
it stays there. An alarm is **ACTIVE** while the condition holds, becomes
**RETURNED** when it clears, and only leaves the active list once it has been
*both* acknowledged and returned. That matches WOIS: an alarm that came and went
while nobody was looking still demands an acknowledgement.

Severity order: `shutdown` > `hihi`/`lolo` > `fault` > `hi`/`lo`.

## Regenerating data

```bash
npm run generate     # tags.generated.json + data/screens-v2/*.json
```

`tools/generate-tags.mjs` expands the authored patterns in `genset-tags.json`
(per-cylinder, per-bank, per-unit) into the ~144-tag runtime set. Authored
records always win, so editing a limit in `genset-tags.json` is safe.

`tools/generate-screens.mjs` lays down initial screen geometry. **It overwrites**,
so once a screen has been tuned in the editor, export it rather than re-running.

## Not done yet

- Only G1 is simulated. `Simulation.init()` takes a unit list; G2–G6 need their
  screens and tag sets before they're worth ticking.
- `Common.Overview`, `Common.Fuel`, `G1.Fuel` and `G4.Control` are still legacy
  standalone HTML, loaded in an iframe by the shell and **not** tag-driven.
  Porting each to a JSON screen is what makes it live.
- The two duplicate tag pairs flagged in `ARCHITECTURE.md`
  (`G01_MIXTANK_FLOW`/`G01_BOOSTER_FLOW_RATE`,
  `G01_ENGINE_INLET_PRESS`/`SCA011PT102PV`) are still unreconciled.
- No auth, no multi-user conflict handling on screen saves — last write wins.
- Alarm log is a JSON file capped at 500 events; SQLite is the upgrade path.
