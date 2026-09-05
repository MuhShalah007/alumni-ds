// Client-side phone normalization (mirrors server logic for form preview)
export function normalizePhone(input: string): string | null {
  if (!input) return null;
  let cleaned = input.trim().replace(/[^\d+]/g, "");
  const hadPlus = cleaned.startsWith("+");
  if (hadPlus) cleaned = cleaned.slice(1);
  if (!/^\d+$/.test(cleaned)) return null;

  if (cleaned.startsWith("08")) {
    cleaned = "628" + cleaned.slice(2);
  } else if (cleaned.startsWith("628")) {
    // keep
  } else if (cleaned.startsWith("8") && cleaned.length >= 9) {
    cleaned = "628" + cleaned;
  } else if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else {
    if (cleaned.length < 8) return null;
  }

  return "+" + cleaned;
}

export function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return phone.slice(0, 6) + "*".repeat(Math.max(4, phone.length - 10)) + phone.slice(-4);
}
