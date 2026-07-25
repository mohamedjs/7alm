# Feature Specification: Campaign Image Generation

**Feature Branch**: `014-campaign-image-generation`
**Created**: 2026-07-26
**Extends**: `specs/013-ai-studio/` — do not modify those files; this spec is additive.
**Status**: Specification only. Nothing built.

**Requirement** *(as settled with the user)*:

> Generate a campaign image from scratch with AI, based on the campaign being
> negotiated. Refine it conversationally if something needs changing. Save the
> final chosen image with the campaign in the database. Use an **OpenRouter**
> model — not Gemini — so there is no second vendor to pay.

### Settled decisions — do not re-litigate

| Question | Decision |
|---|---|
| Source of the image | **From scratch only.** The AI invents the visual from the negotiated campaign. No owner-sent photos, no `products.main_image`. |
| Vendor | **OpenRouter only.** The existing Gemini credential stays on audio transcription, untouched. |
| Print-ready UV files | **Out of scope entirely.** See §6. |
| Persistence | A **single** `image_url` on the campaign — "the final image choice", singular. |
| Approval | Same discipline as the copy: the owner sees it and approves in chat before anything is saved. |

Because the source is always a prompt, the **`Voice or Text?` switch is not
touched** and there is no inbound-photo path. That is the single biggest reason
this build is small.

---

## 0. Read this first — the forcing constraint

**No image bytes can travel through the agent's tool-result channel.** Not a
preference — enforced by n8n core. Three proofs, read from the local checkout at
`/var/www/html/old/n8n` (n8n `1.116.0`):

1. **Binary tool output is dropped or errors.**
   `packages/core/src/execution-engine/node-execution-context/utils/get-input-connection-data.ts:84-89`
   (`mapResult`): a tool returning only binary yields the literal string
   `'Error: The Tool attempted to return binary data, which is not supported in Agents'`.
   Mixed json+binary logs *"The binary data was omitted from the response"*.
2. **Tool sub-nodes receive json-only input.** Same file, `makeHandleToolInvocation`:
   `context.addInputData(NodeConnectionTypes.AiTool, [[{ json: toolArgs }]])`.
3. **Base64 in a JSON tool response poisons the conversation.** Tool results are
   returned as `JSON.stringify(response)` into the agent's context. `Post Memory`
   is a `memoryBufferWindow` with `contextWindowLength: 10`. OpenRouter's image
   endpoint returns **base64** (§2) — roughly 1.4 MB for a 1024px PNG. One
   generation would destroy the negotiation loop and the token budget.

**Consequence — the only viable shape:** an `httpRequestTool` that calls a **7alm
API route**, which talks to OpenRouter, stores the bytes, and returns a plain
public `https` URL as a short JSON string.

Proof 3 is what rules out the obvious build (`httpRequestTool` → OpenRouter
directly). An implementer who has not read this will try it first.

The constraint is also convenient: a public https URL is exactly what every
downstream consumer already needs — `publish_photo_post` (`url`),
`create_instagram_media`, `publish_tiktok_post`, Telegram `sendPhoto`, and the
dashboard.

---

## 1. Feasibility — verified against OpenRouter's live docs

**OpenRouter covers both generation and editing.** No fallback vendor needed, and
the existing credential `EbbUdiq5aCjllGWD` ("OpenRouter account") already funds
it.

| Capability | Verdict | Mechanism |
|---|---|---|
| Generate a campaign image from a prompt | ✅ | `POST /api/v1/images` with `{ model, prompt }` |
| Refine it conversationally | ✅ | Same call plus `input_references` carrying the previous image's URL |

**Model: `google/gemini-2.5-flash-image`** (Nano Banana) — served *through*
OpenRouter, so it bills against the OpenRouter account. Input and output
modalities are both text+images; the model page describes it as capable of
"image generation, edits, and multi-turn conversations". Pricing at time of
writing: **$0.30 / 1M input tokens, $2.50 / 1M output tokens**, and each response
carries a `usage.cost` field.

> Note for anyone reading the git history: this is the same underlying model an
> earlier draft reached directly via Google. Routing it through OpenRouter costs
> a small margin and buys one billing relationship instead of two — which is the
> user's stated reason for the decision.

---

## 2. The OpenRouter contract

