// ULID generator — monotonic, lexicographically sortable, 26 chars.
// No external deps, WebCrypto-compatible.

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LEN = 10;
const RANDOM_LEN = 16;

let lastTime = 0;
let lastRandom: Uint8Array = new Uint8Array(RANDOM_LEN);

export function ulid(): string {
  const now = Date.now();
  let timeChars = encodeTime(now);

  let random: Uint8Array;
  if (now <= lastTime) {
    // Monotonic increment
    increment(lastRandom);
    random = lastRandom;
  } else {
    random = crypto.getRandomValues(new Uint8Array(RANDOM_LEN));
    lastRandom = random;
    lastTime = now;
  }

  const randomChars = encodeRandom(random);
  return timeChars + randomChars;
}

function encodeTime(ms: number): string {
  let str = "";
  let time = ms;
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    const mod = time % 32;
    str = ENCODING[mod] + str;
    time = Math.floor(time / 32);
  }
  return str;
}

function encodeRandom(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < RANDOM_LEN; i++) {
    str += ENCODING[bytes[i] % 32];
  }
  return str;
}

function increment(bytes: Uint8Array): void {
  for (let i = bytes.length - 1; i >= 0; i--) {
    if (bytes[i] < 255) {
      bytes[i]++;
      return;
    }
    bytes[i] = 0;
  }
}

export function uuid(): string {
  return crypto.randomUUID();
}
