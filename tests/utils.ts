import { describe, it, expect } from 'bun:test';
import { waitFor } from '../src/utils.js';
import { getRandomString } from '../src/random.js';

describe('getRandomString', () => {
  it('generates string matching the pattern', () => {
    const pattern = '1aA.';
    const str = getRandomString(pattern);
    expect(str.length).toBe(4);
    expect(str[0]).toMatch(/\d/);
    expect(str[1]).toMatch(/[a-z]/);
    expect(str[2]).toMatch(/[A-Z]/);
    expect(str[3]).toMatch(/[a-zA-Z0-9]/);
  });

  it('handles escaping correctly', () => {
    const result = getRandomString('^1^a^A');
    expect(result).toBe('1aA');
  });
});

describe('waitFor', () => {
  it('resolves immediately if predicate returns non-null', async () => {
    expect(waitFor(() => 42)).resolves.toBe(42);
  });

  it('polls predicate until non-null value returned', async () => {
    let count = 0;

    const predicate = () => {
      count++;
      return count === 3 ? 'done' : null;
    };

    expect(waitFor(predicate, { interval: 0 })).resolves.toBe('done');
  });
});
