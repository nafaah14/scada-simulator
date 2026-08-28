/* =====================================================================
   SIMULATION ENGINE
   ---------------------------------------------------------------------
   A per-unit state machine plus plant-physics-flavoured value drift.
   Every tick it advances each unit's state, recomputes derived tags, and
   returns only the tags that actually changed — the WebSocket layer
   pushes that delta rather than the whole database.

   Deliberately model-light: this trains operators on *reading* the HMI
   and reacting to alarms, so behaviour needs to be plausible and
   controllable (fault injection), not thermodynamically exact.
   ===================================================================== */

const STATES = ['STOPPED', 'STARTING', 'RUNNING', 'STOPPING'];

export class Simulation {
  constructor(tagStore, opts = {}) {
    this.tags = tagStore;
    this.tickMs = opts.tickMs || 1000;
    this.units = new Map();
    this.faults = new Map();          // tag_id -> {mode, value}
    this._timer = null;
    this._changed = new Set();
  }

  /* Any unit can be in any state; maintenance is an operator choice from
     the overview's Maintenance selector, not something the engine enters
     on its own. */
  setMaintenance(unitId, on) {
    const u = this.units.get(unitId);
    if (!u) return null;
    u.maintenance = !!on;
    if (on) { u.state = 'STOPPED'; u.load = 0; u.speed = 0; }
    return u;
  }
  trip(unitId) {
    const u = this.units.get(unitId);
    if (!u) return null;
    u.tripped = true;
    u.state = 'STOPPING';
    return u;
  }
  resetTrip(unitId) {
    const u = this.units.get(unitId);
    if (!u) return null;
    u.tripped = false;
    return u;
  }

  /* The colour state shown on screen, derived from the machine state
     plus the two operator-set flags. */
  _equipState(u) {
    if (u.maintenance) return 'MAINTENANCE';
    if (u.tripped) return 'TRIP';
    if (u.state === 'RUNNING' || u.state === 'STARTING') return 'RUNNING';
    return 'STOPPED';
  }

