/* =====================================================================
   TAG STORE
   ---------------------------------------------------------------------
   The single source of truth at runtime. Values live in memory because
   the simulation rewrites them every tick — persisting those would just
   thrash the disk. Configuration that a user edits (alarm and shutdown
   limits, sensor-fault injection) is written to
   data/runtime/tag-overrides.json so it survives a restart without
   touching the authored tag files.
   ===================================================================== */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export class TagStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.overridesPath = join(dataDir, 'runtime', 'tag-overrides.json');
    this.tags = new Map();
    this._dirty = new Set();
  }

  load() {
    const tagsDir = join(this.dataDir, 'tags');
    // prefer the expanded set; fall back to the authored file alone
    const generated = join(tagsDir, 'tags.generated.json');
    const authored = join(tagsDir, 'genset-tags.json');
    const src = existsSync(generated) ? generated : authored;
    const list = JSON.parse(readFileSync(src, 'utf8'));
    this.tags = new Map(list.map(t => [t.tag_id, { ...t }]));

    if (existsSync(this.overridesPath)) {
      const overrides = JSON.parse(readFileSync(this.overridesPath, 'utf8'));
      for (const [tagId, patch] of Object.entries(overrides)) {
        const tag = this.tags.get(tagId);
        if (tag) Object.assign(tag, patch);
      }
    }
    return this.tags.size;
  }

  all() { return [...this.tags.values()]; }
  get(id) { return this.tags.get(id); }

  /* Simulation writes go here — in memory only, never persisted. */
  setValue(id, value) {
    const tag = this.tags.get(id);
    if (!tag) return null;
    tag.value = value;
    return tag;
  }

  /* Operator edits — persisted. */
  setLimits(id, patch) {
    const tag = this.tags.get(id);
    if (!tag) return null;
    if (patch.alarm_limits) {
      tag.alarm_limits = { ...tag.alarm_limits, ...patch.alarm_limits };
    }
    if (patch.shutdown_limits) {
      tag.shutdown_limits = { ...tag.shutdown_limits, ...patch.shutdown_limits };
    }
    if (patch.sensor_fault !== undefined) tag.sensor_fault = !!patch.sensor_fault;
    this._dirty.add(id);
    this.persist();
    return tag;
  }

  persist() {
    let existing = {};
    if (existsSync(this.overridesPath)) {
      try { existing = JSON.parse(readFileSync(this.overridesPath, 'utf8')); }
      catch { existing = {}; }
    }
    for (const id of this._dirty) {
      const tag = this.tags.get(id);
      if (!tag) continue;
      existing[id] = {
        alarm_limits: tag.alarm_limits,
        shutdown_limits: tag.shutdown_limits,
        sensor_fault: tag.sensor_fault
      };
    }
    mkdirSync(dirname(this.overridesPath), { recursive: true });
    writeFileSync(this.overridesPath, JSON.stringify(existing, null, 2) + '\n');
    this._dirty.clear();
  }
}
