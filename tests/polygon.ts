import { describe, expect, test } from "bun:test";
import { Polygon, ExtrudedPolygon } from "../src/polygon";
import { Vector2 } from "../src/vector";

describe("Polygon", () => {
  const triangle = new Polygon([
    new Vector2(0, 0),
    new Vector2(10, 0),
    new Vector2(5, 10),
  ]);

  test("throws with fewer than 3 vertices", () => {
    expect(() => new Polygon([])).toThrow();
    expect(() => new Polygon([new Vector2(0, 0)])).toThrow();
    expect(() => new Polygon([new Vector2(0, 0), new Vector2(1, 1)])).toThrow();
  });

  test("contains() correctly identifies inside/outside points", () => {
    expect(triangle.contains(5, 5)).toBe(true);
    expect(triangle.contains(0, 0)).toBe(true);
    expect(triangle.contains(5, -1)).toBe(false);
    expect(triangle.contains(100, 100)).toBe(false);
  });

  test(".area returns correct signed area", () => {
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

    expect(clockwise.signedArea).toBeLessThan(0);
    expect(counterClockwise.signedArea).toBeGreaterThan(0);
    expect(clockwise.area).toBeCloseTo(25);
  });

  test(".centroid returns geometric centre", () => {
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

  test(".bounds returns correct AABB", () => {
    const bounds = triangle.bounds;
    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(10);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(10);
  });
});

describe("ExtrudedPolygon", () => {
  const base = [new Vector2(0, 0), new Vector2(10, 0), new Vector2(5, 10)];
  const prism = new ExtrudedPolygon(base, 15, 5);

  test("throws on non-positive height", () => {
    expect(() => new ExtrudedPolygon(base, 0, 0)).toThrow();
    expect(() => new ExtrudedPolygon(base, -5, 1)).toThrow();
  });

  test("contains() correctly identifies inside/outside points", () => {
    expect(prism.contains(5, 5, 10)).toBe(true);
    expect(prism.contains(5, 5, 21)).toBe(false);
    expect(prism.contains(100, 100, 10)).toBe(false);
  });

  test(".volume returns area * height", () => {
    expect(prism.volume).toBeCloseTo(750);
  });

  test(".bounds returns correct AABB", () => {
    const bounds = prism.bounds;
    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(10);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(10);
    expect(bounds.minZ).toBe(5);
    expect(bounds.maxZ).toBe(20);
  });
});