Shape A, as documented — **but read the verification note below before building
against it**:

```
POST https://openrouter.ai/api/v1/images
Authorization: Bearer <OPENROUTER_API_KEY>
Content-Type: application/json

{
  "model": "google/gemini-2.5-flash-image",
  "prompt": "<the visual description>",
  "input_references": [                          // omit when generating from scratch
    { "type": "image_url", "image_url": { "url": "https://…/previous.png" } }
  ]
}
```

Response:

```json
{
  "created": 1748372400,
  "data": [ { "b64_json": "<base64>", "media_type": "image/png" } ],
  "usage": { "prompt_tokens": 0, "completion_tokens": 4175, "total_tokens": 4175, "cost": 0.04 }
}
```

- Image bytes: **`data[0].b64_json`** — base64, **not** a URL. `media_type`
  carries the MIME type.
- Editing input: `input_references` accepts **HTTP(S) URLs or base64 data
  URLs**. Our stored images already have public https URLs, so the refine path
  passes a URL straight through — **no fetching or re-encoding on our side**.

### ⚠️ This contract is UNVERIFIED — confirm it with one `curl` before coding (T002)

Everything above — the endpoint, the request field names, and the response path —
comes from **summaries of OpenRouter's docs pages, not from an observed
response**. Two specific reasons to distrust it until curled:

- Not one quoted doc example pairs `/api/v1/images` with
  `google/gemini-2.5-flash-image`. The examples use `bytedance-seed/seedream-4.5`
  and `openai/gpt-image-1`. `input_references` in particular is only ever shown
  with `openai/gpt-image-1`.
- OpenRouter's model page describes the integration as *"OpenAI-compatible…
  minimal modification to the base URL and model identifier"*, which is
  chat-completions language, and a search summary claimed image output on this
  model goes through **`/api/v1/chat/completions` with
  `modalities: ["image","text"]`** instead.

**Shape B — try this if `/api/v1/images` 404s or rejects the model:**

```
POST https://openrouter.ai/api/v1/chat/completions
{ "model": "google/gemini-2.5-flash-image",
  "messages": [{ "role": "user", "content": "<prompt>" }],
  "modalities": ["image", "text"] }
```

with the image expected at `choices[0].message.images[0].image_url.url`, most
likely a `data:image/png;base64,…` URL rather than a hosted one. Under shape B
there is no `input_references`: refinement would pass the prior image as an image
part inside `messages`, the same way vision input works.

**Neither the architecture nor the route's job changes between the two shapes** —
parse, decode base64, upload, return `{ url }`. Only the parsing differs, so
this is a fifteen-minute pivot inside T010 and nothing else in the build moves.

**If `input_references` (or the shape-B equivalent) does not work at all**, do
**not** switch vendors.
Fall back to **regenerate-from-an-amended-prompt**: the owner's "change X" is
folded into a new full prompt and a fresh image is generated. The refine loop
still works from the owner's point of view. Say so plainly in the system-prompt
guidance — a regenerated image differs *everywhere*, not just in the requested
detail, so the owner will see more drift between rounds than a targeted edit
would produce.

---

## 3. The bytes → public URL pipeline (the crux)

```
Telegram (owner)
  └─> Generate FB Post  [langchain agent]
        └─ tool: generate_campaign_image   (httpRequestTool, JSON in / JSON out)
             POST https://7alm-pro.up.railway.app/api/n8n/ai-studio/images
             header: x-n8n-access-token: 123456
             body:   { prompt, previous_image_url? }
                                │
                                ▼
        ┌──────────────────────────────────────────────────────────┐
        │ Next.js  POST /api/n8n/ai-studio/images                   │
        │  1. requireN8nAccess(req)                                 │
        │  2. POST openrouter /api/v1/images  (OPENROUTER_API_KEY)  │
        │       + input_references if previous_image_url            │
        │  3. Buffer.from(data[0].b64_json, "base64")               │
        │  4. supabase.storage.from('7alm')                         │
        │       .upload(`ai-studio/${randomUUID()}.png`, buffer)    │
        │  5. .getPublicUrl(path)                                   │
        │  6. return { success: true, url }        ← ~120 bytes     │
        └──────────────────────────────────────────────────────────┘
                                │
                                ▼
   agent receives a short URL string; holds it in Post Memory; then
     ├─> restates it in its next proposal (keeps it inside the 10-msg window)
     ├─> passes it back as previous_image_url to refine
     ├─> passes it to publish_photo_post / create_instagram_media / publish_tiktok_post
     ├─> passes it to save_campaign as image_url  → ad_campaigns.image_url
     └─> the workflow sends it to Telegram as a photo (§4)
```

