# Deployment

Live site: **<https://scada-simulator.pages.dev>**

Cloudflare Pages is connected to `nafaah14/scada-simulator` on the `master`
branch. **Every push to `master` deploys automatically** — there is no build
step, Cloudflare just publishes the repo and the `functions/` directory.

Branch pushes get their own preview URL (`<branch>.scada-simulator.pages.dev`),
so a risky screen change can be tried before it reaches production.

## What runs where

| | Local (`npm start`) | Cloudflare Pages |
|---|---|---|
| Simulation tick loop | Node server | **in each browser** |
| Live values | WebSocket push | local tick, same engine |
| Alarm engine | server-side | client-side, same rules |
| Screen storage | `data/screens-v2/*.json` | KV (if bound), else browser |
| Header badge | `live` | `simulated` |

Workers are request-scoped, so nothing on Cloudflare can run a tick loop.
Instead the page runs the *same* `shared/simulation.js` and
`shared/alarm-engine.js` the server runs — so behaviour and alarm rules can't
drift between hosted and local. Each viewer gets an independent plant, which
suits training: one trainee tripping a genset doesn't disturb another.

## Screen persistence on Cloudflare

Screens resolve in this order:

1. **KV** — saved from the hosted editor. Live immediately, no redeploy.
2. **git** — `data/screens-v2/*.json`, shipped as static assets.

A KV copy *shadows* the committed file with the same `screen_id`. That gives
the fast loop (edit in the hosted editor, refresh the app shell, see it) while
git stays the reviewable source of truth. `DELETE /api/screens/:id` drops the
KV copy and reverts to whatever git holds.

To promote an edit into git: **Export** in the editor, drop the file into
`data/screens-v2/`, commit. Then optionally DELETE the KV copy so the two
agree.

### KV binding

The `SCREENS` KV namespace must be bound to the Pages project for hosted
saves to persist. Without it, `/api/health` reports `screens: false` and the
editor falls back to saving in the browser — which still satisfies
edit → save → view in one browser, but is not shared and is lost if site data
is cleared.

To bind it:

```bash
npx wrangler kv namespace create SCREENS       # needs a token with Workers KV: Edit
```

then in the dashboard: **Pages → scada-simulator → Settings → Bindings →
KV namespace**, variable name `SCREENS`, for both Production and Preview.

## Local development

```bash
# full stack with the ticking Node server
cd scada-project/server && npm install && npm start

# or emulate Cloudflare exactly, including Functions and a local KV
npx wrangler pages dev . --kv SCREENS
```

`wrangler pages dev` runs from the **repo root** (that's the deploy root, where
`_routes.json` and `functions/` live), not from `scada-project/`.

## Routing

`_routes.json` restricts Functions to `/api/*`. Everything else is served as a
static asset, which keeps Function invocations down and makes the rest of the
site plain CDN traffic.

The repo-root `index.html` is a redirect into
`scada-project/mockups/index.html`, so the bare domain lands on the app shell.

## Credentials

`.env` holds `CLOUDFLARE_API_TOKEN` and is gitignored — it must never be
committed. Deploys triggered by git don't need it; it's only for running
wrangler locally. When deploying manually with `wrangler pages deploy`, move
`.env` aside first so nothing in it can be picked up as a deployment variable.
