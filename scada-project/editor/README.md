# Screen Layout Editor

A canvas editor for building and tweaking SCADA screens without touching HTML.
Open `editor/index.html` (serve over `http://`, not `file://`, so it can read
the tag database) or use the **Editor** link in the app shell's top bar.

## Why this exists

The hand-written screens under `mockups/screens/` bake layout into CSS, so every
nudge — move a readout, recolour a label, add a sensor — meant editing markup.
This editor makes layout *data*: screens become JSON documents that both the
editor and the runtime render with the same `renderElement()` function, so what
you arrange is exactly what ships.

## Using it

| Action | How |
|---|---|
| Select | Click. <kbd>Shift</kbd>+click adds; drag on empty canvas for a marquee |
| Move | Drag, or arrow keys (<kbd>Shift</kbd>+arrow = 10 px) |
| Resize | Drag a corner handle (single selection) |
| Add | Click any item in the left palette |
| Duplicate | <kbd>Ctrl</kbd>+<kbd>D</kbd> |
| Delete | <kbd>Del</kbd> |
| Undo / redo | <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> |
| Save | <kbd>Ctrl</kbd>+<kbd>S</kbd> (to browser localStorage) |
| Align / distribute | Select 2+ (3+ to distribute), use the inspector |
| Layer order | Inspector → Order, or the Layers list (topmost first) |

Background shapes are best **locked** (inspector → Element → Locked) so you can
drag readouts across them without grabbing the drawing underneath. The seeded
`G1.Temp` engine outline is already locked.

## Persistence

Saving writes to browser localStorage — it survives reloads on that browser
only. **Export** downloads the screen as JSON; commit those files to
`data/screens-v2/` so they're shared and versioned. **Import** loads one back.

## Screen document format

Extends `data/schema/screen.schema.json` (`layout: "canvas"`) with a flat,
paint-ordered `elements` array — index 0 is furthest back.

```jsonc
{
  "screen_id": "G1.Temp",
  "title": "WOIS - Stelco 5th | G1 - Temp",
  "layout": "canvas",
  "canvas": { "width": 1400, "height": 700, "background": "#d4d8dc" },
  "elements": [
    {
      "id": "s1",
      "type": "rect",              // see element types below
      "name": "Engine block",      // optional, shown in the Layers list
      "x": 170, "y": 192, "w": 628, "h": 212,
      "locked": true,              // optional — not selectable on canvas
      "hidden": false,             // optional
      "props":  { "bevel": true }, // per-type configuration
      "style":  { "fill": "#9aa2ab", "stroke": "#5a6068", "strokeWidth": 1 }
    },
    {
      "id": "s2",
      "type": "readout",
      "x": 990, "y": 230, "w": 80, "h": 22,
      "bind":  { "value": "G01_GEN_WINDING_U" },   // tag_id from genset-tags.json
      "props": { "text": "92 °C", "unit": "", "decimals": null },
      "style": { "fill": "#f6f8f9", "stroke": "#c3cad2", "strokeWidth": 1,
                 "color": "#172029", "fontSize": 11, "bold": true, "align": "center" }
    }
  ]
}
```

**Element types** — background: `rect`, `line`, `pipe`, `text`; symbols:
`readout`, `led`, `pump`, `valve`, `tank`, `engine`, `turbo`, `breaker`,
`button`. Symbol types carry a `bind.value` tag id.

### How binding resolves

A bound element shows the live tag value when the tag exists in
`data/tags/genset-tags.json`; otherwise it falls back to `props.text`. That
keeps screens readable before the simulation backend is wired up, and means
binding a tag later is a one-field change rather than a re-layout.

## Adding a new symbol type

Two edits in `editor/index.html`:

1. Add an entry to the `TYPES` registry — default size, `props`, `style`, and
   the `fields` the inspector should expose (each name maps to a control in
   `buildField()`).
2. Add a `case` to `renderElement()` that draws it.

The palette, inspector, and layers list are all generated from that registry,
so nothing else needs touching.

## Not done yet

- Screens still live in localStorage / exported JSON; the runtime app shell
  (`mockups/index.html`) continues to load the hand-built HTML screens. Pointing
  the shell at these JSON documents is the next step.
- No live tag updates — values are read once from the static tag file. That
  arrives with the simulation engine and its WebSocket feed.
- No rotation, grouping, or multi-point polylines.
