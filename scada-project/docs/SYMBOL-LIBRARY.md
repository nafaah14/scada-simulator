# Symbol Library

Every visual element across the 5 screens we've built so far reduces to one
of the symbol types below. This is the inventory Claude Code should build as
real React components — one component per type, each satisfying the "prop
contract" here. A screen is then just a JSON file listing which symbol
instances appear and what they bind to (see `data/screens-v2/g4-control.json`
for a full worked example).

**Rule of thumb that drove this list**: a new symbol type only gets added
when an existing type genuinely can't represent something — not for every
visual variation. A red LED and a green LED are the same `status_led` type
with different bound values, not two types.

## How binding works

Every symbol's `bind` field maps a named input (defined per type below) to
a `tag_id` from `data/tags/genset-tags.json`. The symbol never hardcodes a
value — it always resolves through the tag. This is what makes the same
`readout` component correctly render a temperature on one screen and a
power value on another: the tag tells it the unit, and the symbol just
formats and displays.

---

### `readout`
The single most common symbol — a bordered box showing one tag's value.
Used for every "kW", "°C", "bar", "A", "kV" field across all 5 screens.

| Field | Type | Notes |
|---|---|---|
| `bind.value` | tag_id | required |
| `props.label` | string | optional caption shown near the box |
| `props.decimals` | number | override tag's default formatting |
| `props.editable_on_click` | bool | if true, opens `sensor_popup`; if false, read-only (e.g. computed aggregates like plant MW) |

### `status_led`
Boolean/enum indicator. Covers Starting Conditions dots, breaker checkboxes
(Trp. circuit healthy, Breaker spring charged), and the Miscellaneous alarm
flag list.

| Field | Type | Notes |
|---|---|---|
| `bind.value` | tag_id | digital tag, or a boolean expression tag computed by the sim engine |
| `props.shape` | `"dot"` \| `"square"` | dot = Starting Conditions style, square = checkbox style |
| `props.true_color` | string | default `"green"` |
| `props.false_color` | string | default depends on context: neutral grey for status, red for alarm-type LEDs (`props.false_is_alarm: true`) |
| `props.label` | string | text shown next to the LED |

### `gauge_bar`
Vertical fill-bar gauge. Covers P/Active Power, Q/Reactive Power, Current
L1-L3, Voltage U12/U23/U31 on the Control screen.

| Field | Type | Notes |
|---|---|---|
| `bind.value` | tag_id | required |
| `bind.max_marker` | tag_id | optional — draws the amber max-available line (used on P/Active Power) |
| `props.min` / `props.max` | number | gauge scale; defaults to tag's rated range if omitted |
| `props.orientation` | `"vertical"` \| `"horizontal"` | default vertical |

### `tank_widget`
Composite symbol (a small panel of its own) — used for every storage/day
tank on the Overview and Fuel screens.

| Field | Type | Notes |
|---|---|---|
| `bind.level` | tag_id | drives both the numeric % and the fill-bar height |
| `bind.temps` | tag_id[] | 0 or more secondary temperature readouts stacked below the level |
| `props.label` | string | tank name, e.g. "LFO day tank PBF 901" |
| `props.capacity_label` | string | e.g. "25 m³" |
| `props.selected` | bool | draws the highlighted border used for the "primary tank" state on Common.Fuel |

### `pump_icon`
Small circular icon representing a pump or valve actuator.

| Field | Type | Notes |
|---|---|---|
| `bind.status` | tag_id | digital: running/stopped/auto |
| `props.number` | string | label inside the circle (e.g. "1", "2", "P") |
| `props.on_click` | `"command_popup"` \| `"sensor_popup"` \| `"none"` | feeder/transfer pumps open a command_popup (Start/Stop/Reset); most others are read-only |

### `breaker_symbol`
Single-line-diagram breaker element — open/closed square or line-drawn
symbol, used identically on Overview (read-only) and Control (interactive
via a linked `command_button`, not the symbol itself).

