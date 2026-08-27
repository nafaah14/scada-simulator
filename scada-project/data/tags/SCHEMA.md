# Tag Database Schema

Single source of truth for every point in the simulator. Every screen renders
by looking up tag IDs from this database — no screen hardcodes a value,
label, unit, or alarm limit. This is what makes a tag "common" across
screens: two screens that reference the same `tag_id` are looking at the
exact same object, so editing it once (e.g. via the sensor popup) updates
everywhere it's displayed.

## File: `genset-tags.json`

Array of tag objects. Each tag:

```json
{
  "tag_id": "SCA011TE101PV",
  "logical_name": "G01_TT101_FUEL_INLET_TEMP",
  "unit": "G1",
  "description": "Fuel oil inlet temp",
  "category": "temperature",
  "engineering_unit": "°C",
  "data_type": "analog",
  "value": 40.2,
  "sensor_fault": false,
  "alarm_limits": { "hihi": null, "hi": 50.0, "lo": null, "lolo": null },
  "shutdown_limits": { "hi": null, "lo": null },
  "screens": ["G1.Fuel", "G1.Temp"],
  "trend_enabled": true
}
```

| Field | Meaning |
|---|---|
| `tag_id` | Real physical/PLC tag string, shown in the alarm banner and popup title (e.g. `SCA011TE101PV`). This is the field you'll eventually repoint at the real Wärtsilä PLC tag. |
| `logical_name` | What the frontend code actually binds to. Never changes even if `tag_id` does. |
| `unit` | Which genset/system this belongs to: `G1`–`G6`, or `COMMON` for shared plant-level tags (fuel system, busbars). |
| `description` | Human label shown on-screen and in the popup header. |
| `category` | `temperature`, `pressure`, `level`, `flow`, `speed`, `power`, `voltage`, `current`, `frequency`, `energy`, `status`, `command`. Drives which UI widget renders it (bar gauge vs field vs indicator dot). |
| `engineering_unit` | °C, bar, %, kg/h, A, kV, kW, kVAr, Hz, kWh, rpm, h. |
| `data_type` | `analog` (numeric, simulated/trended) or `digital` (boolean status/command). |
| `value` | Current live value — this is what the simulation engine updates every tick. |
| `sensor_fault` | Bool. When true, the popup shows "Sensor fault" and the value display goes stale/red, matching the real WOIS popup behavior. |
| `alarm_limits` | `hihi`/`hi`/`lo`/`lolo`, each a number or `null` (shown as "N/A" like the reference popup). **User-editable** from the popup. |
| `shutdown_limits` | `hi`/`lo`, number or `null`. **User-editable**. Distinct from alarm limits — crossing these should trip the engine, not just alarm. |
| `screens` | Which screens render this tag. A tag can appear in many screens — that's the "shared/common tag" mechanism the operator asked about. |
| `trend_enabled` | Whether this tag has trend history and shows the trend graph in its popup. |

## File: `screens.json`

Maps each screen name to the ordered list of `tag_id`s it displays, plus
static (non-tag) layout elements. This is what a screen component reads to
know what to render — it should never need its own copy of tag data.

## Editing rule for Claude Code (backend phase)

- Alarm/shutdown limit edits from the popup write back to this same
  tag object (in the real system: a database row, not a static JSON file).
  Any other screen currently displaying that tag re-renders with the new
  limits immediately — this is the reactive-shared-tag behavior to build.
- The simulation engine reads `alarm_limits`/`shutdown_limits` every tick to
  decide whether to raise an alarm banner event — don't hardcode thresholds
  in the simulation code itself.
