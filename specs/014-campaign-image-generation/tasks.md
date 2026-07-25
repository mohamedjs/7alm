# Tasks: Campaign Image Generation

**Spec:** `specs/014-campaign-image-generation/spec.md` — **read §0 first.** It is
the constraint that makes this list the shape it is, and without it the first
instinct (point an `httpRequestTool` at OpenRouter directly) wastes a day.

**Owners:** `@backend`, `@n8n`, `@frontend`.

**Repo facts every agent needs.** App base URL
`https://7alm-pro.up.railway.app`. Supabase host
`zuajkdttqzgwwdnsjmjk.supabase.co`, storage bucket `7alm`. n8n→7alm header
`x-n8n-access-token: 123456` — a **literal** in workflow JSON, never `$env`;
that is a standing user decision. The workflow file is
`automation/telegram-fb-post-workflow.json` and it is **live production**.

**Scope guard:** from-scratch generation only. Do **not** touch the
`Voice or Text?` switch, do not build an inbound-photo path, do not call Gemini
for images.

---

## Phase 0 — Verify before building (~20 minutes, blocking)

Either of these can sink the feature silently. Do both first.

### T001 · Confirm the `7alm` bucket is publicly readable — `@backend`
Take an existing `products.main_image` URL and `curl` it with no auth header and
no cookies. A 200 with image bytes confirms it. `getPublicUrl()` returns a URL
for private buckets too, so the upload route and the migration file are **not**
evidence.
**If it 400s/403s: stop and report.** Nothing here works — Instagram and TikTok
both require a publicly fetchable URL — and the fix (make the bucket public vs.
adopt signed URLs) is a decision, not an implementation detail.

### T002 · `OPENROUTER_API_KEY` + confirm the API contract — `@backend`
The app has **no** OpenRouter key today (`.env.local` has `GEMINI_API_TOKEN`
only). Ask the user for the key from the same OpenRouter account n8n credential
`EbbUdiq5aCjllGWD` uses — do not try to read it out of n8n.

1. Add `OPENROUTER_API_KEY=...` to `.env.local`, add it to the env table in
   `AGENTS.md`, and flag to the user that **it must also be set on Railway**.
   Unset behaves like spec 013's T052: the route fails, the agent apologises in
   chat, and the conversation looks healthy while nothing works.
2. **`curl` the contract — it is UNVERIFIED.** Spec §2 is assembled from doc
   summaries; no quoted example pairs `/api/v1/images` with
   `google/gemini-2.5-flash-image`. Try **shape A** first
   (`POST /api/v1/images`, `{model, prompt}` → `data[0].b64_json`). If it 404s or
   rejects the model, try **shape B**
   (`POST /api/v1/chat/completions`, `{model, messages, modalities:["image","text"]}`
   → `choices[0].message.images[0].image_url.url`, probably a `data:` URL).
   **Record which shape won and the exact response path** — T010 parses it.
3. Then test refinement on whichever shape won: shape A with
   `input_references` pointing at any public image URL; shape B with the prior
   image as an image part in `messages`. This decides whether capability 2 is a
   true edit or the regenerate fallback. **Record which.**

**Neither outcome changes the architecture** — the route still parses, decodes,
uploads and returns `{ url }`. Only T010's parsing differs.

**If refinement is unsupported either way:** do **not** switch to Gemini. Record
it; T021/T022 become the regenerate-from-amended-prompt variant in spec §2.

---

## Phase 1 — Generate

Ships alone. It also unblocks Instagram/TikTok publishing, which the agent
refuses today because it has no image URL and is forbidden from inventing one.

### T010 · `POST /api/n8n/ai-studio/images` — `@backend`
`src/app/api/n8n/ai-studio/images/route.ts`. This one route is the whole backend.

1. `requireN8nAccess(req)` from `@/lib/n8n-auth` — first line, exactly as
   `/api/n8n/ai-studio/campaigns/route.ts:18` does it.
2. Body `{ prompt: string; previous_image_url?: string }`. 400 on a blank prompt.
3. If `previous_image_url` is present, **host-allowlist it** — it must start with
   `https://zuajkdttqzgwwdnsjmjk.supabase.co/`; 400 otherwise. It comes from an
   LLM. One `startsWith`; do not make it a config toggle.
4. Call OpenRouter with `Authorization: Bearer ${process.env.OPENROUTER_API_KEY}`
   using **whichever shape T002 confirmed** (spec §2 — shape A `/api/v1/images`
   or shape B `/api/v1/chat/completions`). Model id in **one** module constant.
   Include the refinement parameter only when a previous URL was given.
5. Decode the base64 to a Buffer from the path T002 recorded — `data[0].b64_json`
   under shape A, or the `data:` URL's payload at
   `choices[0].message.images[0].image_url.url` under shape B. If no image is
   present, return a **502 carrying the upstream message** — the model can
   decline a prompt, and the agent needs to be told that rather than shown a
   generic failure.
