import { describe, expect, it } from 'bun:test';
import { Polygon, Prism } from '../src/geometry.js';
import { Vector2, Vector3 } from '../src/vector.js';

describe('Polygon', () => {
  const triangle = new Polygon([
    new Vector2(0, 0),
    new Vector2(10, 0),
    new Vector2(5, 10),
  ]);

  it('throws with fewer than 3 vertices', () => {
    expect(() => new Polygon([new Vector2(0, 0), new Vector2(1, 1)])).toThrow();
  });

  it('contains() correctly identifies inside/outside points', () => {
    expect(triangle.contains(5, 5)).toBe(true);
    expect(triangle.contains(0, 0)).toBe(true);
    expect(triangle.contains(5, -1)).toBe(false);
    expect(triangle.contains(100, 100)).toBe(false);
  });

  it('.area and .signedArea return correct values', () => {
    const clockwise = new Polygon([
      new Vector2(0, 0),
      new Vector2(5, 0),
      new Vector2(5, 5),
      new Vector2(0, 5),
    ]);

    const counterClockwise = new Polygon([
      new Vector2(0, 0),
      new Vector2(0, 5),
      new Vector2(5, 5),
      new Vector2(5, 0),
    ]);

    expect(clockwise.area).toEqual(25);
    expect(clockwise.signedArea).toEqual(-25);
    expect(counterClockwise.area).toEqual(25);
    expect(counterClockwise.signedArea).toEqual(25);
  });

  it('.centroid returns geometric centre', () => {
    const square = new Polygon([
      new Vector2(0, 0),
      new Vector2(0, 2),
      new Vector2(2, 2),
      new Vector2(2, 0),
    ]);
    const centroid = square.centroid;
    expect(centroid.x).toBeCloseTo(1);
    expect(centroid.y).toBeCloseTo(1);
  });

  it('.bounds returns correct AABB', () => {
    const bounds = triangle.bounds;
    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(10);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(10);
  });
});

describe('Prism', () => {
  const base = [new Vector2(0, 0), new Vector2(10, 0), new Vector2(5, 10)];
  const prism = new Prism(base, 15, 5);

  it('throws on non-positive height', () => {
    expect(() => new Prism(base, 0, 0)).toThrow();
    expect(() => new Prism(base, -5, 1)).toThrow();
  });

  it('contains() correctly identifies inside/outside points', () => {
    expect(prism.contains(5, 5, 10)).toBe(true);
    expect(prism.contains(5, 5, 21)).toBe(false);
    expect(prism.contains(100, 100, 10)).toBe(false);
  });

  it('.volume returns area * height', () => {
    expect(prism.volume).toBeCloseTo(750);
  });

  it('.bounds returns correct AABB', () => {
    const bounds = prism.bounds;
    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(10);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(10);
    expect(bounds.minZ).toBe(5);
    expect(bounds.maxZ).toBe(20);
  });
});

describe('Prism.createCuboid', () => {
  it('creates a cuboid with positive dimensions', () => {
    const cuboid = Prism.createCuboid(new Vector3(0, 0, 0), 2, 3, 4);
    expect(cuboid.bounds.minX).toBe(0);
    expect(cuboid.bounds.maxX).toBe(2);
    expect(cuboid.bounds.minY).toBe(0);
    expect(cuboid.bounds.maxY).toBe(3);
    expect(cuboid.bounds.minZ).toBe(0);
    expect(cuboid.bounds.maxZ).toBe(4);
    expect(cuboid.volume).toBeCloseTo(24);
  });

  it('creates a cuboid with negative width, depth, height', () => {
    const cuboid = Prism.createCuboid(new Vector3(0, 0, 0), -2, -3, -4);
    expect(cuboid.bounds.minX).toBe(-2);
    expect(cuboid.bounds.maxX).toBe(0);
    expect(cuboid.bounds.minY).toBe(-3);
    expect(cuboid.bounds.maxY).toBe(0);
    expect(cuboid.bounds.minZ).toBe(-4);
    expect(cuboid.bounds.maxZ).toBe(0);
    expect(cuboid.volume).toBeCloseTo(24);
  });

  it('creates a cuboid with mixed positive/negative dimensions', () => {
    const cuboid = Prism.createCuboid(new Vector3(1, 2, 3), 5, -2, 4);
    expect(cuboid.bounds.minX).toBe(1);
    expect(cuboid.bounds.maxX).toBe(6);
    expect(cuboid.bounds.minY).toBe(0);
    expect(cuboid.bounds.maxY).toBe(2);
    expect(cuboid.bounds.minZ).toBe(3);
    expect(cuboid.bounds.maxZ).toBe(7);
    expect(cuboid.volume).toBeCloseTo(40);
  });

  it('centroid is calculated correctly from base and dimensions', () => {
    const cuboid = Prism.createCuboid(new Vector3(0, 0, 0), 2, 4, 6);
    const c = cuboid.centroid;
    expect(c.x).toBeCloseTo(1);
    expect(c.y).toBeCloseTo(2);
    expect(c.z).toBeCloseTo(3);
  });
});
