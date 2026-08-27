# STELCO Hulhumale SCADA Training Simulator

Training simulator for the Wärtsilä WOIS SCADA system, for both operations
and troubleshooting training. Built in phases: screens are designed and
visually approved in chat one at a time, then handed to Claude Code to wire
into a real multi-screen app with a live simulation engine.

## Folder structure

```
scada-project/
├── README.md                        ← you are here
├── docs/
│   ├── ARCHITECTURE.md              ← how tags/screens/popups/symbols fit together
│   ├── SYMBOL-LIBRARY.md            ← reusable component inventory + prop contracts
│   ├── HANDOFF-TO-CLAUDE-CODE.md    ← paste this into Claude Code to start
│   ├── genset-04-wartsila-tag-list-legacy.md   ← earlier full-text tag notes
│   └── genset-01-tag-list-legacy.md            ← earlier full-text tag notes
├── data/
│   ├── tags/
│   │   ├── SCHEMA.md                ← tag record field reference
│   │   ├── genset-tags.json         ← the shared tag database (sample data)
│   │   └── screens.json             ← legacy tag-per-screen map (pre-symbol-library)
│   ├── schema/
│   │   └── screen.schema.json       ← JSON Schema for screen definitions
│   └── screens-v2/
│       └── g4-control.json          ← G4 Control, in symbol-library format
└── mockups/
    ├── screens/
    │   ├── g4-control.html          ← approved G4 Control screen mockup
    │   ├── common-overview.html     ← approved Common Overview mockup
    │   ├── common-fuel.html         ← approved Common Fuel mockup
    │   ├── g1-temp.html             ← approved G1 Temp mockup
    │   └── g1-fuel.html             ← approved G1 Fuel mockup
    └── components/
        └── sensor-popup.html        ← approved click-a-value popup design
```

## Status

- ✅ G4 Control screen — designed, approved
- ✅ Common → Overview
- ✅ Common → Fuel (+ feeder pump popup)
- ✅ G1 → Temp
- ✅ G1 → Fuel
- ✅ Symbol library + screen schema (data/screens-v2/g4-control.json is the proof case)
- ⬜ Port remaining 4 screens into data/screens-v2/*.json format
- ⬜ Backend wiring (tag service, simulation engine, alarm engine, WebSocket)
- ⬜ Instructor fault-injection panel
- ⬜ Full plant scope beyond G1/G4
- ⬜ Reconcile 2 known duplicate-tag pairs (see data/tags/screens.json → G1.Fuel note)

## Workflow

1. Design + approve a new screen in chat (visual fidelity, tag list).
2. Drop the resulting mockup HTML into `mockups/screens/`, its tags into
   `data/tags/genset-tags.json`, and — going forward — its structure into
   `data/screens-v2/<screen>.json` using the symbol library (see
   `docs/SYMBOL-LIBRARY.md` and `g4-control.json` as the template).
3. Once a batch of screens is ready, open this folder in VS Code and hand
   `docs/HANDOFF-TO-CLAUDE-CODE.md` to Claude Code to wire the real app.
