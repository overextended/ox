/**
 * Generates a random integer between min and max, defaulting to 0-9 (inclusive).
 */
export function getRandomInt(min = 0, max = 9) {
  if (min > max) [min, max] = [max, min];

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generates a random ASCII character. */
export function getRandomChar(lowercase?: boolean) {
  const str = String.fromCharCode(getRandomInt(65, 90));
  return lowercase ? str.toLowerCase() : str;
}

/** Generates a random innteger or ASCII character. */
export function getRandomAlphanumeric(lowercase?: boolean) {
  return Math.random() > 0.5 ? getRandomChar(lowercase) : getRandomInt();
}

const PatternChar: Record<string, (...args: any) => string | number> = {
  "1": getRandomInt,
  a: getRandomChar,
  A: getRandomChar,
  ".": getRandomAlphanumeric,
};

/**
 * Generates a string based on a pattern.
 *
 * - `1` = digit (0–9)
 * - `a` = lowercase letter
 * - `A` = uppercase letter
 * - `.` = alphanumeric (letter or digit)
 *
 * Use `^` to escape a pattern character and treat it literally (e.g., `^a` → "a").
 * All other characters are treated literally.
 */
export function getRandomString(
  pattern: string,
  length: number = pattern.replace(/\^/g, "").length
): string {
  let str = "";
  let i = 0;

  while (str.length < length) {
    const char = pattern[i];

    if (char === undefined) break;

    if (char === "^") {
      const next = pattern[++i];
      if (next !== undefined) str += next;
    } else {
      const fn = PatternChar[char];
      str += fn ? fn(char === "a") : char;
    }

    i++;
  }

  if (str.length < length) str += " ".repeat(length - str.length);

  return str;
}
