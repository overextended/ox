export interface WaitForOptions {
  /**
   * Maximum time in milliseconds to wait before rejecting the promise.
   * If omitted or 0, no timeout will occur.
   */
  timeout?: number;

  /**
   * Interval in milliseconds to poll the predicate function.
   * Defaults to 0, which schedules checks on the event loop without delay.
   */
  interval?: number;
}

/**
 * Creates a promise that will be resolved after `ms`.
 * @param ms The time until the promise will be resolved.
 */
export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for a value to be returned from the given function.
 *
 * The predicate is checked repeatedly until it returns something
 * that isn't `null` or `undefined`, and the promise is resolved with that value.
 *
 * If a timeout is given and the time runs out, the promise is rejected instead.
 */
export async function waitFor<T>(
  predicate: () => T | Promise<T>,
  options?: number | WaitForOptions,
): Promise<NonNullable<T>> {
  let response = await predicate();

  if (response != null) return response;

  let timer: ReturnType<typeof setInterval>;
  const timeout = (typeof options === 'object' && options?.timeout) ?? 0;
  const interval =
    (typeof options === 'object' ? options?.timeout : options) ?? 0;

  return new Promise((resolve, reject) => {
    timer = setInterval(async () => {
      try {
        response = await predicate();

        if (response != null) {
          clearInterval(timer);
          resolve(response);
        }
      } catch (err) {
        reject(err);
      }
    }, interval);

    if (!timeout) return;

    setTimeout(() => {
      clearInterval(timer);
      reject(`Failed to resolve before ${timeout}ms timeout`);
    }, timeout);
  });
}

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
  '1': getRandomInt,
  a: getRandomChar,
  A: getRandomChar,
  '.': getRandomAlphanumeric,
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
  length: number = pattern.replace(/\^/g, '').length,
): string {
  let str = '';
  let i = 0;

  while (str.length < length) {
    const char = pattern[i];

    if (char === undefined) break;

    if (char === '^') {
      const next = pattern[++i];
      if (next !== undefined) str += next;
    } else {
      const fn = PatternChar[char];
      str += fn ? fn(char === 'a') : char;
    }

    i++;
  }

  if (str.length < length) str += ' '.repeat(length - str.length);

  return str;
}
