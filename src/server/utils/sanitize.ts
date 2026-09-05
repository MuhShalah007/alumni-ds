// XSS sanitization for free-text fields (motto, kesan_pesan, momen_berkesan).
// HTML entity encoding — no DOMPurify needed in Workers runtime.

const ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#47;",
};

export function sanitizeText(input: string): string {
  return input.replace(/[&<>"'/]/g, (char) => ENTITY_MAP[char] ?? char);
}

export function sanitizeFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      result[field] = sanitizeText(result[field] as string) as T[keyof T];
    }
  }
  return result;
}
