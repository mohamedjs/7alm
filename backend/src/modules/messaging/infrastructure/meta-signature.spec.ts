import { describe, expect, it } from "vitest";
import { signMetaBody, verifyMetaSignature } from "./meta-signature";

describe("verifyMetaSignature", () => {
  const body = Buffer.from('{"object":"page","entry":[{"id":"1","messaging":[{"message":{"text":"\\u0645\\u0631\\u062d\\u0628\\u0627"}}]}]}');
  it("accepts the right signature over the raw bytes", () => {
    expect(verifyMetaSignature(body, signMetaBody(body, "s3cret"), "s3cret")).toBe(true);
  });
  it("rejects tampering, wrong secret, wrong algorithm and missing header", () => {
    const sig = signMetaBody(body, "s3cret");
    expect(verifyMetaSignature(Buffer.from(body.toString() + " "), sig, "s3cret")).toBe(false);
    expect(verifyMetaSignature(body, sig, "other")).toBe(false);
    expect(verifyMetaSignature(body, sig.replace("sha256", "sha1"), "s3cret")).toBe(false);
    expect(verifyMetaSignature(body, undefined, "s3cret")).toBe(false);
  });
  it("differs from a hash of the re-serialised JSON (why raw bytes matter)", () => {
    const reserialised = Buffer.from(JSON.stringify(JSON.parse(body.toString())));
    expect(verifyMetaSignature(reserialised, signMetaBody(body, "k"), "k")).toBe(false);
  });
});
