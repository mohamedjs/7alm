# Meta integration (Facebook Page, Instagram, WhatsApp Cloud API)

Read from Meta's developer documentation on 2026-11-12. Graph API version is configurable (`META_GRAPH_VERSION`, default `v27.0`).

## What 7alm does

| Channel | Receives | Replies |
| --- | --- | --- |
| Messenger (Page inbox) | `messages`, `messaging_postbacks`, echoes, deliveries, reads | Send API — `RESPONSE` inside 24 h, `MESSAGE_TAG` + `HUMAN_AGENT` up to 7 days |
| Facebook Page comments | `feed` (`item=comment`) | Public reply `POST /{comment-id}/comments`; one private reply `POST /{page-id}/messages {recipient:{comment_id}}`; hide `POST /{comment-id} {is_hidden}` |
| Instagram Direct | `messages` on the IG professional account | `POST /{ig-id}/messages` (same windows) |
| Instagram comments | `comments` / `live_comments` | Public reply `POST /{ig-comment-id}/replies`; private reply `POST /{ig-id}/messages {recipient:{comment_id}}`; hide `POST /{ig-comment-id}?hide=true` |
| WhatsApp Cloud API | `messages` (inbound + statuses) | `POST /{phone-number-id}/messages` text inside 24 h; approved template outside it |

All Graph calls use `graph.facebook.com` (Facebook Login for Business) with the Page token.

## Setup checklist

1. **Create a Meta app** (type *Business*) at developers.facebook.com. Add products: *Messenger*, *Instagram* (API setup with Facebook Login), *WhatsApp*, *Webhooks*.
2. **Env** (`.env.production`): `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `META_APP_SECRET` (same secret — used to verify signatures), `META_WEBHOOK_VERIFY_TOKEN` (any random string), `SOCIAL_MOCK_MODE=0`.
3. **Webhooks**: callback URL `https://<DOMAIN>/api/webhooks/meta`, verify token = `META_WEBHOOK_VERIFY_TOKEN`.
   - Page object: subscribe `messages`, `messaging_postbacks`, `message_echoes`, `message_deliveries`, `message_reads`, `feed`.
   - Instagram object: `messages`, `comments`, `live_comments`.
   - WhatsApp Business Account: `messages`.
4. **Connect**: Admin → Connections → Facebook. 7alm exchanges the code for a long-lived user token, picks the Page (`META_PAGE_ID` if set, else the first granted), stores the **Page token** encrypted (AES-256-GCM), records the linked Instagram account id, and calls `POST /{page-id}/subscribed_apps`.
   Or skip OAuth and set `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, `META_IG_ACCOUNT_ID` directly.
5. **WhatsApp**: Admin → Connections → WhatsApp (finds WABA + phone number id and subscribes the app), or set `META_WHATSAPP_PHONE_NUMBER_ID` + `META_WHATSAPP_TOKEN` (a System User token is recommended — it does not expire). Optional `META_WHATSAPP_FALLBACK_TEMPLATE` reopens a chat after 24 h.
6. **App Review** (to serve Pages/accounts the app owner does not own — Advanced Access): `pages_show_list`, `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`, `pages_manage_engagement`, `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments`, `whatsapp_business_messaging`, `whatsapp_business_management`, `business_management`. Until approved, the app works for accounts with a role on the app.

## Rules enforced in code

| Rule | Where |
| --- | --- |
| Signature `X-Hub-Signature-256 = sha256=HMAC(app secret, raw body)`, checked before JSON is used | `messaging/infrastructure/meta-signature.ts`, raw body kept in `main.ts` |
| Verify handshake: echo `hub.challenge` only when `hub.verify_token` matches, else 403 | `messaging/presentation/meta-webhook.controller.ts` |
| 200 fast: webhook → outbox → Kafka → worker | `AcceptMetaWebhook` / `ProcessMetaWebhook` |
| Each event once (Meta retries) — Redis key per `mid` / `wamid` / comment+verb, 7 days | `ProcessMetaWebhook` |
| 24 h free window, 7 d human agent (Messenger/IG), template outside 24 h (WhatsApp) | `messaging/domain/policies.ts → decideSendMode` |
| One private reply per comment, within 7 days, never to our own comment | `assertCanPrivateReply` + pending-reply check |
| IG comment id is `comment_id` (FB Login) or `id` (IG Login) | `meta-webhook.parser.ts → parseIgComment` |
| WhatsApp users with only a username: fall back to `from_user_id` / `user_id` (BSUID) | `parseWhatsApp` |
| Statuses never move backwards (`read` after `delivered`; `failed` always wins) | `InboxRepository.applyStatus` |
| Permanent Graph errors (bad token, closed window, permission) mark the message failed; transient ones retry then DLQ | `GraphApiClient` + `DeliverOutbound` |
| Echoes (replies sent from Meta Business Suite / the IG app) are recorded as outbound, not answered | parser `isEcho` |

## Testing without a Meta app

- `backend/src/modules/messaging/domain/__fixtures__/meta-payloads.ts` holds payloads shaped after the reference docs; `meta-webhook.parser.spec.ts` covers all of them.
- `node --env-file=.env backend/test/meta-smoke.mjs` signs and posts webhooks to a running stack and walks the whole inbox flow. Without a Page token the final send fails cleanly with "Facebook Page is not connected" — the expected result until credentials exist.

**Not verified end to end:** real sends to Meta. That needs a Meta app, a Page / IG account / WhatsApp number with a role on the app, and (for public use) App Review.
