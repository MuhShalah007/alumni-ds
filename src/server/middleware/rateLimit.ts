import { createMiddleware } from "hono/factory";
import type { AppContext } from "../db/client";

// Sliding window rate limiter using KV namespace.
// key prefix differentiates endpoints. Returns 429 if exceeded.

interface RateLimitOptions {
  prefix: string;
  maxRequests: number;
  windowMs: number;
}

export function rateLimit(opts: RateLimitOptions) {
  return createMiddleware<AppContext>(async (c, next) => {
    const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
    const key = `rl:${opts.prefix}:${ip}`;
    const now = Date.now();

    const raw = await c.env.RATE_LIMIT.get(key);
    let timestamps: number[] = raw ? JSON.parse(raw) : [];

    // Prune entries outside window
    timestamps = timestamps.filter((ts) => now - ts < opts.windowMs);

    if (timestamps.length >= opts.maxRequests) {
      const retryAfter = Math.ceil(opts.windowMs / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, 429);
    }

    timestamps.push(now);
    await c.env.RATE_LIMIT.put(key, JSON.stringify(timestamps), {
      expirationTtl: Math.ceil(opts.windowMs / 1000),
    });

    await next();
  });
}
