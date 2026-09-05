// E.164 phone number normalization for Indonesian mobile numbers.
// Handles 08xxx, 628xxx, 8xxx, +628xxx formats → +628xxx

const NON_DIGIT_PLUS = /[^\d+]/g;

export function normalizePhone(input: string): string | null {
  if (!input) return null;

  // Strip everything except digits and leading plus
  let cleaned = input.trim().replace(NON_DIGIT_PLUS, "");

  // Remove leading + if present, we'll re-add it
  const hadPlus = cleaned.startsWith("+");
  if (hadPlus) cleaned = cleaned.slice(1);

  // Must be all digits now
  if (!/^\d+$/.test(cleaned)) return null;

  // Indonesian mobile normalization
  if (cleaned.startsWith("08")) {
    // 08xxx → +628xxx
    cleaned = "628" + cleaned.slice(2);
  } else if (cleaned.startsWith("628")) {
    // already correct prefix, keep as-is
  } else if (cleaned.startsWith("8") && cleaned.length >= 9) {
    // 8xxx (without 0 or 62) → +628xxx
    cleaned = "628" + cleaned;
  } else if (cleaned.startsWith("62")) {
    // 62xxx but not 628 — not a mobile number, but keep +62
  } else if (cleaned.startsWith("0")) {
    // Other 0xx — landline, normalize to +62
    cleaned = "62" + cleaned.slice(1);
  } else {
    // Unknown format — return null if too short
    if (cleaned.length < 8) return null;
  }

  // Validate: +628 followed by 8-13 digits
  const result = "+" + cleaned;
  if (!/^\+628\d{8,13}$/.test(result) && !/^\+62\d{6,12}$/.test(result)) {
    return result.length > 6 ? result : null;
  }

  return result;
}

export function maskPhone(phone: string): string {
  // +6281234567890 → +62812****7890
  if (phone.length < 8) return phone;
  const prefix = phone.slice(0, 6);
  const suffix = phone.slice(-4);
  const stars = "*".repeat(Math.max(4, phone.length - 10));
  return `${prefix}${stars}${suffix}`;
}
