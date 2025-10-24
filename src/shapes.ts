import { clamp } from 'math.js';
import { Vector2, Vector3 } from 'vector.js';

export interface Bounds2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Bounds3D extends Bounds2D {
  minZ: number;
  maxZ: number;
}

export interface Shape2D {
  area: number;
  centroid: Readonly<Vector2>;
  bounds: Bounds2D;
}

export interface Shape3D {
  volume: number;
  centroid: Readonly<Vector3>;
  bounds: Bounds3D;
}

/**
 * Represents a 2D circle.
 */
export class Circle implements Shape2D {
  readonly coords: Vector2;
  readonly radius: number;
  readonly area: number;
  #bounds?: Readonly<Bounds2D>;

  /**
   * Creates a new circle.
   * @param coords The centre of the circle.
   * @param radius The radius of the circle.
   */
  constructor(coords: Vector2, radius: number) {
    if (radius <= 0) throw new Error('Radius must be positive.');

    this.coords = coords;
    this.radius = radius;
    this.area = Math.PI * this.radius ** 2;
  }

  /**
   * Calculates the axis-aligned bounding box of the circle.
   */
  public calculateBounds() {
    const { x, y } = this.coords;
    const r = this.radius;

    return { minX: x - r, minY: y - r, maxX: x + r, maxY: y + r };
  }

  /**
   * Checks if a point (x, y) lies within the circle.
   * @param x The x coordinate of the point.
   * @param y The y coordinate of the point.
   */
  public contains(x: number, y: number) {
    const dx = x - this.coords.x;
    const dy = y - this.coords.y;

    return dx * dx + dy * dy <= this.radius ** 2;
  }

  /**
   * The axis-aligned bounding box of the circle.
   */
  public get bounds() {
    return (this.#bounds ??= Object.freeze(this.calculateBounds()));
  }

  /**
   * The geometric centre of the circle.
   */
  public get centroid() {
    return this.coords;
  }

  /**
   * Returns a deep clone of the circle.
   */
  public clone() {
    return new Circle(new Vector2(this.coords.x, this.coords.y), this.radius);
  }

  /**
   * Returns the closest point on the circle's circumference to a given point.
   * @param point The point to project onto the circle.
   */
  public closestPoint(point: Vector2) {
    const direction = point.clone().subtract(this.coords);
    const distance = direction.length();

    if (distance === 0) {
      direction.x = this.coords.x + this.radius;
      direction.y = this.coords.y;

      return direction;
    }

    direction.multiply(this.radius / distance);

    return direction.add(this.coords);
  }
}

/**
 * Represents a 3D cylinder formed by extruding a circle along the Z axis.
 */
export class Cylinder implements Shape3D {
  readonly circle: Circle;
  readonly z: number;
  readonly height: number;
  #bounds?: Readonly<Bounds3D>;
  #centroid?: Readonly<Vector3>;

  /**
   * Creates a new cylinder.
   * @param coords The centre of the cylinder's base.
   * @param radius The radius of the cylinder.
   * @param height The height of the cylinder.
   * @param z The Z coordinate of the base.
   */
  constructor(coords: Vector2, radius: number, height: number, z: number) {
    if (height <= 0) throw new Error('Height must be positive number.');

    this.circle = new Circle(coords, radius);
    this.z = z;
    this.height = height;
  }

  /**
   * Calculates the axis-aligned bounding box of the cylinder.
   */
  public calculateBounds() {
    const bounds2D = this.circle.calculateBounds();

    return {
      ...bounds2D,
      minZ: this.z,
      maxZ: this.z + this.height,
    };
  }

  /**
   * Calculates the geometric centre of the cylinder.
   */
  public calculateCentroid() {
    const { x, y } = this.circle.centroid;
    return new Vector3(x, y, this.z + this.height / 2);
  }

  /**
   * The volume of the cylinder.
   */
  public get volume() {
    return this.circle.area * this.height;
  }