6. Upload inline (~6 lines, mirroring
   `src/app/api/admin/upload/route.ts:42-56`): bucket `7alm`, path
   `ai-studio/${crypto.randomUUID()}.${ext}`, `contentType` = the returned MIME
   type, then `getPublicUrl`. **Derive `ext` from that MIME type** — do not
   hardcode `.png`. A `image/jpeg` payload stored as `.png` is served with the
   wrong `Content-Type`, and Instagram's fetcher cares.
7. `console.log` the response's `usage.cost` so spend is observable (spec §7).
8. Return `NextResponse.json({ success: true, url })`. Errors return
   `{ success: false, error }`.

**Never echo base64 in a response.** Spec §0 proof 3 — the response goes straight
into the agent's context window.

*(No shared storage helper: one caller. No `/uploads` route: nothing ingests.)*

### T011 · `ad_campaigns.image_url` — `@backend`
Migration `docs/migrations/<ts>_ad_campaigns_image_url.sql`:
```sql
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS image_url text;
```
Apply via the Supabase MCP; keep the file as the checked-in record per the
`docs/migrations/` convention. Additive only — nothing else is touched.

### T012 · Types + campaign route pass-through — `@backend`
- `src/features/shared/types.ts`: `image_url: string | null` on `AdCampaign`
  (~line 582); `image_url?: string | null` on `AdCampaignInput` (~line 603).
- `src/app/api/n8n/ai-studio/campaigns/route.ts`: accept `image_url`; when
  present, validate only that it is a string starting with `https://`.
  **Do not make it required** — text-only campaigns stay legal (FR-010).
- `campaigns.repository.ts` / `campaigns.service.ts`: pass through, no logic.

### T013 · `generate_campaign_image` tool — `@n8n`
New `n8n-nodes-base.httpRequestTool` (typeVersion 4.4) wired to
`Generate FB Post` by an `ai_tool` connection. **Copy the node shape of the
existing `save_campaign` node verbatim** — method/url/`sendHeaders`/
`headerParameters`/`sendBody`/`specifyBody: json`/`jsonBody` with `$fromAI(...)`/
`options.response.response.neverError: true`.

- URL: `https://7alm-pro.up.railway.app/api/n8n/ai-studio/images`
- Headers: `Content-Type: application/json`, `x-n8n-access-token: 123456`
- Body: `{ "prompt": {{ JSON.stringify($fromAI('prompt', 'Detailed visual description of the campaign image, in English', 'string')) }} }`
  *(`previous_image_url` is added in Phase 2 — leave it out now.)*
- **Note this tool hits our own API, not OpenRouter.** It needs **no**
  credential — unlike `search_web`, which uses
  `authentication: predefinedCredentialType` + `nodeCredentialType: openRouterApi`.
  The OpenRouter key lives in the Next.js route now (spec §3). Do not attach the
  OpenRouter credential here.
- `toolDescription` in Egyptian Arabic, matching the register of the existing
  tools. It must state: returns a `url`; the agent must **restate that URL in
  every subsequent campaign proposal** so it survives the 10-message memory
  window (spec §4); and the agent must never invent an image URL — the existing
  prompt discipline already forbids that, and this tool is now the sanctioned way
  to get one.

### T014 · Show the image in Telegram — `@n8n` — **blocking for Phase 2**
Without this the owner never sees the image, so they can neither approve nor
refine it.

After `Generate FB Post`, insert:
- `Has Image?` (`n8n-nodes-base.if`)
- `Send Campaign Photo` (`n8n-nodes-base.telegram`, `operation: sendPhoto`,
  `binaryData: false`, `chatId` = the same expression `Send Reply` uses:
  `{{ $('Receive Telegram Messages').item.json.message.chat.id }}`).
  **No caption** — `additionalFields.caption` caps at 1024 chars and campaign
  proposals exceed it; Telegram would 400 the send.
- Wire: `Has Image?` true → `Send Campaign Photo` → `Send Reply`;
  false → `Send Reply`. Photo first, then the full text.
- `onError: continueRegularOutput` on `Send Campaign Photo`. If Telegram rejects
  the photo the branch must not die, or the owner gets **nothing** — not even the
  campaign copy.

**Where the URL comes from — an IF node cannot hand a value downstream.** It
evaluates a boolean and passes the item through unchanged. Two options, in order:

1. **Reference the tool node's recorded output.** `makeHandleToolInvocation`
   calls `context.addOutputData(AiTool, runIndex, [[{ json: { response } }]])`,
   so the tool sub-node does record output. **Try
   `{{ $('generate_campaign_image').last().json.response.url }}` in a test
   execution first.** If it resolves, use it for both the `Has Image?` condition
   (exists) and the `file` parameter. This is the route's actual return value —
   strictly better than option 2.
