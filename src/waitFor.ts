interface Options {
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
 * Waits for a value to be returned from the given function.
 *
 * The predicate is checked repeatedly until it returns something
 * that isn't `null` or `undefined`, and the promise is resolved with that value.
 *
 * If a timeout is given and the time runs out, the promise is rejected instead.
 */
export async function waitFor<T>(
  predicate: () => T | Promise<T>,
  options?: Options
): Promise<T> {
  let response = await predicate();

  if (response != null) return response;

  const timeout = options?.timeout || 0;
  const interval = options?.interval || 0;
  let timer: ReturnType<typeof setInterval>;

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
