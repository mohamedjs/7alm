import { describe, expect, it } from "vitest";
import { assertCanPrivateReply, decideSendMode } from "./policies";

const now = new Date("2026-11-12T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);

describe("decideSendMode", () => {
  it("free inside 24h", () => expect(decideSendMode("whatsapp", hoursAgo(23), now)).toEqual({ mode: "free" }));
  it("WhatsApp needs a template after 24h", () => {
    expect(() => decideSendMode("whatsapp", hoursAgo(25), now)).toThrow(/24-hour/);
    expect(decideSendMode("whatsapp", hoursAgo(25), now, "order_followup")).toEqual({ mode: "template", template: "order_followup" });
  });
  it("Messenger human agent up to 7 days, then blocked", () => {
    expect(decideSendMode("messenger", hoursAgo(48), now)).toEqual({ mode: "human_agent" });
    expect(() => decideSendMode("instagram", hoursAgo(24 * 8), now)).toThrow(/7 days/);
  });
});

describe("assertCanPrivateReply", () => {
  it("allows one reply within 7 days", () => {
    expect(() => assertCanPrivateReply({ commentedAt: hoursAgo(10), privateReplySentAt: null, isFromBusiness: false }, now)).not.toThrow();
    expect(() => assertCanPrivateReply({ commentedAt: hoursAgo(10), privateReplySentAt: hoursAgo(1), isFromBusiness: false }, now)).toThrow(/already/);
    expect(() => assertCanPrivateReply({ commentedAt: hoursAgo(24 * 8), privateReplySentAt: null, isFromBusiness: false }, now)).toThrow(/7 days/);
  });
});
