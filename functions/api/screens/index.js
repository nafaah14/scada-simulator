/* =====================================================================
   GET /api/screens  —  the screen index
   ---------------------------------------------------------------------
   Merges two sources:
     • the JSON files committed to the repo and served as static assets
     • screens saved through the editor into KV

   A KV copy shadows the committed file of the same id, so editing a
   screen in the hosted editor takes effect immediately without a
   redeploy — and deleting the KV copy reverts to whatever is in git.
   ===================================================================== */
import { listKvScreens, staticIndex } from '../_lib.js';

export async function onRequestGet(context) {
  const { env } = context;

  const [fromGit, fromKv] = await Promise.all([
    staticIndex(context),
    listKvScreens(env)
  ]);

  const byId = new Map();
  for (const entry of fromGit) byId.set(entry.screen_id, { ...entry, source: 'git' });
  for (const entry of fromKv) {
    const existing = byId.get(entry.screen_id);
    byId.set(entry.screen_id, { ...(existing || {}), ...entry, source: 'kv' });
  }

  const list = [...byId.values()].sort((a, b) => a.screen_id.localeCompare(b.screen_id));
  return Response.json(list, { headers: { 'Cache-Control': 'no-store' } });
}
