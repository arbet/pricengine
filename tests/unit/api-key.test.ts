import { describe, it, expect } from "vitest";
import { hashApiKey, generateApiKey } from "@/lib/auth/api-key";

describe("hashApiKey", () => {
  it("produces a deterministic 64-character hex digest", () => {
    const h = hashApiKey("lce-deadbeef");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey("lce-deadbeef")).toBe(h);
  });

  it("produces different digests for different keys", () => {
    expect(hashApiKey("key-one")).not.toBe(hashApiKey("key-two"));
  });

  it("does not return the plaintext key", () => {
    const plain = "lce-supersecret";
    expect(hashApiKey(plain)).not.toContain(plain);
  });
});

describe("generateApiKey", () => {
  it("prefixes the key with the lowercased org code", () => {
    expect(generateApiKey("LCE")).toMatch(/^lce-[0-9a-f]{48}$/);
  });

  it("generates a unique key on each call", () => {
    expect(generateApiKey("LCE")).not.toBe(generateApiKey("LCE"));
  });
});
