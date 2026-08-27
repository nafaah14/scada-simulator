# Genset 4 (Wärtsilä Medium-Speed) — Simulator Data Model v2
## STELCO Hulhumale Powerhouse — WOIS-style Control Page

Rebuilt against the WOIS "Control" page for a paralleling medium-speed Wärtsilä
genset. Structure matches the real screen; tag names are placeholders that
follow the real naming convention seen on-screen (`SCA041PT101A`), so swapping
in live tags later is a lookup-table edit, not a redesign.

**Naming convention used below:** `G04_<CATEGORY>_<INSTRUMENT><LOOP><SUFFIX>`
e.g. `G04_PT101A` = Genset 4, Pressure Transmitter, loop 101, instance A.
Keep a `logical_name → physical_tag` mapping table in the sim engine config —
the HMI and simulation only ever bind to the logical name.

---

## 1. Starting Conditions / Permissives (boolean, gate the start sequence)

All must be TRUE for `G04_SEQ_STATE` to allow "Start order".

| Logical Name | Description | Setpoint |
|---|---|---|
| G04_PERM_LOPRESS | LO press > 0.3 bar or Prelube in Auto | 0.3 bar |
| G04_PERM_FUELPRESS | Fuel oil inlet pressure > 4.0 bar | 4.0 bar |
| G04_PERM_HTWATER | HT-water temperature > 16°C | 16°C |
| G04_PERM_STARTAIR | Starting air pressure > 16 bar | 16 bar |
| G04_PERM_CTRLAIR | Control air pressure > 16 bar | 16 bar |
| G04_PERM_AVR_MCB | AVR MCB closed | Bool |
| G04_PERM_TURNGEAR | Turning gear disengaged | Bool |
| G04_PERM_STOPLEVER | Stop lever in running position | Bool |
| G04_PERM_BRK_COND | Breaker conditions OK | Bool |
| G04_PERM_ENG_STOPPED | Engine stopped | Bool |
| G04_PERM_ESM_AUTOSTOP | ESM stop/shutdown & autostop inactive | Bool |
| G04_PERM_ENGROOM_ESTOP | Engine room emergency stop inactive | Bool |
| G04_PERM_CTRLROOM_ESTOP | Control room emergency stop inactive | Bool |
| G04_PERM_PLANT_ESTOP | Power plant emergency stop inactive | Bool |
| G04_PERM_BRK_TRIP_ALM | Breaker trip alarm inactive | Bool |
| G04_PERM_ENG_SHUTDOWN_ALM | Engine shutdown alarm inactive | Bool |
| G04_PERM_START_FAIL | Start failure inactive | Bool |
| G04_PERM_SOFT_ENERGIZE | Soft energizing not active | Bool |

## 2. Start/Stop Sequence (state machine)

| Logical Name | Description |
|---|---|
| G04_SEQ_STATE | Enumerated: `READY, START_PREP, STARTING, IDLE, SYNCHRONIZING, LOADING, NORMAL_OP, UNLOADING, COOLING_RUN, STOPPED` |
| G04_SEQ_PREV_FAILED | Previous start attempt failed flag |
| G04_CMD_START_ORDER | Command: start order |
| G04_CMD_STOP_ORDER | Command: stop order |
| G04_CMD_EXEC | Command: execute (safety stop system ready) |
| G04_CMD_SHUTDOWN_RESET | Command: shutdown reset |
| G04_CMD_BRK_TRIP_RESET | Command: breaker trip reset |
| G04_AI_ENGSPEED | Engine speed (rpm) |

## 3. Breaker & AVR

| Logical Name | Description |
|---|---|
| G04_BRK_STATUS | Breaker position (Open/Closed) |
| G04_BRK_PARALLEL | Paralleled with grid (bool) |
| G04_BRK_SPRING_CHARGED | Breaker spring charged |
| G04_BRK_AVAILABLE | CB available |
| G04_AVR_EXCITATION | AVR excitation status |
| G04_AVR_VOLT_SUPV | Generator voltage supervision OK |
| G04_TRIP_CIRCUIT_HEALTHY | Trip circuit healthy |
| G04_AVR_MAIN_V | Main AVR voltage readout (V) |
| G04_AVR_MAIN_A | Main AVR current readout (A) |
| G04_AVR_MAIN_PF | Main AVR power factor readout |

## 4. Generator Measurements (analog, continuously simulated)

