/* =====================================================================
   SCREEN STORE
   ---------------------------------------------------------------------
   Screens are files in data/screens-v2/, one JSON document each, so a
   layout edit shows up as a reviewable git diff rather than an opaque
   database write. The editor saves through this; the app shell reads it.
   ===================================================================== */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync }
  from 'node:fs';
import { join } from 'node:path';

export class ScreenStore {
  constructor(dataDir) {
    this.dir = join(dataDir, 'screens-v2');
    mkdirSync(this.dir, { recursive: true });
  }

  fileFor(screenId) {
    return join(this.dir, screenId.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json');
  }

  /* Rebuilt from disk each call so screens dropped in by hand (or pulled
     from git) are picked up without a restart. */
  index() {
    const out = [];
    for (const name of readdirSync(this.dir)) {
      if (!name.endsWith('.json') || name === 'index.json') continue;
      try {
        const doc = JSON.parse(readFileSync(join(this.dir, name), 'utf8'));
        if (!doc.screen_id) continue;
        out.push({
          screen_id: doc.screen_id,
          title: doc.title || doc.screen_id,
          unit: doc.unit || null,
          layout: doc.layout || 'canvas',
          file: name,
          elements: Array.isArray(doc.elements) ? doc.elements.length : 0
        });
      } catch (e) {
        console.warn('[screens] skipping unreadable', name, '-', e.message);
      }
    }
    return out.sort((a, b) => a.screen_id.localeCompare(b.screen_id));
  }

  get(screenId) {
    const path = this.fileFor(screenId);
    if (!existsSync(path)) {
      // fall back to a scan, in case the filename doesn't match the id
      const hit = this.index().find(s => s.screen_id === screenId);
      if (!hit) return null;
      return JSON.parse(readFileSync(join(this.dir, hit.file), 'utf8'));
    }
    return JSON.parse(readFileSync(path, 'utf8'));
  }

  save(doc) {
    if (!doc || !doc.screen_id) throw new Error('screen_id is required');
    if (!Array.isArray(doc.elements)) throw new Error('elements[] is required');
    doc.canvas = doc.canvas || { width: 1400, height: 760 };
    doc.layout = doc.layout || 'canvas';
    writeFileSync(this.fileFor(doc.screen_id), JSON.stringify(doc, null, 2) + '\n');
    this.writeIndex();
    return doc;
  }

  remove(screenId) {
    const path = this.fileFor(screenId);
    if (existsSync(path)) unlinkSync(path);
    this.writeIndex();
  }

  /* index.json is what the no-backend (static hosting) frontend reads,
     so it has to stay in step with the files on every write. */
  writeIndex() {
    writeFileSync(join(this.dir, 'index.json'),
      JSON.stringify(this.index(), null, 2) + '\n');
  }
}
