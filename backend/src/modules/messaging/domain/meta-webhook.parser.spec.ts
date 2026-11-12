import { describe, expect, it } from "vitest";
import { parseMetaWebhook } from "./meta-webhook.parser";
import * as f from "./__fixtures__/meta-payloads";

describe("parseMetaWebhook", () => {
  it("Messenger text", () => {
    const [e] = parseMetaWebhook(f.messengerText);
    expect(e).toMatchObject({ kind: "message", channel: "messenger", accountId: "PAGE_1", contactId: "PSID_9", externalId: "m_abc", text: "السعر كام؟", isEcho: false });
  });

  it("Messenger echo is outbound from the page to the customer", () => {
    const [e] = parseMetaWebhook(f.messengerEcho);
    expect(e).toMatchObject({ kind: "message", accountId: "PAGE_1", contactId: "PSID_9", isEcho: true });
  });

  it("Messenger delivery receipts become statuses", () => {
    expect(parseMetaWebhook(f.messengerDelivery)).toEqual([expect.objectContaining({ kind: "status", externalId: "m_out_1", status: "delivered" })]);
  });

  it("Facebook feed: keeps comments, drops reactions, top-level parent is the post", () => {
    const events = parseMetaWebhook(f.facebookComment);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "comment", platform: "facebook", commentId: "POST_7_COMMENT_3", postId: "PAGE_1_POST_7", parentId: undefined, authorName: "Mona Ali" });
    expect((events[0] as { at: Date }).at.toISOString()).toBe(new Date(1762934500 * 1000).toISOString());
  });

  it("Instagram DM", () => {
    expect(parseMetaWebhook(f.instagramDm)[0]).toMatchObject({ channel: "instagram", accountId: "IG_1", contactId: "IGSID_4", externalId: "ig_mid_1" });
  });

  it("Instagram comments in both login shapes", () => {
    expect(parseMetaWebhook(f.instagramCommentFbLogin)[0]).toMatchObject({ platform: "instagram", commentId: "IGC_1", authorName: "sara.m", postId: "MEDIA_1" });
    expect(parseMetaWebhook(f.instagramCommentIgLogin)[0]).toMatchObject({ commentId: "IGC_2", authorName: "omar" });
  });

  it("WhatsApp text with profile name", () => {
    expect(parseMetaWebhook(f.whatsappText)[0]).toMatchObject({ channel: "whatsapp", accountId: "PNID_1", contactId: "201012345678", contactName: "Ahmed", text: "عايز اطلب" });
  });

  it("WhatsApp username-only user falls back to the BSUID; media caption is the text", () => {
    expect(parseMetaWebhook(f.whatsappUsernameOnly)[0]).toMatchObject({ contactId: "BSUID_77", contactName: "Hidden", type: "image", text: "ده المقاس", attachments: [{ type: "image", mediaId: "MEDIA_9" }] });
  });

  it("WhatsApp statuses with errors", () => {
    const events = parseMetaWebhook(f.whatsappStatuses);
    expect(events.map((e) => (e as { status: string }).status)).toEqual(["delivered", "failed"]);
    expect(events[1]).toMatchObject({ error: "131047 Re-engagement message" });
  });

  it("ignores junk", () => {
    expect(parseMetaWebhook(null)).toEqual([]);
    expect(parseMetaWebhook({ object: "user", entry: [{}] })).toEqual([]);
  });
});
