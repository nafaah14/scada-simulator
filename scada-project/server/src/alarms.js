/* =====================================================================
   ALARM PERSISTENCE
   ---------------------------------------------------------------------
   The lifecycle logic lives in shared/alarm-engine.js so the browser can
   run exactly the same rules when there's no server. This subclass only
   adds file persistence for the event log.
   ===================================================================== */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { AlarmEngine as BaseAlarmEngine, evaluate } from '../../shared/alarm-engine.js';

export { evaluate };

export class AlarmEngine extends BaseAlarmEngine {
  constructor(tagStore, dataDir) {
    super(tagStore);
    this.logPath = join(dataDir, 'runtime', 'alarm-log.json');
    this._load();
  }

  _load() {
    if (!existsSync(this.logPath)) return;
    try {
      const saved = JSON.parse(readFileSync(this.logPath, 'utf8'));
      this.log = saved.log || [];
      this._seq = (saved.seq || this.log.length) + 1;
    } catch {
      /* a corrupt log shouldn't stop the plant */
    }
  }

  persist() {
    mkdirSync(dirname(this.logPath), { recursive: true });
    // keep the file bounded — the newest 500 events are plenty for training
    writeFileSync(this.logPath,
      JSON.stringify({ seq: this._seq, log: this.log.slice(-500) }, null, 2) + '\n');
  }
}