**Why the route lives in Next.js.** §0 proof 3, and it is the only process that
can hold `OPENROUTER_API_KEY` and the Supabase service-role key together. This
puts an outbound third-party call inside Next.js, which slightly bends spec 013's
*"n8n owns external I/O; Next.js owns truth"* rule — name it and accept it. The
*conversation* still lives entirely in n8n; this route is a stateless
byte-transformation with no reasoning in it.

**Why the app needs its own `OPENROUTER_API_KEY`** even though n8n already holds
an OpenRouter credential: that credential is only usable from n8n nodes, and the
node that would use it is exactly the one proof 3 forbids. Same account, same
billing — one more environment variable. `.env.local` currently has
`GEMINI_API_TOKEN` and **no** OpenRouter key.

### Storage

- **Bucket**: reuse `7alm` (`src/app/api/admin/upload/route.ts:43`).
- **Prefix**: `ai-studio/`, not that route's hardcoded `product/`. Generated
  marketing assets are not product media.
- **Public-ness must be verified, not assumed.** `getPublicUrl()` returns a URL
  for a private bucket too — it just 400s when fetched. The evidence that `7alm`
  is public is that product images uploaded through `/api/admin/upload` render on
  the public storefront. Confirm with one unauthenticated `curl` (T001). If it is
  private, Instagram/TikTok publishing cannot work at all and that must be fixed
  first.

### Do not reuse `/api/admin/upload`

It already does storage → public URL, but it is guarded by admin JWT +
`admins`-table membership and takes multipart. n8n has only
`x-n8n-access-token`. Widening it to accept both is the wrong fix: spec 013
FR-010 makes the split a stated rule (`/api/admin/*` = `verifyAdmin`,
`/api/n8n/*` = `requireN8nAccess`), and a dual-auth route is what gets copied
wrong next. The upload is ~6 lines inline in the new route.

*(An earlier draft also specced a separate `/api/n8n/ai-studio/uploads` route for
ingesting owner-sent photos. With from-scratch-only generation nothing ingests —
that route is gone, and with one caller left there is no shared helper to extract
either.)*

---

## 4. Showing the image in Telegram — required, not polish

**Current gap:** `Send Reply` is `n8n-nodes-base.telegram` with
`text: {{ $json.output }}` — a plain `sendMessage`. The agent could obtain a URL
and merely *mention* it. **The owner cannot approve or refine an image they
cannot see**, so this is load-bearing for both the approval discipline and the
refine loop.

Verified against
`/var/www/html/old/n8n/packages/nodes-base/nodes/Telegram/Telegram.node.ts`:

- `operation: sendPhoto`, `binaryData: false`, `file` accepts *"an HTTP URL for
  Telegram to get a photo from the Internet"* (line 1152) — the public Supabase
  URL goes straight in; no binary handling anywhere in the workflow.
- `additionalFields.caption` exists for `sendPhoto` (lines 1592-1607) but is
  **capped at 1024 characters**. A full campaign proposal exceeds that and
  Telegram will 400 the send.

**So: photo with no caption, then the existing text reply.**

```
Generate FB Post ──> Has Image? (IF)
                      ├─ true  ──> Send Campaign Photo (sendPhoto, no caption) ──> Send Reply
                      └─ false ─────────────────────────────────────────────────> Send Reply
```

**Where the photo node gets the URL.** An IF node evaluates a boolean and passes
the item through unchanged — it cannot capture a value for a downstream node.
Preferred source is the tool node's own recorded output:
`$('generate_campaign_image').last().json.response.url`, which exists because
`makeHandleToolInvocation` calls
`context.addOutputData(AiTool, runIndex, [[{ json: { response } }]])`. Verify it
resolves in a test execution — tool sub-nodes are not main-graph nodes.