  init(unitIds = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']) {
    for (const id of unitIds) {
      // G4 sits stopped so the plant reads as a realistic mixed state —
      // one unit out, the rest carrying load. This matches the standing
      // Genset_4 alarm and the Start air reference page.
      const stopped = id === 'G4';
      this.units.set(id, {
        id,
        state: stopped ? 'STOPPED' : 'RUNNING',
        stateT: 0,
        load: stopped ? 0 : 0.89,          // fraction of rated
        targetLoad: stopped ? 0 : 0.89,
        speed: stopped ? 0 : 748,
        maintenance: false,
        tripped: false
      });
    }
  }

  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this.tick(), this.tickMs);
  }
  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  /* ---- operator / instructor controls ---- */
  setUnitState(unitId, state) {
    const u = this.units.get(unitId);
    if (!u || !STATES.includes(state)) return null;
    u.state = state;
    u.stateT = 0;
    return u;
  }
  setLoad(unitId, fraction) {
    const u = this.units.get(unitId);
    if (!u) return null;
    u.targetLoad = Math.max(0, Math.min(1, fraction));
    return u;
  }
  /* Fault injection — the training payload. `mode` is 'stuck' (freeze at
     value), 'drift' (ramp by value per tick), or 'offset' (add value). */
  injectFault(tagId, mode, value) {
    if (mode === 'clear') this.faults.delete(tagId);
    else this.faults.set(tagId, { mode, value: Number(value) || 0 });
    return [...this.faults.entries()].map(([k, v]) => ({ tag_id: k, ...v }));
  }
  listFaults() {
    return [...this.faults.entries()].map(([k, v]) => ({ tag_id: k, ...v }));
  }

  /* ---- helpers ---- */
  _set(id, value) {
    const tag = this.tags.get(id);
    if (!tag) return;
    const fault = this.faults.get(id);
    if (fault) {
      if (fault.mode === 'stuck') value = fault.value;
      else if (fault.mode === 'offset') value = value + fault.value;
      else if (fault.mode === 'drift') value = (Number(tag.value) || 0) + fault.value;
    }
    if (typeof value === 'number') value = Math.round(value * 10) / 10;
    if (tag.value !== value) {
      tag.value = value;
      this._changed.add(id);
    }
  }
  _get(id) {
    const t = this.tags.get(id);
    return t ? Number(t.value) : 0;
  }

  /* Nudge a value toward a target with a little noise, so the screen
     looks alive without wandering off. */
  _approach(id, target, rate = 0.15, noise = 0.4) {
    const cur = this._get(id);
    const next = cur + (target - cur) * rate + (Math.random() - 0.5) * noise;
    this._set(id, next);
  }

  tick() {
    this._changed.clear();
    for (const unit of this.units.values()) this._tickUnit(unit);
    this._tickPlant();
    const changed = [...this._changed].map(id => {
      const t = this.tags.get(id);
      return { tag_id: id, value: t.value, sensor_fault: t.sensor_fault };
    });
    return changed;
  }

  /* Plant-wide equipment that isn't owned by a single genset: the fuel
     train, day/storage tanks and the compressed-air systems. */
  _tickPlant() {
    let mw = 0, mvar = 0;
    for (const u of this.units.values()) {
      const p = u.id.replace('G', 'G0');
      mw += this._get(`${p}_KW`) / 1000;
      mvar += this._get(`${p}_KVAR`) / 1000;
    }
    this._set('COMMON_PLANT_MW', Math.round(mw * 10) / 10);
    this._set('COMMON_PLANT_MVAR', Math.round(mvar * 10) / 10);
    this._approach('COMMON_BUSBAR1_FREQ', 50, 0.3, 0.02);

    // day tanks drain slowly and are topped up by the transfer pumps
    for (let n = 901; n <= 906; n++) {
      const lvl = this._get(`PBF${n}_LEVEL`);
      const draw = 0.004 + Math.random() * 0.003;
      this._set(`PBF${n}_LEVEL`, lvl > 20 ? lvl - draw : lvl + 0.6);
      for (let k = 1; k <= 3; k++) this._approach(`COMMON_PBF${n}_T${k}`, 30, 0.05, 0.3);
    }
    // storage tanks stratify: warmest at the top, coolest at the bottom
    for (let n = 901; n <= 904; n++) {
      for (let k = 1; k <= 4; k++) {
        this._approach(`COMMON_PAE${n}_T${k}`, 34 - (k - 1) * 1.5, 0.04, 0.25);
      }
    }

    // feeder unit holds discharge pressure
    this._approach('PCA901_PRESS', 4.6, 0.2, 0.05);
    this._approach('COMMON_PCA901_OUT_PRESS_A', 4.5, 0.2, 0.05);
    this._approach('COMMON_PCA901_OUT_PRESS_B', 4.5, 0.2, 0.05);
    this._approach('COMMON_PCA901_FLOW', 9.4, 0.15, 0.15);
    this._approach('COMMON_TRANSFER_PRESS', 0.2, 0.2, 0.02);

    // compressed air
    this._approach('COMMON_TCA901_TEMP', 32.5, 0.1, 0.4);
    this._approach('COMMON_INSTRUMENT_PRESS', 7.1, 0.15, 0.06);
    this._approach('COMMON_START_AIR_PRESS', 27.8, 0.1, 0.08);
    this._approach('COMMON_SLUDGE_TEMP', 30, 0.05, 0.2);
    this._set('COMMON_BUSTIE_STATE', 'CLOSED');
  }

  _tickUnit(u) {
    u.stateT += this.tickMs / 1000;
    const p = u.id.replace('G', 'G0');     // G1 -> G01

    /* ---- state machine ---- */
    if (u.state === 'STARTING') {
      u.load = 0;
      u.speed = Math.min(750, u.speed + 60);
      if (u.speed >= 748 && u.stateT > 8) { u.state = 'RUNNING'; u.stateT = 0; }
    } else if (u.state === 'STOPPING') {
      u.load = Math.max(0, u.load - 0.08);
      u.speed = Math.max(0, u.speed - 45);
      if (u.speed <= 0) { u.state = 'STOPPED'; u.stateT = 0; }
    } else if (u.state === 'RUNNING') {
      u.load += (u.targetLoad - u.load) * 0.08;
      u.speed = 748 + (Math.random() - 0.5) * 1.2;
    } else {                                // STOPPED
      u.load = 0;
      u.speed = 0;
    }

    const running = u.state === 'RUNNING' || u.state === 'STARTING';
    const load = u.load;

    this._set(`${p}_RUNNING`, u.state === 'RUNNING');
    this._set(`${p}_STATE`, this._equipState(u));

    /* ---- power ----
       A stopped unit reads exactly zero rather than drifting around it;
       noise on a dead machine looks like a fault, not realism. */
    const rated = 8900;
    if (running) {
      this._approach(`${p}_KW`, rated * load, 0.2, 25);
      this._approach(`${p}_KVAR`, 360 * load, 0.2, 8);
      this._approach(`${p}_BOOSTER_FLOW`, 1550 * (0.6 + 0.4 * load), 0.15, 12);
    } else {
      this._set(`${p}_KW`, 0);
      this._set(`${p}_KVAR`, 0);
      this._set(`${p}_BOOSTER_FLOW`, 0);
    }
    this._set(`${p}_PF`, running ? 1.0 : 0);
    this._set(`${p}_BREAKER`, u.state === 'RUNNING');
    this._set(`${p}_BREAKER_STATE`,
      u.tripped ? 'TRIP' : (u.state === 'RUNNING' ? 'CLOSED' : 'OPEN'));
    this._set(`${p}_BOOSTER_V`, running);
    this._set(`${p}_BOOSTER_P1`, running);

    // Starting air is drawn down by a start and recharged while running.
    // A stopped unit's receiver is left alone — an isolated engine keeps
    // whatever pressure it was left with, which is what makes G4 read low.
    if (running) {
      for (const s of ['A', 'B']) {
        const target = u.state === 'STARTING' ? 12 : 27.6;
        this._approach(`${p}_START_AIR_PRESS_${s}`, target, 0.05, 0.06);
      }
    }

    // G1 also carries the legacy per-unit tag ids used by its own pages
    if (u.id === 'G1') {
      this._approach('SCA011ST103PV', u.speed, 0.5, 0.6);
      this._approach('SCA011PW104PV', rated * load, 0.2, 25);
      this._approach(`${p}_GEN_REACTIVE_POWER`, 360 * load, 0.2, 8);
      this._set(`${p}_MAX_AVAIL_POWER`, 8924);
      for (const l of ['L1', 'L2', 'L3']) {
        this._approach(`${p}_CURRENT_${l}`, running ? 575 * load : 0, 0.15, 6);
      }
      for (const l of ['U12', 'U23', 'U31']) {
        this._approach(`${p}_VOLTAGE_${l}`, running ? 11.02 : 0, 0.2, 0.03);
      }
      this._approach(`${p}_AVR_CURRENT`, running ? 2.4 : 0, 0.1, 0.05);
      this._approach(`${p}_AVR_VOLTAGE`, running ? 48 : 0, 0.1, 0.4);
      this._approach(`${p}_MIXTANK_FLOW`, running ? 1513 * (0.6 + 0.4 * load) : 0, 0.15, 10);
      this._approach(`${p}_MIXTANK_TEMP`, running ? 31.6 : 30, 0.08, 0.2);
      this._approach(`${p}_MIXTANK_PRESS`, running ? 4.0 : 0, 0.15, 0.05);
      this._approach(`${p}_CIRC_TEMP`, running ? 42 : 32, 0.06, 0.3);
      this._approach(`${p}_CTRLPANEL_TEMP`, 36, 0.05, 0.3);
      this._set(`${p}_ENGINE_SPEED`, u.speed);
      this._approach(`${p}_ENGINE_INLET_TEMP`, running ? 40 : 32, 0.08, 0.3);
      this._approach(`${p}_ENGINE_INLET_PRESS`, running ? 8.8 : 0, 0.15, 0.08);
      this._approach(`${p}_CLEANLEAK_FLOW`, running ? 13 : 0, 0.05, 0.4);
      this._approach(`${p}_DIRTYLEAK_TEMP`, running ? 37 : 30, 0.05, 0.3);
    }

    /* ---- cylinders ----
       Exhaust temperature tracks load; liners and bearings sit lower and
       move more slowly, which is what makes a creeping bearing temp read
       as a real fault rather than noise. */
    const exhBase = running ? 300 + 130 * load : 40;
    const linerBase = running ? 80 + 45 * load : 35;
    const bigEndBase = running ? 60 + 26 * load : 32;
    let exhSum = 0, exhCount = 0;

    for (const bank of ['A', 'B']) {
      for (let n = 1; n <= 10; n++) {
        // a fixed per-cylinder bias keeps each column distinct between ticks
        const bias = ((n * 7 + bank.charCodeAt(0)) % 11) - 5;
        const exhId = `${p}_CYL_${bank}_EXH_${n}`;
        this._approach(exhId, exhBase + bias * 2, 0.12, 3);
        exhSum += this._get(exhId); exhCount++;
        this._approach(`${p}_CYL_${bank}_LINER1_${n}`, linerBase + bias, 0.08, 1);
        this._approach(`${p}_CYL_${bank}_LINER2_${n}`, linerBase + bias - 2, 0.08, 1);
        this._approach(`${p}_CYL_${bank}_BIGEND_${n}`, bigEndBase + bias * 0.6, 0.06, 0.6);
      }
    }
    /* Deviation from the bank average is what the exhaust-gas graph is
       for: a misfiring cylinder shows as a column off the average long
       before its absolute temperature trips anything. Derived here so
       the graph and the readouts can never disagree. */
    if (exhCount) {
      const avg = exhSum / exhCount;
      this._set(`${p}_EXH_AVG_TEMP`, avg);
      for (const bank of ['A', 'B']) {
        for (let n = 1; n <= 10; n++) {
          this._set(`${p}_CYL_${bank}_EXH_${n}_DEV`,
            this._get(`${p}_CYL_${bank}_EXH_${n}`) - avg);
        }
      }
    }

    /* ---- main + thrust bearings ---- */
    for (let n = 1; n <= 11; n++) {
      const bias = ((n * 5) % 9) - 4;
      this._approach(`${p}_MAIN_BRG_${n}`, (running ? 70 + 22 * load : 33) + bias * 0.5, 0.06, 0.5);
    }
    this._approach(`${p}_THRUST_BRG`, running ? 66 + 18 * load : 32, 0.06, 0.5);

    /* ---- turbochargers ---- */
    for (const tc of ['A', 'B']) {
      const off = tc === 'B' ? 160 : 0;
      this._approach(`${p}_TC${tc}_SPEED`, running ? (12000 + 15000 * load) + off : 0, 0.15, 90);
      this._approach(`${p}_TC${tc}_EXH_IN`, running ? 330 + 190 * load : 40, 0.12, 4);
      this._approach(`${p}_TC${tc}_EXH_OUT`, running ? 220 + 130 * load : 38, 0.12, 3);
    }

    /* ---- alternator ---- */
    for (const w of ['U', 'V', 'W']) {
      const bias = { U: 0, V: 3, W: 1 }[w];
      this._approach(`${p}_GEN_WINDING_${w}`, (running ? 55 + 45 * load : 34) + bias, 0.05, 0.5);
    }
    this._approach(`${p}_GEN_BEARING_D`, running ? 52 + 28 * load : 33, 0.05, 0.4);
    this._approach(`${p}_GEN_BEARING_ND`, running ? 50 + 28 * load : 33, 0.05, 0.4);
    this._approach(`${p}_GEN_AIR_INTAKE`, 34 + Math.random() * 2, 0.1, 0.3);
    this._approach(`${p}_GEN_AIR_EXIT`, running ? 40 + 24 * load : 34, 0.06, 0.5);

    /* ---- running hours ---- */
    if (u.state === 'RUNNING') {
      const cur = this._get(`${p}_RUNNING_HOURS`);
      this._set(`${p}_RUNNING_HOURS`, cur + this.tickMs / 3600000);
    }
  }

  snapshotUnits() {
    return [...this.units.values()].map(u => ({
      id: u.id, state: u.state,
      load: Math.round(u.load * 100) / 100,
      speed: Math.round(u.speed)
    }));
  }
}
