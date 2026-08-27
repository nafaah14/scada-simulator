# Handoff Brief — paste this into Claude Code to kick off the backend phase

## Project

A browser-based SCADA training simulator for STELCO Hulhumale Powerhouse,
replicating the Wärtsilä WOIS HMI for medium-speed genset operation and
troubleshooting training. Full context in `docs/ARCHITECTURE.md`.

## What already exists (do not redesign — wire it up)

- `data/tags/genset-tags.json` — the tag database schema and sample records.
  Read `data/tags/SCHEMA.md` first.
- `docs/SYMBOL-LIBRARY.md` — **read this before building any screen
  component.** Defines every reusable symbol type (readout, status_led,
  gauge_bar, tank_widget, pump_icon, breaker_symbol, sequence_stepper,
  mode_selector_group, relay_tile, engine_icon, command_button,
  cylinder_grid) and its prop contract. Build one React component per type.
- `data/schema/screen.schema.json` — JSON Schema for screen definition
  files. Validate against this before rendering.
- `data/screens-v2/g4-control.json` — a full worked example of the G4
  Control screen in this format. This is the pattern to follow for every
  other screen; the 5 legacy standalone HTML mockups in `mockups/screens/`
  are the visual ground truth to port from, not to keep as-is.
- `data/tags/screens.json` — legacy tag-per-screen mapping from before the
  symbol library existed. Superseded by `data/screens-v2/*.json` but still
  useful as a cross-reference while porting the remaining 4 screens.
- `mockups/screens/*.html` — approved static mockups (visual design is
  final; these are ground truth for layout, colors, interaction feel).
- `mockups/components/sensor-popup.html` — approved design for the
  click-a-value popup (trend, value, sensor fault, editable alarm/shutdown
  limits) — corresponds to the `sensor_popup` type in the symbol library.

## What to build, in order

1. **Project scaffold**: React + Vite (preferred) frontend, Node/Express
   backend, one shared tag data layer.
2. **Tag service**: load `genset-tags.json` at startup, serve over a small
   API (`GET /tags`, `GET /tags/:tag_id`, `PATCH /tags/:tag_id/limits`).
   Swap the JSON file for SQLite once this works end-to-end.
3. **Symbol library components**: one React component per type in
   `docs/SYMBOL-LIBRARY.md`. Each takes a `bind` (tag_id references) and
   `props` (static config) matching its documented contract.
4. **Generic `ScreenRenderer`**: reads a `data/screens-v2/*.json` file,
   validates it against `screen.schema.json`, and renders its panels/zones
   by instantiating the matching symbol component per entry. One renderer,
   not one component per screen — adding a new screen should mean writing
   a new JSON file, not new render code.
5. **Port the remaining 4 screens** (Common Overview, Common Fuel, G1
   Temp, G1 Fuel) into `data/screens-v2/*.json` following the
   `g4-control.json` pattern, using the legacy HTML mockups as the visual
   reference. **Reconcile the two known duplicate-tag pairs** flagged in
   `data/tags/screens.json`'s `G1.Fuel` note while doing this.
6. **Popup components**: `sensor_popup` and `command_popup`, each reusable
   across every symbol that references them.
7. **Simulation engine**: server-side tick loop advancing each unit's state
   machine, writing to `tag.value`. Port the placeholder ramp logic from
   `mockups/screens/g4-control.html`'s `tick()` function as the starting
   point.
8. **Alarm engine**: compare `tag.value` to `alarm_limits`/`shutdown_limits`
   every tick, write alarm events, push to clients over WebSocket.
9. **WebSocket live updates** across all connected screens.

## Constraints to respect

- Never hardcode a tag's value, label, unit, or alarm threshold inside a
  screen component — always resolve it through the tag service by
  `tag_id`/`logical_name`.
- Keep the visual design (dark top banners, light/dark toggle for the main
  panels, WOIS-style layout) exactly as in the mockups — this phase is
  about wiring, not restyling.
- New screens will keep arriving one at a time from chat-based design
  sessions (see `docs/ARCHITECTURE.md` → "What's next"). Structure the
  codebase so dropping in a new screen + its tag entries doesn't require
  touching the simulation or alarm engine.
