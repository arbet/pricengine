import { describe, it, expect, vi, afterEach } from "vitest";
import { rateLimit, clientIp } from "@/lib/rate-limit";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const key = `t-allow-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks each key independently", () => {
    const a = `t-a-${Math.random()}`;
    const b = `t-b-${Math.random()}`;
    expect(rateLimit(a, 1, 60_000).allowed).toBe(true);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    // b is untouched by a's exhaustion
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });

  it("resets once the window elapses", () => {
    vi.useFakeTimers();
    const key = `t-window-${Math.random()}`;
    expect(rateLimit(key, 1, 1_000).allowed).toBe(true);
    expect(rateLimit(key, 1, 1_000).allowed).toBe(false);
    vi.advanceTimersByTime(1_001);
    expect(rateLimit(key, 1, 1_000).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the first entry of x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" });
    expect(clientIp(h)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "198.51.100.2" });
    expect(clientIp(h)).toBe("198.51.100.2");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
