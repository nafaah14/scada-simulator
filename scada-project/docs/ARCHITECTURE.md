# Architecture Overview

## The core idea

One tag database. Every screen and popup is a *view* onto it — nothing is
hardcoded per-screen. This is what makes tags "common" across screens (e.g.
`Engine speed` appears on Temp, Control, and Fuel for the same genset — it's
the same tag object in all three).

```
data/tags/genset-tags.json   ← the single source of truth (tag_id, value,
                                 alarm limits, shutdown limits, sensor fault)
data/tags/screens.json       ← which tag_ids each screen renders, in what
                                 layout (legacy — being superseded by
                                 data/screens-v2/*.json, see below)
data/schema/screen.schema.json  ← JSON Schema for the new screen-definition
                                    format
data/screens-v2/*.json          ← screens expressed as symbol-library
                                    instances (see docs/SYMBOL-LIBRARY.md)
        │
        ▼
  [ frontend screens ]  ──click a value──▶  [ sensor popup component ]
        │                                          │
        ▼                                          ▼
  read tag.value,                       read/write tag.alarm_limits,
  tag.description,                      tag.shutdown_limits, view
  tag.engineering_unit                  tag.trend history
        ▲
        │
[ simulation engine tick loop ] — updates tag.value every cycle, checks
                                   tag.value against tag.alarm_limits /
                                   shutdown_limits, raises alarm events
```

## The symbol library (added after 5 screens were designed)

Once we had 5 screens built by hand (G4 Control, Common Overview, Common
Fuel, G1 Temp, G1 Fuel), the repeating visual patterns across them were
clear enough to extract into a proper component library instead of
continuing to hand-write HTML per screen:

- `docs/SYMBOL-LIBRARY.md` — the full inventory of reusable symbol types
  (`readout`, `status_led`, `gauge_bar`, `tank_widget`, `pump_icon`,
  `breaker_symbol`, `sequence_stepper`, `mode_selector_group`,
  `relay_tile`, `engine_icon`, `command_button`, `cylinder_grid`), each
  with a documented "prop contract" — what tag(s) it binds to, what static
  config it takes, what popup it opens on click.
- `data/schema/screen.schema.json` — a JSON Schema that validates a screen
  definition file structurally (panels/zones containing symbol instances).
- `data/screens-v2/g4-control.json` — the G4 Control screen re-expressed
  in this format, as a worked proof that the schema captures everything
  the hand-built mockup did (interleaved sequence buttons included).

**Why this was deferred until after 5 screens, not done first:** building
the library too early meant guessing at symbol types before we'd actually
seen the variety of real screens. Doing it now means every symbol type in
the library maps to something we've already drawn by hand and validated
visually — no speculative abstractions.

**What this fixes that hand-built screens couldn't:** while porting G1
Fuel, we found two tags that had been declared twice under different IDs
(`G01_MIXTANK_FLOW` vs `G01_BOOSTER_FLOW_RATE`, `G01_ENGINE_INLET_PRESS`
vs `SCA011PT102PV`) because each screen was designed independently. A
shared symbol bound to one tag ID, reused across screens, makes this class
of bug structurally harder to introduce — Claude Code should reconcile
these two pairs during backend wiring.

## Status: the backend phase has started

Built and working end to end:

- `server/` — Express + WebSocket. Tag service, tick-loop simulation, alarm
  engine with the WOIS active/returned/acknowledged lifecycle, and a
  file-backed screen store. See `server/README.md`.
- `shared/renderer.js` — **one** renderer used by both the app shell and the
  editor, so a screen looks identical in both. Screens are canvas JSON
  documents (`layout: "canvas"`), a flat paint-ordered element list.
- `shared/store.js` — data access with automatic **live / static** fallback, so
  the same pages work with or without the server running (GitHub Pages included).
- `editor/` — canvas layout editor. Saves through the API into
  `data/screens-v2/`, so a layout change is a reviewable git diff.
- `G1.Temp` is fully ported: JSON screen + ~144 runtime tags + live simulation
  + clickable sensor popup with editable limits.

The remaining screens (`Common.Overview`, `Common.Fuel`, `G1.Fuel`,
`G4.Control`) still render as legacy standalone HTML in an iframe and are not
tag-driven. The shell's registry takes either form, so they can be ported one
at a time.

**Note on the frontend stack:** the handoff brief preferred React + Vite. We
stayed with vanilla JS because the renderer was already built and approved,
and because avoiding a build step keeps the static GitHub Pages deploy working
from a plain `git push`. Screens being *data* means adding one is writing JSON,
not writing components — which was the brief's actual goal.

## What's built so far (mockup phase — done in chat)

- `mockups/screens/g4-control.html` — full G4 Control page, standalone,
  self-simulating (placeholder `tick()` logic, no real tag DB wired in yet).
- `mockups/components/sensor-popup.html` — reference for the
  click-a-value-to-see-detail behavior, matches the real WOIS analog popup
  (trend graph, Value, Sensor fault flag, editable HiHi/Hi/Lo/LoLo alarm
  limits, editable Hi/Lo shutdown limits, Trend/Close buttons).
- `data/tags/genset-tags.json` — sample structured tag records, including
  the exact tag from the reference screenshot (`SCA011TE101PV`, Fuel oil
  inlet temp, Hi=50.0, rest N/A) so the schema is provably correct.
- `data/tags/screens.json` — shows which screens will share which tags.

**Important:** the mockup screens do not yet read from `genset-tags.json` —
they still have their own inline placeholder data, matching how they were
built incrementally in chat. Wiring every screen to read from the shared
tag database instead of inline data is the first real backend task.

## What's next (screens still to design in chat, one at a time)

1. Common → Overview (fuel system + feeder/booster + electrical single-line)
2. Common → Fuel (+ feeder pump unit popup)
3. G1 → Temp (engine cross-section, cylinder/bearing temps)
4. G1 → Control (same layout as G4, but *running* state instead of stopped)
5. G1 → Fuel (engine fuel booster module flow diagram)

Each new screen should:
- Reuse `data/tags/genset-tags.json` tags wherever the same physical
  measurement already exists (e.g. engine speed, active power) instead of
  re-declaring it.
- Add new tag entries only for genuinely new measurements that screen
  introduces.
- Reuse `mockups/components/sensor-popup.html` for any clickable value.

## What's Claude Code's job (backend phase)

- Stand up a real project (React + Vite recommended, or plain Node/Express
  + vanilla JS if you'd rather avoid a framework) that reads
  `genset-tags.json` as the actual data source instead of screens having
  inline values.
- Replace the static JSON file with real persistent storage (SQLite or
  Postgres) once editing needs to survive a restart.
- Build the simulation engine: a server-side tick loop that updates
  `tag.value` for every analog tag based on the state machine per unit, and
  evaluates `alarm_limits`/`shutdown_limits` every tick to raise alarm
  events into an alarm log table.
- Push live tag updates to all connected screens over WebSocket, so editing
  a limit in a popup on one screen updates any other open screen showing
  that same tag_id.
- Build the instructor fault-injection panel (Phase 7 from the original
  roadmap) once the above is solid.

See `docs/HANDOFF-TO-CLAUDE-CODE.md` for a copy-pasteable brief.
