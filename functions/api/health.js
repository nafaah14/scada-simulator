/* =====================================================================
   GET /api/health  —  Cloudflare Pages Function
   ---------------------------------------------------------------------
   The frontend probes this to decide how to behave. `ticks: false` is
   the important bit: Workers are request-scoped, so nothing here runs a
   tick loop. The client sees that and starts its own simulation instead,
   using the same engine modules the Node server runs.
   ===================================================================== */
export async function onRequestGet({ env }) {
  return Response.json({
    ok: true,
    runtime: 'cloudflare-pages',
    ticks: false,                 // no server-side simulation here
    screens: Boolean(env.SCREENS), // KV bound? then screens persist server-side
    storage: env.SCREENS ? 'kv' : 'read-only'
  }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}
