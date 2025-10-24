import { describe, expect, it } from 'bun:test';
import { Vector2, Vector3, Vector4 } from '../src/vector.js';

describe('Vector2', () => {
  it('should construct with default y = 0', () => {
    const v = new Vector2(5);
    expect(v.x).toBe(5);
    expect(v.y).toBe(0);
  });

  it('should perform vector addition', () => {
    const v = new Vector2(2, 3).add({ x: 1, y: 2 });
    expect(v.x).toBe(3);
    expect(v.y).toBe(5);
  });

  it('should normalize correctly', () => {
    const v = new Vector2(3, 4).normalize();
    expect(v.length()).toBeCloseTo(1, 5);
  });

  it('should calculate dot product', () => {
    const a = new Vector2(1, 2);
    const b = new Vector2(3, 4);
    expect(a.dot(b)).toBe(11);
  });

  it('should allow swizzle', () => {
    const v = new Vector2(2, 4).swizzle('yx');
    expect(v.x).toBe(4);
    expect(v.y).toBe(2);
  });
});

describe('Vector3', () => {
  it('should construct with default y = 0, z = 0', () => {
    const v = new Vector3(2);
    expect(v.x).toBe(2);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  it('should compute cross product', () => {
    const a = new Vector3(1, 0, 0);
    const b = new Vector3(0, 1, 0);
    const c = a.cross(b);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
    expect(c.z).toBe(1);
  });

  it('should throw on dot with unequal size', () => {
    const a = new Vector3(1, 2, 3);
    const b = new Vector2(4, 5);
    expect(() => a.dot(b as any)).toThrow();
  });
});

describe('Vector4', () => {
  it('should construct with default y = 0, z = 0, w = 0', () => {
    const v = new Vector4(1);
    expect(v.x).toBe(1);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
    expect(v.w).toBe(0);
  });

  it('should swizzle to xyz', () => {
    const v = new Vector4(1, 2, 3, 4);
    const swizzled = v.swizzle('zyx');
    expect(swizzled.x).toBe(3);
    expect(swizzled.y).toBe(2);
    expect(swizzled.z).toBe(1);
  });
});

describe('Vector base class', () => {
  it('should clone correctly', () => {
    const v = new Vector3(1, 2, 3);
    const clone = v.clone();
    expect(clone.equals(v)).toBe(true);
    expect(clone).not.toBe(v);
  });

  it('should copy values', () => {
    const a = new Vector4(1, 1, 1, 1);
    const b = new Vector4(4, 3, 2, 1);
    a.copy(b);
    expect(a.equals(b)).toBe(true);
  });

  it('should calculate distance and distanceSquared', () => {
    const a = new Vector2(0, 0);
    const b = new Vector2(3, 4);
    expect(a.distanceSquared(b)).toBe(25);
    expect(a.distance(b)).toBe(5);
  });

  it('should create from array', () => {
    const v = Vector3.fromArray([1, 2, 3]);
    expect(v.z).toBe(3);
  });

  it('should create from object', () => {
    const v = Vector3.fromInput({ x: 1, y: 2, z: 3 });
    expect(v.z).toBe(3);
  });

  it('should throw for invalid constructor args', () => {
    //@ts-expect-error
    expect(() => new Vector2('not a number')).toThrow(TypeError);
  });

  it('should convert to string', () => {
    const v = new Vector4(1, 2, 3, 4);
    expect(v.toString()).toBe('vector4(1, 2, 3, 4)');
  });

  it('should operate with scalar multiply', () => {
    const v = new Vector3(1, 2, 3).multiply(2);
    expect(v.equals(new Vector3(2, 4, 6))).toBe(true);
  });

  it('should iterate components', () => {
    const v = new Vector4(1, 2, 3, 4);
    const result = [...v];
    expect(result).toEqual([1, 2, 3, 4]);
  });
});
