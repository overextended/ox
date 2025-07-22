import { Vector2, Vector3 } from "vector.js";

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

/**
 * Represents a 2D polygon.
 */
export class Polygon {
  readonly vertices: ReadonlyArray<Vector2>;
  #signedArea?: number;
  #bounds?: Readonly<Bounds2D>;
  #centroid?: Readonly<Vector2>;

  /**
   * Creates a new 2D polygon.
   * @param vertices An array containing at least 3 vertices.
   */
  constructor(vertices: Vector2[]) {
    if (vertices.length < 3)
      throw new Error("A polygon requires at least 3 vertices.");

    this.vertices = vertices;
  }

  /**
   * Calculates the area of the polygon using the shoelace formula.
   *
   * @param signed If `true` returns the signed area, otherwise returns the absolute area of the polygon.
   */
  public calculateArea(signed = false): number {
    const vertices = this.vertices;
    let area = 0;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const { x: ax, y: ay } = vertices[i]!;
      const { x: bx, y: by } = vertices[j]!;

      area += ax * by - bx * ay;
    }

    area /= 2;

    return signed ? area : Math.abs(area);
  }

  /**
   * Calculates the axis-aligned bounding box of the polygon.
   */
  public calculateBounds() {
    let [minX, maxX] = [Infinity, -Infinity];
    let [minY, maxY] = [Infinity, -Infinity];

    for (const v of this.vertices) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Calculates the geometric centre of the polygon.
   */
  public calculateCentroid() {
    const vertices = this.vertices;
    let x = 0;
    let y = 0;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const { x: ax, y: ay } = vertices[i]!;
      const { x: bx, y: by } = vertices[j]!;
      const cross = ax * by - bx * ay;

      x += (ax + bx) * cross;
      y += (ay + by) * cross;
    }

    const f = 1 / (6 * this.signedArea);

    return new Vector2(x * f, y * f);
  }

  /**
   * The absolute area of the polygon.
   */
  public get area() {
    return Math.abs(this.signedArea);
  }

  /**
   * The signed area of the polygon.
   */
  public get signedArea() {
    return (this.#signedArea ??= this.calculateArea(true));
  }

  /**
   * The axis-aligned bounding box of the polygon.
   */
  public get bounds() {
    return (this.#bounds ??= Object.freeze(this.calculateBounds()));
  }

  /**
   * The geometric centre of the polygon.
   */
  public get centroid() {
    return (this.#centroid ??= Object.freeze(this.calculateCentroid()));
  }

  /**
   * Returns a deep clone of the polygon.
   */
  public clone(): Polygon {
    return new Polygon(this.vertices.map((v) => new Vector2(v.x, v.y)));
  }

  /**
   * Checks if a point (x, y) lies within the polygon using the ray-casting algorithm.
   * @param x The x coordinate of the point.
   * @param y The y coordinate of the point.
   * @returns If the point is contained within the polygon.
   */
  public contains(x: number, y: number): boolean {
    const vertices = this.vertices;
    let inside = false;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const { x: ax, y: ay } = vertices[i]!;
      const { x: bx, y: by } = vertices[j]!;

      const intersect =
        ay > y !== by > y &&
        x < ((bx - ax) * (y - ay)) / (by - ay || Number.EPSILON) + ax;

      if (intersect) inside = !inside;
    }

    return inside;
  }
}

/**
 * Represents a 3D prism formed by extruding a 2D polygon along the Z axis.
 */
export class ExtrudedPolygon {
  readonly z: number;
  readonly height: number;
  readonly polygon: Polygon;
  #bounds?: Readonly<Bounds3D>;
  #centroid?: Readonly<Vector3>;

  /**
   * Creates a new extruded polygon.
   * @param vertices An array containing at least 3 vertices.
   * @param height The height of the extruded polygon's extrusion.
   * @param z The position of the extruded polygon's base.
   */
  constructor(vertices: Vector2[], height: number, z: number) {
    if (height <= 0) throw new Error("Height must be positive number.");

    this.polygon = new Polygon(vertices);
    this.z = z;
    this.height = height;
  }

  /**
   * The axis-aligned bounding box of the extruded polygon.
   */
  public get bounds() {
    return (this.#bounds ??= Object.freeze(this.calculateBounds()));
  }

  /**
   * The geometric centre of the extruded polygon.
   */
  public get centroid() {
    return (this.#centroid ??= Object.freeze(this.calculateCentroid()));
  }

  /**
   * The volume of the extruded polygon.
   */
  public get volume() {
    return this.polygon.area * this.height;
  }

  /**
   * Returns a deep clone of the extruded polygon.
   */
  public clone(): ExtrudedPolygon {
    return new ExtrudedPolygon(
      this.polygon.vertices.map((v) => new Vector2(v.x, v.y)),
      this.height,
      this.z
    );
  }

  /**
   * Calculates the axis-aligned bounding box of the extruded polygon.
   */
  public calculateBounds() {
    const bounds = this.polygon.calculateBounds() as Bounds3D;
    bounds.minZ = this.z;
    bounds.maxZ = this.z + this.height;

    return bounds;
  }

  /**
   * Calculates the geometric centre of the extruded polygon.
   */
  public calculateCentroid() {
    const { x, y } = this.polygon.calculateCentroid();
    return new Vector3(x, y, this.z + this.height / 2);
  }

  /**
   * Checks if a point (x, y, z) lies within the extruded polygon.
   * @param x The x coordinate of the point.
   * @param y The y coordinate of the point.
   * @param z The y coordinate of the point.
   * @returns If the point is contained within the extruded polygon.
   */
  public contains(x: number, y: number, z?: number): boolean {
    if (z !== undefined && (z < this.z || z > this.z + this.height))
      return false;

    return this.polygon.contains(x, y);
  }
}