| Logical Name | Description | Unit |
|---|---|---|
| G04_AI_KW | Active power (P) | kW |
| G04_AI_KW_PCT | Active power, % of max avail. | % |
| G04_AI_KW_MAXAVAIL | Max available active power | kW |
| G04_AI_KVAR | Reactive power (Q) | kVAr |
| G04_AI_KVAR_SN | Reactive power, ratio to Sn | – |
| G04_AI_KVAR_MAXAVAIL | Max available reactive power | kVAr |
| G04_AI_CURR_L1/L2/L3 | Stator current per phase | A |
| G04_AI_VOLT_U12/U23/U31 | Bus/terminal line voltage | kV |
| G04_AI_FREQ | Frequency | Hz |
| G04_MODE_DERATING | Automatic derating status | – |
| G04_AI_ENERGY_ACTIVE | Active energy totalizer | kWh |
| G04_AI_ENERGY_REACT_EXP | Reactive energy export totalizer | kVArh |
| G04_AI_ENERGY_REACT_IMP | Reactive energy import totalizer | kVArh |
| G04_AI_RUNHOURS | Running hours | h |

## 5. Mode Selection

| Logical Name | Description | Options |
|---|---|---|
| G04_MODE_AUTOMAN | Auto / Manual | Auto, Manual |
| G04_MODE_REMLOC | Remote / Local | Remote, Local |
| G04_MODE_GRIDISLAND | Grid mode / Island mode | Grid, Island |
| G04_ENGCTRL_MODE | Engine control mode | kW, Speed droop |
| G04_GENCTRL_MODE | Generator control mode | pf, Voltage droop |
| G04_GENCTRL_VDC | Alternate generator control | VDC (reactive load sharing) |

## 6. Protection Relays (each a discrete monitored sub-system)

| Logical Name | Relay | Description |
|---|---|---|
| G04_PROT_VAMP210 | VAMP210 | Generator protection relay status |
| G04_PROT_VAMP265 | VAMP265 | Generator protection relay status |
| G04_PROT_VAMP260 | VAMP260 | Generator/mains protection relay status |
| G04_PROT_P127 | P127 | Differential/mains protection relay status |

## 7. Miscellaneous Alarm Flags (flat boolean list → individual alarm tags)

| Logical Name | Description |
|---|---|
| G04_ALM_MCB_OPEN_CFC | MCB open in CFC |
| G04_ALM_MCB_OPEN_CFE | MCB open in CFE |
| G04_ALM_MCB_OPEN_BJA | MCB open in BJA |
| G04_ALM_MCB_OPEN_MAINAVR | MCB open in main AVR circuit |
| G04_ALM_SYNC_NOT_ACTIVATED | Synchronizing not activated |
| G04_ALM_SYNC_FAILURE | Synchronizing failure |
| G04_ALM_EXCITATION_FAIL | Excitation failure |
| G04_ALM_DIFF_PROT_SHUTDOWN | Diff. prot. relay eng. shutdown |
| G04_ALM_GEN_PROT_BRK_TRIP | Gen. prot. relay breaker trip |
| G04_ALM_TRIPPED_SPEED_DROOP | Tripped to speed droop |
| G04_ALM_AVR_SYNC_DISABLED | AVR synch. disabled |
| G04_ALM_AVR_OVERVOLT | AVR overvoltage |
| G04_ALM_DIODE_MONITOR_TRIP | Diode monitor trip |
| G04_ALM_CTRL_VOLT_FAULT | Control voltage fault |
| G04_ALM_LV_BRK_OPEN | LV circuit breaker open |
| G04_ALM_ENGINE_IDLE_TOO_LONG | Engine idling too long |
| G04_ALM_BUSBAR_VOLT_SUPV | Busbar voltage supervision |

## 8. Alarm Banner / Event Tag Format

Matches on-screen format: `SCA041PT101A` style — used for the scrolling
alarm banner and alarm history log.

| Field | Example | Meaning |
|---|---|---|
| Area/Unit code | SCA041 | Plant area + unit number |
| Instrument type | PT | Pressure Transmitter (TT=temp, ST=speed, VT=voltage...) |
| Loop number | 101 | Loop/instrument ID |
| Suffix | A | Instance/redundancy suffix |

Alarm banner also carries: timestamp, source tag (`Genset_4`), free-text
description (`ALM, Fuel oil inlet pressure low`), ACK state, ON/OFF state.

## 9. Trend Groups

- **Engine Health:** Engine speed, LO pressure, HT-water temp, fuel pressure
- **Electrical:** U12/U23/U31, frequency, kW, kVAr, current L1-L3
- **Loading & Sync:** kW vs max available, synchronizing status, breaker events

## 10. Simulation Logic Notes (unchanged in spirit, updated for paralleling)

- Sequence state machine drives everything — most measurements are only
  "live" once state = LOADING or NORMAL_OP.
- Synchronizing step must check freq/voltage/phase match before allowing
  breaker close — a good early fault-injection target (sync failure alarm).
- Once paralleled, kW tracks a load-sharing setpoint relative to other
  running gensets, not an absolute target — this is the key behavioral
  difference from the earlier standalone genset model.
- Keep the fault-override hook per tag from v1 — still applies here.

---

**Status:** placeholder tags, real structure. Next: mock up the HMI mimic
screen against this model in the WOIS visual style.
