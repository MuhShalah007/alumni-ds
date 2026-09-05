import { Hono } from "hono";
import type { AppContext } from "../db/client";
import { rateLimit } from "../middleware/rateLimit";

export const qrRoutes = new Hono<AppContext>();

// Styled QR code design for PPI Darusy Syahadah alumni profiles.
// Matches the pesantren green theme: radial green gradient on off-white.
// The Darusy Syahadah logo is embedded natively via the qrcode-monkey `logo`
// field (base64 data URI) so the API applies proper error correction and the
// QR remains scannable. No client-side overlay needed.
const QR_CONFIG = {
  body: "japnese",
  eye: "frame1",
  eyeBall: "ball1",
  erf1: ["fh"],
  erf2: [] as string[],
  erf3: ["fh", "fv"],
  brf1: ["fh"],
  brf2: [] as string[],
  brf3: ["fh", "fv"],
  bodyColor: "gradient",
  bgColor: "#FBFBFB",
  eye1Color: "#109B20",
  eye2Color: "#109B20",
  eye3Color: "#109B20",
  eyeBall1Color: "#109B20",
  eyeBall2Color: "#109B20",
  eyeBall3Color: "#109B20",
  gradientColor1: "#109B20",
  gradientColor2: "#171816",
  gradientType: "radial",
  gradientOnEyes: true,
  logoMode: "default",
};

// The Darusy Syahadah logo as a base64 data URI, embedded at build time
// so we don't depend on an external fetch at runtime. The SVG is the same
// favicon used by the PWA (public/icons/favicon.svg).
const LOGO_SVG_BASE64 =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiByb2xlPSJpbWciIGFyaWEtbGFiZWw9IkxvZ28gQnVrdSBBbHVtbmkgRGFydXN5IFN5YWhhZGFoIj4KICA8dGl0bGU+QnVrdSBBbHVtbmkg4oCUIFBvbmRvayBQZXNhbnRyZW4gSXNsYW0gRGFydXN5IFN5YWhhZGFoPC90aXRsZT4KICA8IS0tIEdyZWVuIHJvdW5kZWQgc3F1YXJlIGJhY2tncm91bmQgLS0+CiAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSIyMiIgZmlsbD0iIzA4NzM0OCIvPgoKICA8IS0tIEhpbGFsIChjcmVzY2VudCkg4oCUIElzbGFtaWMgaWRlbnRpdHkgLS0+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI5IiByPSIzIiBmaWxsPSIjZmZmZmZmIi8+CiAgPGNpcmNsZSBjeD0iNTEuNiIgY3k9IjguMiIgcj0iMi40IiBmaWxsPSIjMDg3MzQ4Ii8+CgogIDwhLS0gRG9tZSBmaW5pYWwgLS0+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSIxNC41IiByPSIyIiBmaWxsPSIjZmZmZmZmIi8+CiAgPHJlY3QgeD0iNDkuMjUiIHk9IjE2IiB3aWR0aD0iMS41IiBoZWlnaHQ9IjUiIGZpbGw9IiNmZmZmZmYiLz4KCiAgPCEtLSBPbmlvbiBkb21lIHNpbGhvdWV0dGUgLS0+CiAgPHBhdGggZD0iTSAzNCA1OCBDIDM0IDUwIDI3IDQzIDMxIDMzIEMgMzUgMjUgNDIgMjEgNTAgMjEgQyA1OCAyMSA2NSAyNSA2OSAzMyBDIDczIDQzIDY2IDUwIDY2IDU4IFoiIGZpbGw9IiNmZmZmZmYiLz4KCiAgPCEtLSBPcGVuIGJvb2s6IHR3byBwYWdlcyBzcHJlYWRpbmcgZnJvbSBjZW50ZXIgc3BpbmUgLS0+CiAgPHBhdGggZD0iTSA1MCA2NCBDIDQ0IDYyIDM0IDYyIDI2IDY2IEwgMjYgODQgQyAzNCA4MiA0NCA4MiA1MCA4NiBaIiBmaWxsPSIjZmZmZmZmIi8+CiAgPHBhdGggZD0iTSA1MCA2NCBDIDU2IDYyIDY2IDYyIDc0IDY2IEwgNzQgODQgQyA2NiA4MiA1NiA4MiA1MCA4NiBaIiBmaWxsPSIjZmZmZmZmIi8+CgogIDwhLS0gU3BpbmUgdmFsbGV5IC0tPgogIDxwYXRoIGQ9Ik0gNTAgNjQgTCA1MCA4NiIgc3Ryb2tlPSIjMDg3MzQ4IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+CgogIDwhLS0gUGFnZSBsaW5lcyAobGVmdCkgLS0+CiAgPHBhdGggZD0iTSAzMSA3MCBDIDM3IDY4LjUgNDMgNjguNSA0NyA3MC41IiBzdHJva2U9IiMwODczNDgiIHN0cm9rZS13aWR0aD0iMS4yIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiLz4KICA8cGF0aCBkPSJNIDMxIDc1IEMgMzcgNzMuNSA0MyA3My41IDQ3IDc1LjUiIHN0cm9rZT0iIzA4NzM0OCIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPgoKICA8IS0tIFBhZ2UgbGluZXMgKHJpZ2h0KSAtLT4KICA8cGF0aCBkPSJNIDUzIDcwLjUgQyA1NyA2OC41IDYzIDY4LjUgNjkgNzAiIHN0cm9rZT0iIzA4NzM0OCIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIvPgogIDxwYXRoIGQ9Ik0gNTMgNzUuNSBDIDU3IDczLjUgNjMgNzMuNSA2OSA3NSIgc3Ryb2tlPSIjMDg3MzQ4IiBzdHJva2Utd2lkdGg9IjEuMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+Cjwvc3ZnPgo=";


