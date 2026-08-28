/* =====================================================================
   Shared helpers for the Pages Functions.
   ---------------------------------------------------------------------
   Screens live in two places once deployed:

     git — data/screens-v2/*.json, shipped as static assets. The source
           of truth, reviewable in a diff.
     KV  — screens saved from the hosted editor. Shadows git for the same
           screen_id so an edit is live immediately, no redeploy.

   Reverting an edit means deleting the KV entry (DELETE /api/screens/:id),
   which falls back to whatever git holds.
   ===================================================================== */

const KV_PREFIX = 'screen:';
export const SCREENS_DIR = '/scada-project/data/screens-v2/';

/* Fetch a static asset that was deployed alongside the Functions.
   Prefers the ASSETS binding (no extra network hop); falls back to a
   same-origin fetch, which works because the file is publicly served. */
export async function fetchAsset(context, path) {
  const url = new URL(context.request.url);
  url.pathname = path;
  url.search = '';
  const req = new Request(url, { method: 'GET' });
  const assets = context.env && context.env.ASSETS;
  return assets ? await assets.fetch(req) : await fetch(req);
}

export async function staticIndex(context) {
  try {
    const res = await fetchAsset(context, SCREENS_DIR + 'index.json');
    if (!res || !res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export async function staticScreen(context, screenId) {
  const index = await staticIndex(context);
  const entry = index.find(s => s.screen_id === screenId);
  const file = (entry && entry.file) || fileNameFor(screenId);
  try {
    const res = await fetchAsset(context, SCREENS_DIR + file);
    if (!res || !res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export function fileNameFor(screenId) {
  return screenId.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json';
}

export async function listKvScreens(env) {
  if (!env.SCREENS) return [];
  const out = [];
  let cursor;
  do {
    const page = await env.SCREENS.list({ prefix: KV_PREFIX, cursor });
    for (const key of page.keys) {
      const meta = key.metadata || {};
      out.push({
        screen_id: key.name.slice(KV_PREFIX.length),
        title: meta.title || key.name.slice(KV_PREFIX.length),
        unit: meta.unit || null,
        elements: meta.elements ?? 0,
        updated_at: meta.updated_at || null
      });
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out;
}

export async function getKvScreen(env, screenId) {
  if (!env.SCREENS) return null;
  return await env.SCREENS.get(KV_PREFIX + screenId, { type: 'json' });
}

export async function putKvScreen(env, doc) {
  if (!env.SCREENS) throw new Error('No KV namespace bound as SCREENS');
  await env.SCREENS.put(KV_PREFIX + doc.screen_id, JSON.stringify(doc), {
    metadata: {
      title: doc.title || doc.screen_id,
      unit: doc.unit || null,
      elements: Array.isArray(doc.elements) ? doc.elements.length : 0,
      updated_at: new Date().toISOString()
    }
  });
}

export async function deleteKvScreen(env, screenId) {
  if (!env.SCREENS) return;
  await env.SCREENS.delete(KV_PREFIX + screenId);
}

export const noStore = { 'Cache-Control': 'no-store' };