  /**
   * The axis-aligned bounding box of the cylinder.
   */
  public get bounds() {
    return (this.#bounds ??= Object.freeze(this.calculateBounds()));
  }

  /**
   * The geometric centre of the cylinder.
   */
  public get centroid() {
    return (this.#centroid ??= Object.freeze(this.calculateCentroid()));
  }

  /**
   * Checks if a point (x, y, z) lies within the cylinder.
   * @param x The x coordinate of the point.
   * @param y The y coordinate of the point.
   * @param z The z coordinate of the point.
   */
  public contains(x: number, y: number, z?: number) {
    if (z !== undefined && (z < this.z || z > this.z + this.height))
      return false;
    return this.circle.contains(x, y);
  }

  /**
   * Returns a deep clone of the cylinder.
   */
  public clone() {
    return new Cylinder(
      new Vector2(this.circle.coords.x, this.circle.coords.y),
      this.circle.radius,
      this.height,
      this.z,
    );
  }

  /**
   * Returns the closest point on the cylinder's surface to a given point.
   * @param point The point to project onto the cylinder.
   */
  public closestPoint(point: Vector3) {
    const direction = new Vector2(point.x, point.y).subtract(
      this.circle.coords,
    );

    const distance = direction.length();

    if (distance === 0) {
      direction.x = this.circle.coords.x + this.circle.radius;
      direction.y = this.circle.coords.y;
    } else {
      direction.multiply(this.circle.radius / distance);
      direction.add(this.circle.coords);
    }

    const z = clamp(point.z, this.z, this.z + this.height);

    return new Vector3(direction.x, direction.y, z);
  }
}

/**
 * Represents a 3D sphere.
 */
export class Sphere implements Shape3D {
  readonly coords: Vector3;
  readonly radius: number;
  #bounds?: Readonly<Bounds3D>;

  /**
   * Creates a new sphere.
   * @param coords The centre of the sphere.
   * @param radius The radius of the sphere.
   */
  constructor(coords: Vector3, radius: number) {
    if (radius <= 0) throw new Error('Radius must be positive.');

    this.coords = coords;
    this.radius = radius;
  }

  /**
   * Calculates the axis-aligned bounding box of the sphere.
   */
  public calculateBounds() {
    const { x, y, z } = this.coords;
    const r = this.radius;

    return {
      minX: x - r,
      minY: y - r,
      minZ: z - r,
      maxX: x + r,
      maxY: y + r,
      maxZ: z + r,
    };
  }

  /**
   * Checks if a point (x, y, z) lies within the sphere.
   * @param x The x coordinate of the point.
   * @param y The y coordinate of the point.
   * @param z The z coordinate of the point.
   */
  public contains(x: number, y: number, z: number) {
    const dx = x - this.coords.x;
    const dy = y - this.coords.y;
    const dz = z - this.coords.z;

    return dx * dx + dy * dy + dz * dz <= this.radius ** 2;
  }

  /**
   * Calculates the geometric centre of the sphere.
   */
  public calculateCentroid() {
    return this.coords;
  }

  /**
   * The volume of the sphere.
   */
  public get volume() {
    return (4 / 3) * Math.PI * this.radius ** 3;
  }

  /**
   * The axis-aligned bounding box of the sphere.
   */
  public get bounds() {
    return (this.#bounds ??= Object.freeze(this.calculateBounds()));
  }

  /**
   * The geometric centre of the sphere.
   */
  public get centroid() {
    return this.coords;
  }

  /**
   * Returns a deep clone of the sphere.
   */
  public clone() {
    return new Sphere(
      new Vector3(this.coords.x, this.coords.y, this.coords.z),
      this.radius,
    );
  }

  /**
   * Returns the closest point on the sphere's surface to a given point.
   * @param point The point to project onto the sphere.
   */
  public closestPoint(point: Vector3) {
    const direction = point.clone().subtract(this.coords);
    const distance = direction.length();

    if (distance === 0) {
      direction.x = this.coords.x + this.radius;
      direction.y = this.coords.y;
      direction.z = this.coords.z;

      return direction;
    }

    direction.multiply(this.radius / distance);

    return direction.add(this.coords);
  }
}
