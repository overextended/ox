import { describe, it, expect, beforeEach } from 'bun:test';
import { Grid, type GridEntry } from '../src/grid.js';

function createEntry(x: number, y: number, radius = 1): GridEntry {
  return { coords: { x, y }, radius };
}

describe('Grid', () => {
  let grid = new Grid();

  beforeEach(() => {
    grid.clear();
  });

  it('adds and tracks a single entry', () => {
    const entry = createEntry(50, 50);
    grid.add(entry);

    expect(grid.has(entry)).toBe(true);
    expect(grid.size).toBe(1);
    expect(Array.from(grid.entries())).toContain(entry);
  });

  it('throws when adding a duplicate entry', () => {
    const entry = createEntry(10, 10);
    grid.add(entry);

    expect(() => grid.add(entry)).toThrow();
  });

  it('removes an entry', () => {
    const entry = createEntry(20, 20);
    grid.add(entry);

    const result = grid.remove(entry);
    expect(result).toBe(true);
    expect(grid.has(entry)).toBe(false);
    expect(grid.size).toBe(0);
  });

  it('gracefully fails when removing non-existent entry', () => {
    const entry = createEntry(100, 100);
    expect(grid.remove(entry)).toBe(false);
  });

  it('retrieves correct cell for a point', () => {
    const entry = createEntry(150, 250);
    grid.add(entry);

    const cell = grid.getCell({ x: 150, y: 250 });
    expect(Array.from(cell)).toContain(entry);
  });

  it('returns an empty set when cell is empty', () => {
    const cell = grid.getCell({ x: 999, y: 999 });
    expect(cell.size).toBe(0);
  });

  it('returns correct entries for an area', () => {
    const a = createEntry(200, 200, 25);
    const b = createEntry(230, 230, 25);
    const c = createEntry(800, 800);

    grid.add(a);
    grid.add(b);
    grid.add(c);

    const found = grid.getEntries({ x: 220, y: 220 });
    expect(found).toContain(a);
    expect(found).toContain(b);
    expect(found).not.toContain(c);
  });

  it('updates an entry’s position correctly', () => {
    const entry = createEntry(100, 100);
    grid.add(entry);
    grid.update(entry, { x: 300, y: 400 });

    const cell = grid.getCell({ x: 300, y: 400 });
    expect(Array.from(cell)).toContain(entry);
  });

  it('supports clearing all entries', () => {
    const a = createEntry(100, 100);
    const b = createEntry(200, 200);
    grid.add(a);
    grid.add(b);

    grid.clear();

    expect(grid.size).toBe(0);
    expect(Array.from(grid.entries())).toHaveLength(0);
  });

  it('returns all entries as an array', () => {
    const a = createEntry(1, 1);
    const b = createEntry(2, 2);
    grid.add(a);
    grid.add(b);

    const arr = grid.toArray();
    expect(arr).toContain(a);
    expect(arr).toContain(b);
    expect(arr).toHaveLength(2);
  });
});
