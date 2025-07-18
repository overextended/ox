import { expect, test } from 'bun:test';
import { waitFor } from 'waitFor';

test('waitFor resolve', async () => {
  expect(await waitFor(async () => 'a')).toBe('a');
});

test('waitFor reject', async () => {
  expect(await waitFor(async () => null, { timeout: 5000 }).catch(() => null)).toBe(null);
});