Fallback if it does not resolve: regex the agent's prose, anchored on the storage
prefix — `https://zuajkdttqzgwwdnsjmjk\.supabase\.co/storage/v1/object/public/7alm/ai-studio/[^\s)\]"']+`,
taking the **last** match, evaluated independently in both the IF condition and
the `file` parameter. **That fallback makes the outbound image path depend on the
model choosing to write the URL into its reply — the same single point of failure
as the memory mitigation below. Both fail together**, so check it deliberately in
T009 rather than meeting it later as an intermittent flake.

`Send Campaign Photo` gets `onError: continueRegularOutput`: if Telegram rejects
the photo, the owner must still receive the campaign text.

**Memory window.** `Post Memory` holds 10 messages; across a long negotiation the
image URL can fall out and the agent loses the image it is meant to be refining.
Mitigation, no infrastructure: the tool description instructs the agent to
**restate the current image URL in every campaign proposal**. Because the photo
branch also puts the URL in the visible reply, it stays in the agent's own
history. Skipped: a per-chat URL store — add one only if this observably fails.

---

## 5. Data model

**`ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS image_url text;`**

That is the entire schema change, and it is what "save the final image choice"
asks for — singular.

**Why one column, primarily — symmetry with how copy is already handled.** Today
only the **approved** ad copy is persisted; the drafts and revisions negotiated
in chat are never written anywhere. The image obeys the same rule: iterations
live in n8n's per-chat memory (and as orphaned objects in storage), and only the
approved one lands on the row.

**Why not `generated_assets`.** It exists but models a different problem: a QA
workflow (`status: pending_review|approved|rejected_qa`, `qa_notes`) hanging off
`design_versions` → `design_ideas`, a table set spec 013 deliberately does not
use. Reusing it needs `design_version_id`'s NOT NULL dropped, a new
`ad_campaign_id` FK, and its `asset_type` CHECK widened — three pieces of surgery
to inherit a state machine nothing here needs. **Why not a new table:** one
campaign, one visual. A table buys carousels and variant history nobody asked
for; revive `generated_assets` properly the day a carousel is requested.

Downstream, all mechanical:

- `src/features/shared/types.ts` — `image_url: string | null` on `AdCampaign`
  (~line 582), `image_url?: string | null` on `AdCampaignInput` (~line 603).
- `POST /api/n8n/ai-studio/campaigns` — accept `image_url`; validate only that it
  is an `https://` string when present. **Not required** — a text-only campaign
  stays legal.
- `campaigns.repository.ts` / `campaigns.service.ts` — pass through, no logic.
- `save_campaign` n8n tool — one more `$fromAI` field.
- `CampaignsList.tsx` — thumbnail when set.

**Orphaned storage objects are accepted.** Every rejected iteration leaves a file
in the bucket. `ponytail:` no GC job — megabytes per month at this volume; add a
cleanup only if it ever shows up on a bill.

---

## 6. Honest quality note — what these images are and are not

**As ad creative: good.** A current image model producing an on-brand marketing
visual from a campaign brief is a solved problem, and refinement instructions
("brighter", "different background") work well.

**Two things nobody should later mistake:**

1. **These are not print-ready production files.** A generative model does not
   respect geometry. If an image shows a phone case, the camera cutout will be a
   plausible invention rather than a real model's, and bleed, exact placement,
   scale and DPI will all be wrong. If a print-accurate file is ever wanted, that
   is a *different, deterministic* build — a real per-case-model template with an
   alpha mask, fixed DPI and bleed, composited with `sharp` or ImageMagick, no
   generative model involved. Explicitly out of scope; recorded here only so
   these outputs are never handed to a printer.
2. **Refinement drifts.** Each round is a fresh generation conditioned on the
   previous image, not a layer edit, so fine detail wanders over four or five
   rounds. If the §2 fallback is in play it drifts *more*. Mitigation is
   behavioural: prefer re-generating from the original brief with a cumulative
   instruction over chaining edits indefinitely.

---

## 7. Security

- **`OPENROUTER_API_KEY` is a new server secret** (§3), and must be set in
  `.env.local` **and** on Railway. Same failure shape as spec 013's T052: unset →
  the route fails → the agent apologises in chat → the conversation looks healthy
  while nothing works.
