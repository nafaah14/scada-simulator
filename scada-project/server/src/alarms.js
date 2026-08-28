/* =====================================================================
   ALARM ENGINE
   ---------------------------------------------------------------------
   Evaluates every analog tag against its limits each tick and maintains
   an event log with WOIS-style lifecycle: an alarm is ACTIVE while the
   condition holds, becomes RETURNED when it clears, and only leaves the
   active list once it has been both acknowledged and returned.

   Edge-triggered on purpose — an event is raised when a tag *enters* a
   state, not every tick it remains there, so the log stays readable.
   ===================================================================== */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/* Severity order, worst first — also the priority shown in the banner. */
const SEVERITY = {
  shutdown: 4, hihi: 3, lolo: 3, fault: 2, hi: 1, lo: 1, normal: 0
};

const LABEL = {
  shutdown: 'SHUTDOWN', hihi: 'ALM HIHI', lolo: 'ALM LOLO',
  hi: 'ALM Hi', lo: 'ALM Lo', fault: 'SENSOR FAULT'
};

export function evaluate(tag) {
  if (!tag || tag.value == null) return 'normal';
  if (tag.sensor_fault) return 'fault';
  if (tag.data_type !== 'analog') return 'normal';
  const v = Number(tag.value);
  if (Number.isNaN(v)) return 'normal';
  const sd = tag.shutdown_limits || {}, al = tag.alarm_limits || {};
  if (sd.hi != null && v >= sd.hi) return 'shutdown';
  if (sd.lo != null && v <= sd.lo) return 'shutdown';
  if (al.hihi != null && v >= al.hihi) return 'hihi';
  if (al.lolo != null && v <= al.lolo) return 'lolo';
  if (al.hi != null && v >= al.hi) return 'hi';
  if (al.lo != null && v <= al.lo) return 'lo';
  return 'normal';
}

export class AlarmEngine {
  constructor(tagStore, dataDir) {
    this.tags = tagStore;
    this.logPath = join(dataDir, 'runtime', 'alarm-log.json');
    this.states = new Map();     // tag_id -> last evaluated state
    this.active = new Map();     // tag_id -> alarm record
    this.log = [];
    this._seq = 1;
    this._load();
  }

  _load() {
    if (!existsSync(this.logPath)) return;
    try {
      const saved = JSON.parse(readFileSync(this.logPath, 'utf8'));
      this.log = saved.log || [];
      this._seq = (saved.seq || this.log.length) + 1;
    } catch { /* a corrupt log shouldn't stop the plant */ }
  }

  persist() {
    mkdirSync(dirname(this.logPath), { recursive: true });
    // keep the file bounded — the newest 500 events are plenty for training
    writeFileSync(this.logPath,
      JSON.stringify({ seq: this._seq, log: this.log.slice(-500) }, null, 2) + '\n');
  }

  /* Returns newly raised / returned events for this tick. */
  scan() {
    const events = [];
    for (const tag of this.tags.all()) {
      const next = evaluate(tag);
      const prev = this.states.get(tag.tag_id) || 'normal';
      if (next === prev) continue;
      this.states.set(tag.tag_id, next);

      if (next !== 'normal') {
        const record = {
          id: 'A' + (this._seq++),
          tag_id: tag.tag_id,
          unit: tag.unit || null,
          description: tag.description,
          state: next,
          label: LABEL[next] || next.toUpperCase(),
          severity: SEVERITY[next] || 1,
          value: tag.value,
          engineering_unit: tag.engineering_unit || null,
          raised_at: new Date().toISOString(),
          returned_at: null,
          acknowledged: false
        };
        this.active.set(tag.tag_id, record);
        this.log.push(record);
        events.push(record);
      } else {
        const record = this.active.get(tag.tag_id);
        if (record) {
          record.returned_at = new Date().toISOString();
          record.value = tag.value;
          // an unacknowledged alarm stays visible even after it clears
          if (record.acknowledged) this.active.delete(tag.tag_id);
          events.push(record);
        }
      }
    }
    if (events.length) this.persist();
    return events;
  }

  activeList() {
    return [...this.active.values()].sort((a, b) =>
      b.severity - a.severity || b.raised_at.localeCompare(a.raised_at));
  }

  /* The single line the status bar shows: worst active, newest first. */
  banner() {
    const list = this.activeList();
    return list.length ? list[0] : null;
  }

  ack(id) {
    for (const record of this.active.values()) {
      if (record.id !== id) continue;
      record.acknowledged = true;
      record.acknowledged_at = new Date().toISOString();
      if (record.returned_at) this.active.delete(record.tag_id);
      this.persist();
      return record;
    }
    return null;
  }

  ackAll() {
    const acked = [];
    for (const record of [...this.active.values()]) {
      record.acknowledged = true;
      record.acknowledged_at = new Date().toISOString();
      if (record.returned_at) this.active.delete(record.tag_id);
      acked.push(record);
    }
    if (acked.length) this.persist();
    return acked;
  }

  history(limit = 200) {
    return this.log.slice(-limit).reverse();
  }
}