| Field | Type | Notes |
|---|---|---|
| `bind.status` | tag_id | digital: open/closed |
| `props.style` | `"square"` \| `"line-drawn"` | Overview uses square, Control's single-line diagram uses line-drawn |

### `sequence_stepper`
The Start/Stop Sequence panel — an ordered list of steps with a moving
highlight, and command buttons interleaved at their functionally correct
step (not clustered at the bottom — this was a specific correction earlier
in the project and the schema bakes it in structurally).

| Field | Type | Notes |
|---|---|---|
| `bind.state` | tag_id | enum tag, e.g. `G04_SEQ_STATE` |
| `props.steps` | `{id, label}[]` | ordered step list |
| `props.buttons` | `{after_step_id, command_button}[]` | each entry places a `command_button` (see below) immediately after a given step — this is how "Start order" ends up under "Engine ready for start" instead of at the bottom |

### `mode_selector_group`
A set of mutually-exclusive or independent toggle buttons — Auto/Manual,
Remote/Local, Grid/Island, kW/Speed droop, pf/Voltage droop/VDC.

| Field | Type | Notes |
|---|---|---|
| `bind.value` | tag_id | enum tag |
| `props.options` | `{value, label}[]` | rendered as a button per option; clicking writes `value` to the bound tag |
| `props.exclusive` | bool | true = radio-style (only one active), false = independent toggles |

### `relay_tile`
Protection relay status tile (VAMP210, VAMP265, VAMP260, P127).

| Field | Type | Notes |
|---|---|---|
| `bind.status` | tag_id | relay health/trip status |
| `props.label` | string | relay name |

### `engine_icon`
Decorative genset representation on Overview — colored by running state,
numbered.

| Field | Type | Notes |
|---|---|---|
| `bind.status` | tag_id | running/stopped |
| `props.number` | string | unit number shown inside |

### `command_button`
Not a canvas symbol on its own — always attached to another symbol
(`sequence_stepper` step, `pump_icon`, a panel toolbar). Issues a write to
a command tag.

| Field | Type | Notes |
|---|---|---|
| `bind.command` | tag_id | command/digital tag the sim engine listens for |
| `props.label` | string | button text |
| `props.shortcut` | string | keyboard shortcut label shown under the button, e.g. "Ctrl+Insert" |

### `cylinder_grid`
Repeating-pattern symbol for the engine cross-section (G1.Temp) — avoids
needing 80 hand-declared `readout` instances for every cylinder point.

| Field | Type | Notes |
|---|---|---|
| `bind.tag_pattern` | string | template like `"G01_CYL_{bank}_{point}_{n}"` |
| `props.banks` | string[] | e.g. `["B","A"]` |
| `props.count` | number | cylinders per bank |
| `props.points` | `{key,label}[]` | e.g. bearing, exhaust, liner1, bigend |

### Popups (triggered by symbols, not placed on canvas directly)

- **`sensor_popup`** — trend graph, live value, sensor fault flag, editable
  `alarm_limits`/`shutdown_limits`. Opened by `readout`, `tank_widget`,
  `gauge_bar` when `editable_on_click` is true.
- **`command_popup`** — title + tag ID, a row of command buttons (Start/
  Stop/Reset), optional secondary section (e.g. "Change pump"). Opened by
  `pump_icon` or a named unit label (e.g. clicking "Feeder unit PCA901").

---

## Container types

### `panel`
Bordered box with a header bar and title — the basic building block of the
Control-page-style grid layouts (Starting Conditions, Breaker, Generator
Measurements, Mode, Protection).

### `zone`
Dashed-border grouping with a corner label — used for the flow-diagram
style screens (Fuel oil system / Feeder system / Booster system /
Electrical system on Overview; the daily tank areas on Common.Fuel).

Both are just layout containers: `{ type, title|label, children: [symbol
instances...] }`.
