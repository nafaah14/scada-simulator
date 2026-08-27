# Genset 1 + Feeder Breaker — Simulator Data Model
## STELCO Hulhumale Powerhouse SCADA Trainer (Phase 1 vertical slice)

This is the tag database for the first working slice: one diesel generator set,
its generator breaker, and one outgoing switchgear feeder breaker. Everything
downstream (HMI mimic, trends, alarms, fault injection) reads/writes to this
model.

---

## 1. Analog Input Tags (AI) — continuously simulated values

| Tag Name | Description | Unit | Normal Range | Update Rate |
|---|---|---|---|---|
| GEN1_RPM | Engine speed | RPM | 0 / 1500 (running) | 1 s |
| GEN1_OIL_PRESS | Lube oil pressure | bar | 3.5–5.5 | 1 s |
| GEN1_COOLANT_TEMP | Coolant temperature | °C | 70–90 | 1 s |
| GEN1_FUEL_LEVEL | Day tank fuel level | % | 0–100 | 5 s |
| GEN1_FUEL_PRESS | Fuel supply pressure | bar | 2–4 | 1 s |
| GEN1_BATT_VOLT | Starter battery voltage | V DC | 24–28 | 5 s |
| GEN1_RUN_HOURS | Running hours totalizer | hrs | increments | 1 min |
| GEN1_VOLT_L1/L2/L3 | Generator terminal voltage per phase | V | 400 ±5% | 1 s |
| GEN1_CURR_L1/L2/L3 | Generator output current per phase | A | 0–rated | 1 s |
| GEN1_FREQ | Generator frequency | Hz | 49.5–50.5 | 1 s |
| GEN1_KW | Real power output | kW | 0–rated | 1 s |
| GEN1_KVAR | Reactive power | kVAR | -rated–rated | 1 s |
| GEN1_PF | Power factor | – | 0.8–1.0 | 1 s |
| GEN1_KWH | Energy totalizer | kWh | increments | 1 min |
| FEEDER1_KW | Feeder load | kW | 0–rated | 1 s |
| FEEDER1_CURR | Feeder current | A | 0–rated | 1 s |

## 2. Digital Input Tags (DI) — status/feedback

| Tag Name | Description | States |
|---|---|---|
| GEN1_RUNNING | Engine running feedback | Run / Stopped |
| GEN1_READY | Ready to load (up to speed, voltage OK) | Ready / Not Ready |
| GEN1_BRK_STATUS | Generator breaker position | Open / Closed |
| GEN1_BRK_SPRING | Breaker spring charged | Charged / Discharged |
| GEN1_BRK_TRIPPED | Breaker trip flag (protection operated) | Normal / Tripped |
| FEEDER1_BRK_STATUS | Feeder breaker position | Open / Closed |
| GEN1_COMM_STATUS | RTU/PLC communication health | OK / Fail |
| GEN1_ESTOP | Emergency stop status | Normal / Activated |

## 3. Control / Command Tags (DO — operator-writable)

| Tag Name | Description | Values |
|---|---|---|
| GEN1_START_CMD | Start engine | Pulse |
| GEN1_STOP_CMD | Stop engine | Pulse |
| GEN1_BRK_CLOSE_CMD | Close generator breaker | Pulse |
| GEN1_BRK_OPEN_CMD | Open generator breaker | Pulse |
| FEEDER1_BRK_CLOSE_CMD | Close feeder breaker | Pulse |
| FEEDER1_BRK_OPEN_CMD | Open feeder breaker | Pulse |
| GEN1_GOV_MODE | Governor mode | Droop / Isochronous |
| GEN1_LOAD_SP | Target load setpoint (manual load control) | 0–100% |

## 4. Alarm Definitions

| Alarm Tag | Trigger Condition | Priority | Alarm Type |
|---|---|---|---|
| GEN1_OIL_PRESS_LOW | Oil pressure < 3.0 bar | High | Warning |
| GEN1_OIL_PRESS_LOLO | Oil pressure < 2.0 bar | Critical | Shutdown |
| GEN1_COOLANT_TEMP_HIGH | Coolant temp > 95°C | High | Warning |
| GEN1_COOLANT_TEMP_HIHI | Coolant temp > 105°C | Critical | Shutdown |
| GEN1_OVERSPEED | RPM > 1650 | Critical | Shutdown |
| GEN1_UNDERFREQ | Frequency < 48.5 Hz | High | Warning |
| GEN1_OVERFREQ | Frequency > 51.5 Hz | High | Warning |
| GEN1_UNDERVOLT | Voltage < 380 V | Medium | Warning |
| GEN1_OVERVOLT | Voltage > 420 V | Medium | Warning |
| GEN1_FUEL_LOW | Fuel level < 20% | Medium | Warning |
| GEN1_FUEL_LOLO | Fuel level < 5% | High | Warning |
| GEN1_BATT_LOW | Battery voltage < 22V | Medium | Warning |
| GEN1_BRK_FAIL_CLOSE | Close cmd issued, breaker doesn't close within 3s | High | Fault |
| GEN1_BRK_FAIL_OPEN | Open cmd issued, breaker doesn't open within 3s | High | Fault |
| GEN1_COMM_FAIL | Comm status = Fail | High | System |

## 5. Trend Groups (for trend viewer screens)

- **Engine Health:** RPM, Oil Pressure, Coolant Temp, Fuel Level
- **Electrical:** Voltage (3-phase), Frequency, kW, kVAR, PF
- **Loading:** GEN1_KW vs FEEDER1_KW (compare source vs load)

## 6. Simulation Logic Notes (for Phase 3 engine build)

- **Start sequence:** START_CMD → RPM ramps 0→1500 over ~8s → once RPM stable
  and oil pressure/coolant in range → GEN1_READY = true.
- **Loading:** Once GEN1_BRK_STATUS = Closed and FEEDER1_BRK_STATUS = Closed,
  GEN1_KW tracks FEEDER1_KW (plus configurable load-demand noise) with small
  time-lag from GOV_MODE response.
- **Coupled drift:** RPM small oscillations should nudge frequency; frequency
  deviation should nudge voltage — even a naive linear coupling sells the
  training realism.
- **Fault hooks:** every AI tag should support an injectable "fault override"
  (e.g. force OIL_PRESS to ramp down over 30s) that a Phase 7 instructor panel
  can trigger — build this hook in now rather than retrofitting later.

---

**Next step:** build the static SVG mimic screen using these tag names as
placeholder bindings, so the HMI and simulation engine can be wired together
in Phase 3–4 without renaming anything.
