import { Hono } from "hono";
import type { AppContext } from "../db/client";
import { rateLimit } from "../middleware/rateLimit";

export const qrRoutes = new Hono<AppContext>();

// Styled QR code design for PPI Darusy Syahadah alumni profiles.
// Matches the pesantren green theme: radial green gradient on off-white.
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
  bodyColor: "#000000",
  bgColor: "#FBFBFB",
  eye1Color: "#000000",
  eye2Color: "#000000",
  eye3Color: "#000000",
  eyeBall1Color: "#000000",
  eyeBall2Color: "#000000",
  eyeBall3Color: "#000000",
  gradientColor1: "#109B20",
  gradientColor2: "#171816",
  gradientType: "radial",
  gradientOnEyes: true,
  logo: "",
  logoMode: "default",
};

const QR_MONKEY_ENDPOINT = "https://api.qrcode-monkey.com//qr/custom";

// GET /api/qr/styled?url=<profile url>
// Proxies the qrcode-monkey styled QR API server-side to avoid browser CORS
// restrictions, then fetches and returns the rendered SVG. Falls back to a
// 502 on any upstream failure so the client can render a simple QR instead.
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

    const payload = JSON.stringify({
      data: targetUrl,
      config: QR_CONFIG,
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
      return c.json({ error: "Gagal membuat QR styled" }, 502);
    }

    // imageUrl is protocol-relative ("//api.qrcode-monkey.com/tmp/...svg").
    const svgUrl = imageUrl.startsWith("//") ? `https:${imageUrl}` : imageUrl;

    try {
      const svgRes = await fetch(svgUrl);
      if (!svgRes.ok) throw new Error(`Gagal mengambil SVG: ${svgRes.status}`);
      const svg = await svgRes.text();
      c.header("Content-Type", "image/svg+xml; charset=utf-8");
      c.header("Cache-Control", "public, max-age=86400");
      return c.body(svg);
    } catch {
      return c.json({ error: "Gagal mengambil SVG" }, 502);
    }
  },
);