2. **Fallback if it does not resolve** (tool sub-nodes are not main-graph nodes
   and may not be addressable): regex the agent's prose, **independently in both
   places** —
   `{{ $json.output.match(/https:\/\/zuajkdttqzgwwdnsjmjk\.supabase\.co\/storage\/v1\/object\/public\/7alm\/ai-studio\/[^\s)\]"']+/g)?.pop() }}`.
   This makes the outbound image path depend on the model choosing to write the
   URL into its reply — the **same** single point of failure as the §4 memory
   mitigation. Both fail together. Check it deliberately in T017.

`sendPhoto`'s `file` accepting an HTTP URL is confirmed at
`/var/www/html/old/n8n/packages/nodes-base/nodes/Telegram/Telegram.node.ts:1152`.

### T015 · System prompt — image behaviour — `@n8n`
Extend the `Generate FB Post` `systemMessage` in Egyptian Arabic **without
touching any existing publishing rule** — that path is live production:
- when proposing a campaign, **offer** a visual in words and call
  `generate_campaign_image` only once the owner says yes (each generation costs
  money — spec Open Question 2);
- build the prompt from the negotiated campaign (niche, objective, headline,
  audience), in English, describing a square image unless told otherwise;
- always restate the current image URL in the proposal;
- on approval pass it to `save_campaign` as `image_url`, and to
  `publish_photo_post` / `create_instagram_media` / `publish_tiktok_post` when
  publishing;
- never fabricate a URL — the existing rule, now with a sanctioned alternative.

### T016 · `save_campaign` gains `image_url` — `@n8n`
Add to that node's `jsonBody`, matching its existing optional-field idiom:
```
"image_url": {{ JSON.stringify($fromAI('image_url', 'Absolute https URL of the approved campaign image, if one was generated', 'string', '') || null) }}
```

### T017 · Dashboard thumbnail — `@frontend`
`src/components/admin/ai-studio/CampaignsList.tsx`: when `campaign.image_url` is
set, render a thumbnail at the start of the card, wrapped in an anchor to the
full image. Follow that file's existing conventions — logical properties
(`ms-*`/`me-*`/`text-start`, never `ml-*`/`text-left`), and every new string
through `t(key)` against `src/features/i18n/dictionary.ts` under `aiStudio.*`,
in **both `en` and `ar`**. Plain `<img>` (what the rest of the admin uses for
user-uploaded media) unless `next/image` is already configured for the Supabase
host.

### T018 · Phase 1 checks — `@backend` + `@n8n`
`npx tsc --noEmit` and `npm run build` pass. Then live: ask the bot for a
campaign with a visual and confirm
(a) an image renders in Telegram;
(b) the n8n execution log shows the tool result is a small JSON object and
**not** base64 (spec SC-005);
(c) whichever URL-extraction option T014 landed on actually fires — this is the
flaky one;
(d) approval writes `ad_campaigns.image_url` and it renders in
`/admin/ai-studio`;
(e) the voice, plain-text, and FB/IG/TikTok paths are unchanged.

---

## Phase 2 — Conversational refine

No new infrastructure, no schema change, no new node.

### T020 · Route accepts `previous_image_url` — `@backend`
Already specified in T010 steps 3-4. If it was built then, this is verification
only: the allowlist rejects a non-Supabase host, and a previous URL plus a change
instruction returns a different image.

### T021 · Tool gains the parameter — `@n8n`
Add to `generate_campaign_image`'s `jsonBody`:
```
"previous_image_url": {{ JSON.stringify($fromAI('previous_image_url', 'The URL of the current campaign image to modify; omit to generate a brand new one', 'string', '') || null) }}
```
Extend the `toolDescription` to say that passing the current URL plus a change
instruction produces a revised image.

**If T002 found `input_references` unsupported on this model:** keep the exact
same parameter and wiring — the route ignores it — and instead instruct the agent
in T022 to fold the requested change into a **full new prompt**. The owner-facing
behaviour is identical; only the drift differs.

### T022 · System prompt — refine loop — `@n8n`
Image changes work like copy changes: apply the requested change, re-present the
whole campaign with the new image. **Add the drift guidance** (spec §6): after
several rounds, prefer regenerating from the original brief with a cumulative
instruction over chaining edit-on-edit indefinitely — each round is a fresh
generation, so fine detail wanders.

### T023 · Phase 2 check — `@n8n`
Generate an image, then send "خليه أفتح شوية". A visibly lighter image comes back
in the same conversation, and the campaign text is re-presented with it.

---

## Not tasks

- **Print-ready UV files** — spec §6. A separate deterministic build
  (`sharp`/ImageMagick + per-case-model template with an alpha mask, fixed DPI
  and bleed). Ruled out by the user, recorded so the outputs are never mistaken
  for production files.
- **Inbound owner photos / the `Voice or Text?` switch.** Out of scope — the
  switch is not edited. Do not "fix" the missing `message.photo` branch.
- **Garbage-collecting unapproved images.** Every rejected iteration leaves an
  object in the bucket; megabytes per month. Add a cleanup only if it shows up on
  a bill.
- Carousels, dashboard-side generation, video, a spend cap.