- **`previous_image_url` is host-allowlisted** to
  `zuajkdttqzgwwdnsjmjk.supabase.co`. We never fetch it ourselves (OpenRouter
  does), so this is not an SSRF fix — it stops an LLM-supplied URL from pushing
  arbitrary third-party content through the vendor and into an ad. One
  `startsWith` check.
- **Both new surfaces are `requireN8nAccess`-guarded.** Nothing here is public
  and nothing uses admin auth.
- **Cost is metered per image.** Log the response's `usage.cost` server-side so
  spend is observable; an agent generating in a loop is the realistic failure
  mode. Logging only — no cap in this cut.
- **No new secret enters a git-tracked file.** The workflow sends only
  `x-n8n-access-token: 123456`, the existing repo convention (literals, never
  `$env`). `OPENROUTER_API_KEY` lives only in the Next.js environment.

---

## Requirements

- **FR-001**: The agent MUST generate a campaign image from a text prompt it
  derives from the negotiated campaign, on the owner's request.
- **FR-002**: The agent MUST support conversational refinement of that image — by
  true edit if `input_references` works on the model, otherwise by regeneration
  from an amended prompt (§2).
- **FR-003**: Image generation MUST use the existing OpenRouter account. No
  Gemini image call, no new vendor.
- **FR-004**: Every generated image MUST be stored in Supabase Storage and
  represented everywhere — to the agent, to publish tools, to the dashboard — as
  a **public https URL**, never as bytes or base64.
- **FR-005**: The owner MUST see the image rendered in Telegram before approving.
- **FR-006**: The approved image URL MUST be saved on the `ad_campaigns` row and
  shown in `/admin/ai-studio`.
- **FR-007**: Nothing is persisted without the same explicit chat approval that
  already gates the copy (spec 013 FR-005).
- **FR-008**: The new route MUST be n8n-only (`requireN8nAccess`) and
  `previous_image_url` MUST be host-allowlisted.
- **FR-009**: The existing FB/IG/TikTok publish path, the voice path, and the
  text path of `telegram-fb-post-workflow.json` MUST be unchanged — that workflow
  is live production. In particular the `Voice or Text?` switch is not edited.
- **FR-010**: A campaign MUST remain saveable with no image.

### Non-goals

Print-ready UV files (§6). Owner-supplied source photos. Product images as a
source. Multiple images / carousels. Dashboard-side generation. Video. GC of
unapproved images. A spend cap.

## Success Criteria

- **SC-001**: The owner asks for a visual and an image appears in the Telegram
  chat, followed by the campaign text.
- **SC-002**: "خليه أفتح شوية" produces a visibly changed image in the same
  conversation.
- **SC-003**: On approval, `ad_campaigns.image_url` holds that image and it
  renders in `/admin/ai-studio`.
- **SC-004**: The agent can publish to Instagram/TikTok — which it cannot do
  today for lack of an image URL it is permitted to invent.
- **SC-005**: No base64 ever enters the agent's context. Verifiable in the n8n
  execution log: the tool result is a JSON object of roughly 120 bytes.
- **SC-006**: `npx tsc --noEmit` and `npm run build` pass; the voice, text, and
  FB/IG/TikTok paths behave exactly as before.

## Phasing

**Phase 1 — Generate.** Route, `OPENROUTER_API_KEY`, `ad_campaigns.image_url`
plus its type/route/tool plumbing, the `generate_campaign_image` tool, the
`sendPhoto` branch, the dashboard thumbnail. **Ships alone**, and also unblocks
Instagram/TikTok publishing, which the agent refuses today for lack of a
legitimate image URL.

**Phase 2 — Refine.** One extra parameter on the route and the tool, plus prompt
guidance. No new infrastructure, no schema change, no new node.

## Open Questions

1. **Aspect ratio** — the model's is configurable. Square (1:1) is assumed as the
   safe Instagram/Facebook default. Confirm, or say if 4:5 / 9:16 is wanted.
2. **Should the agent offer an image on every campaign proposal, or only when
   asked?** Offering by default spends money on proposals that get discarded;
   waiting to be asked means the owner has to remember. Assumed: **offer in
   words, generate only on a yes.**

*(Everything else is settled: from-scratch only, OpenRouter only, one stored
image, no print files.)*
