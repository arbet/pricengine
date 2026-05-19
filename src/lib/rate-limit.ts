/**
 * In-memory fixed-window rate limiter.
 *
 * Note: state is per-process. With multiple instances behind a load balancer
 * each instance enforces the limit independently. For strict global limits,
 * back this with a shared store (Redis/Upstash) — see issue #5.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, win] of windows) {
    if (win.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const win = windows.get(key);
  if (!win || win.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  win.count += 1;
  if (win.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((win.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP from common proxy headers. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
