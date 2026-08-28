/* =====================================================================
   /api/screens/:id  —  read, save and revert a single screen
   ---------------------------------------------------------------------
   GET     KV copy if one exists, otherwise the version committed to git.
   PUT     Save from the editor into KV — live immediately, no redeploy.
   DELETE  Drop the KV copy, reverting to whatever git holds.
   ===================================================================== */
import { getKvScreen, putKvScreen, deleteKvScreen, staticScreen, noStore } from '../_lib.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const screenId = decodeURIComponent(params.id);

  const fromKv = await getKvScreen(env, screenId);
  if (fromKv) return Response.json(fromKv, { headers: noStore });

  const fromGit = await staticScreen(context, screenId);
  if (fromGit) return Response.json(fromGit, { headers: noStore });

  return Response.json({ error: 'Unknown screen' }, { status: 404, headers: noStore });
}

export async function onRequestPut(context) {
  const { env, request, params } = context;
  const screenId = decodeURIComponent(params.id);

  if (!env.SCREENS) {
    return Response.json({
      error: 'No KV namespace bound as SCREENS — screens are read-only on this deployment.'
    }, { status: 501, headers: noStore });
  }

  let doc;
  try {
    doc = await request.json();
  } catch (e) {
    return Response.json({ error: 'Body must be JSON' }, { status: 400, headers: noStore });
  }

  if (!Array.isArray(doc.elements)) {
    return Response.json({ error: 'elements[] is required' }, { status: 400, headers: noStore });
  }

  doc.screen_id = screenId;                       // the URL wins over the body
  doc.layout = doc.layout || 'canvas';
  doc.canvas = doc.canvas || { width: 1400, height: 760 };

  await putKvScreen(env, doc);
  return Response.json({ ok: true, screen_id: screenId, where: 'cloudflare-kv' },
    { headers: noStore });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const screenId = decodeURIComponent(params.id);
  await deleteKvScreen(env, screenId);
  // it may still exist in git — say so, since the screen won't vanish
  const fromGit = await staticScreen(context, screenId);
  return Response.json({
    ok: true,
    reverted_to_git: Boolean(fromGit)
  }, { headers: noStore });
}