const QR_MONKEY_ENDPOINT = "https://api.qrcode-monkey.com/qr/custom";

// KV cache TTL: 30 days in seconds.
const QR_CACHE_TTL = 30 * 24 * 60 * 60;

/** Stable SHA-256 hex hash of a URL, used as the KV cache key suffix. */
async function hashUrl(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Fetch a fresh styled QR SVG from qrcode-monkey for the given URL. */
async function fetchStyledQr(targetUrl: string): Promise<string | null> {
  // Embed the logo natively so qrcode-monkey applies error correction.
  const config = { ...QR_CONFIG, logo: LOGO_SVG_BASE64 };

  const payload = JSON.stringify({
    data: targetUrl,
    config,
    size: 1000,
    download: "imageUrl",
    file: "svg",
  });

  let imageUrl: string;
  try {
    // qrcode-monkey expects text/plain content-type (not application/json).
    const apiRes = await fetch(QR_MONKEY_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=UTF-8" },
      body: payload,
    });
    if (!apiRes.ok) throw new Error(`QR API gagal: ${apiRes.status}`);
    const data = (await apiRes.json()) as { imageUrl?: string };
    if (!data.imageUrl) throw new Error("QR API tidak mengembalikan URL");
    imageUrl = data.imageUrl;
  } catch {
    return null;
  }

  // imageUrl is protocol-relative ("//api.qrcode-monkey.com/tmp/...svg").
  const svgUrl = imageUrl.startsWith("//") ? `https:${imageUrl}` : imageUrl;

  try {
    const svgRes = await fetch(svgUrl);
    if (!svgRes.ok) throw new Error(`Gagal mengambil SVG: ${svgRes.status}`);
    return await svgRes.text();
  } catch {
    return null;
  }
}

/** Fallback: fetch a simple unstyled QR SVG from api.qrserver.com. */
async function fetchFallbackQr(targetUrl: string): Promise<string | null> {
  try {
    const svgRes = await fetch(
      `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(targetUrl)}&format=svg`,
    );
    if (!svgRes.ok) return null;
    const text = await svgRes.text();
    if (!text.startsWith("<")) return null;
    return text;
  } catch {
    return null;
  }
}

// GET /api/qr/styled?url=<profile url>
// Proxies the qrcode-monkey styled QR API server-side to avoid browser CORS
// restrictions, then fetches and returns the rendered SVG. The SVG is cached
// in the RATE_LIMIT KV namespace (keyed `qr:{sha256(url)}`) for 30 days so
// repeated profile views don't re-hit the upstream API. If qrcode-monkey fails,
// falls back to api.qrserver.com before returning a 502. The X-QR-Source
// response header indicates which upstream produced the SVG.
qrRoutes.get(
  "/styled",
  rateLimit({ prefix: "qr", maxRequests: 30, windowMs: 600_000 }),
  async (c) => {
    const targetUrl = c.req.query("url");
    if (!targetUrl) return c.json({ error: "Parameter url wajib diisi" }, 400);

    // Validate it is a well-formed http(s) URL and cap length to deter abuse.
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return c.json({ error: "URL tidak valid" }, 400);
    }
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || targetUrl.length > 2048) {
      return c.json({ error: "URL tidak valid" }, 400);
    }

    const cacheKey = `qr:${await hashUrl(targetUrl)}`;
    const forceRefresh = c.req.query("nocache") === "1";

    // 1. Check KV cache first (skip when client explicitly requests a
    //    fresh generation via nocache=1).
    if (!forceRefresh) {
      const cached = await c.env.RATE_LIMIT.get(cacheKey);
      if (cached) {
        c.header("Content-Type", "image/svg+xml; charset=utf-8");
        c.header("Cache-Control", "public, max-age=86400");
        c.header("X-QR-Cache", "HIT");
        return c.body(cached);
      }
    }

    // 2. Cache miss — generate fresh SVG from qrcode-monkey.
    let svg = await fetchStyledQr(targetUrl);
    if (svg) {
      c.header("X-QR-Source", "qrcode-monkey");
    }

    // 2b. Fallback to simple QR if qrcode-monkey fails.
    if (!svg) {
      svg = await fetchFallbackQr(targetUrl);
      if (svg) {
        c.header("X-QR-Source", "fallback");
      }
    }

    // 2c. If both fail, return 502.
    if (!svg) return c.json({ error: "Gagal membuat QR" }, 502);

    // 3. Store in KV for 30 days (fire-and-forget; don't block the response).
    c.executionCtx.waitUntil(
      c.env.RATE_LIMIT.put(cacheKey, svg, { expirationTtl: QR_CACHE_TTL }),
    );

    c.header("Content-Type", "image/svg+xml; charset=utf-8");
    c.header("Cache-Control", "public, max-age=86400");
    c.header("X-QR-Cache", "MISS");
    return c.body(svg);
  },
);
