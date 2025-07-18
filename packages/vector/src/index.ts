const size = Symbol("size");

/**
 * Represents a 2-dimensional vector.
 */
interface Vec2 {
  x: number;
  y: number;
}

/**
 * Represents a 3-dimensional vector.
 */
interface Vec3 extends Vec2 {
  z: number;
}

/**
 * Represents a 4-dimensional vector.
 */
interface Vec4 extends Vec3 {
  w: number;
}

/**
 * An object with vector components.
 */
interface Vec extends Vec2 {
  z?: number;
  w?: number;
}

/**
 * Represents a vector of variable dimensions.
 */
type VectorN<L extends number, T = number> = L extends 2
  ? [T, T]
  : L extends 3
  ? [T, T, T]
  : L extends 4
  ? [T, T, T, T]
  : never;

/**
 * An array that can be converted to a vector.
 */
type VectorArray<T> = T extends Vec4
  ? VectorN<4>
  : T extends Vec3
  ? VectorN<3>
  : T extends Vec2
  ? VectorN<2>
  : number[];

/**
 * Represents an object or class that can be treated as a vector.
 */
type VectorLike = Vec | Vector;

/**
 * Utility type to get the vector type of an object based on its component.
 */
type InferVector<T> = T extends Vec4 | VectorN<4>
  ? Vector4
  : T extends Vec3 | VectorN<3>
  ? Vector3
  : T extends Vec2 | VectorN<2>
  ? Vector2
  : any;

type VectorKey = "x" | "y" | "z" | "w";
type VectorSwizzle = Vec2Swizzle | Vec3Swizzle | Vec4Swizzle;
type Vec2Swizzle = `${VectorKey}${VectorKey}`;
type Vec3Swizzle = `${VectorKey}${VectorKey}${VectorKey}`;
type Vec4Swizzle = `${VectorKey}${VectorKey}${VectorKey}${VectorKey}`;

/**
 * A base vector class inherited by all vector classes.
 */
export abstract class Vector {
  public [size] = 2;
  public x = 0;
  public y = 0;
  public z: number | undefined;
  public w: number | undefined;

  /**
   * Constructs a new vector with optional components.
   *
   * @param x - The x-component of the vector.
   * @param y - The y-component of the vector. Defaults to `x` if not provided.
   * @param z - The z-component of the vector (optional).
   * @param w - The w-component of the vector (optional).
   */
  constructor(x: number, y = x, z?: number, w?: number) {
    for (let i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] !== "number") {
        throw new TypeError(
          `${
            this.constructor.name
          } argument at index ${i} must be a number, but got ${typeof arguments[
            i
          ]}`
        );
      }
    }

    this.x = x;
    this.y = y;
  }

  static create<T extends typeof Vector>(
    this: T,
    x: number | Vec,
    y: number = x as number,
    z?: number,
    w?: number
  ): InstanceType<T> {
    if (typeof x === "object") ({ x, y, z, w } = x);

    const size =
      (this instanceof Vector && this.size) ||
      [x, y, z, w].filter((arg) => arg !== undefined).length;

    switch (size) {
      case 1:
      case 2:
        return new Vector2(x, y) as InstanceType<T>;
      case 3:
        return new Vector3(x, y, z) as InstanceType<T>;
      case 4:
        return new Vector4(x, y, z, w) as InstanceType<T>;
      default:
        throw new Error(`Cannot instantiate Vector with size of ${size}.`);
    }
  }

  /**
   * Creates a vector from an array of numbers.
   *
   * @param primitive - An array representing the components of a vector.
   * @returns A new vector instance corresponding to the provided array length.
   */
  static fromArray<
    T extends typeof Vector,
    U extends VectorArray<T> | number[]
  >(this: T, primitive: U) {
    const [x, y, z, w] = primitive;
    return Vector.create(x!, y!, z!, w!) as InstanceType<T>;
  }

  /**
   * Creates a vector from an object or array of vector components.
   *
   * @param primitive - An object or array with `x`, `y`, `z`, and `w` components.
   * @returns A new vector instance corresponding to the input.
   */
  static fromObject<
    T extends typeof Vector,
    U extends InferVector<T> | VectorArray<T>
  >(this: T, primitive: U): InstanceType<T> {
    if (Array.isArray(primitive))
      return Vector.fromArray(primitive) as InstanceType<T>;

    const { x, y, z, w } = primitive;

    return this.create(x, y, z, w) as InstanceType<T>;
  }

  /**
   * Converts a list of component arrays into an array of vector instances.
   *
   * @param primitives - An array of number arrays representing multiple vectors.
   * @returns An array of vector instances.
   */
  public static fromArrays<T extends typeof Vector, U extends VectorArray<T>[]>(
    this: T,
    primitives: U
  ) {
    return primitives.map(this.fromArray) as InstanceType<T>[];
  }

  /**
   * Applies a binary operation between this vector and another vector or scalar.
   *
   * @param v - The other vector or scalar to operate with.
   * @param operator - A function that defines the operation to apply.
   * @returns A new vector with the result of the operation.
   */
  private operate(
    b: VectorLike | number,
    operator: (x: number, y: number) => number
  ): this {
    let { x, y, z, w } = this;
    const isNumber = typeof b === "number";

    x = operator(x, isNumber ? b : b.x ?? 0);
    y = operator(y, isNumber ? b : b.y ?? 0);

    if (z !== undefined) z = operator(z, isNumber ? b : b.z ?? 0);
    if (w !== undefined) w = operator(w, isNumber ? b : b.w ?? 0);

    return Vector.create(x, y, z!, w!) as unknown as this;
  }

  /**
   * Adds two vectors or a scalar value to a vector.
   * @param v - The second vector or scalar value.
   * @returns A new vector with incremented components.
   */
  public add(v: VectorLike | number): this {
    return this.operate(v, (x, y) => x + y);
  }

  /**
   * Adds a scalar to the x component of the vector.
   *
   * @param x The scalar to add to the respective component.
   * @returns A new vector with the updated component.
   */
  public addX(x: number): this {
    return Vector.create(
      this.x + x,
      this.y,
      this.z!,
      this.w!
    ) as unknown as this;
  }

  /**
   * Adds a scalar to the y/z/w component of the vector.
   *
   * @param y The scalar to add to the respective component.
   * @returns A new vector with the updated component.
   */
  public addY(y: number): this {
    return Vector.create(
      this.x,
      this.y + y,
      this.z!,
      this.w!
    ) as unknown as this;
  }

  /**
   * Adds a scalar to the z component of the vector.
   *
   * @param z The scalar to add to the respective component.
   * @returns A new vector with the updated component.
   */
  public addZ(this: Vector3 | Vector4, z: number): this {
    return Vector.create(
      this.x,
      this.y,
      this.z + z,
      (this as Vec4).w
    ) as unknown as this;
  }

  /**
   * Adds a scalar to the w component of the vector.
   *
   * @param w The scalar to add to the respective component.
   * @returns A new vector with the updated component.
   */
  public addW(this: Vector4, w: number): this {
    return Vector.create(this.x, this.y, this.z, this.w + w) as unknown as this;
  }

  /**
   * Subtracts one vector from another or subtracts a scalar value from a vector.
   * @param v - The second vector or scalar value.
   * @returns A new vector with subtracted components.
   */
  public subtract(v: VectorLike | number): this {
    return this.operate(v, (x, y) => x - y);
  }

  /**
   * Multiplies two vectors by their components, or multiplies a vector by a scalar value.
   * @param v - The second vector or scalar value.
   * @returns A new vector with multiplied components.
   */
  public multiply(v: VectorLike | number): this {
    return this.operate(v, (x, y) => x * y);
  }

  /**
   * Divides two vectors by their components, or divides a vector by a scalar value.
   * @param v - The second vector or scalar vector.
   * @returns A new vector with divided components.
   */
  public divide(v: VectorLike | number): this {
    return this.operate(v, (x, y) => x / y);
  }

  /**
   * Computes the dot product of this vector and another.
   *
   * @param v - The vector to perform the dot product with.
   * @returns The scalar dot product value.
   */
  public dot(v: VectorLike): number {
    let result = 0;
    const vec = (v instanceof Vector ? v : Vector.fromObject(v)) as this;

    if (this.size !== vec.size)
      throw new Error("Vectors must have the same dimensions.");

    for (const key of this.keys()) {
      const x = this[key] as number;
      const y = vec[key] as number;

      result += x * y;
    }

    return result;
  }

  /**
   * Computes the cross product between this and another vector.
   *
   * @param v - The other vector.
   * @returns A new vector orthogonal to both inputs.
   */
  public cross(v: this) {
    const { x: ax, y: ay, z: az, w: aw } = this;
    const { x: bx, y: by, z: bz } = v;

    if (
      ax === undefined ||
      ay === undefined ||
      az === undefined ||
      bx === undefined ||
      by === undefined ||
      bz === undefined
    )
      throw new Error(
        "Vector.cross requires two three-dimensional vectors."
      );

    return Vector.create(
      ay * bz - az * by,
      az * bx - ax * bz,
      ax * by - ay * bx,
      aw!
    ) as unknown as this;
  }

  /**
   * Returns a normalized copy of this vector with magnitude 1.
   *
   * @returns A normalized vector.
   */
  public normalize(): this {
    return this.divide(this.length());
  }

  /**
   * Calculates the Euclidean length (magnitude) of this vector.
   *
   * @returns The magnitude of the vector.
   */
  public length(): number {
    let sum = 0;

    for (const value of this) sum += value * value;

    return Math.sqrt(sum);
  }

  *[Symbol.iterator](): Iterator<number> {
    for (const key of ["x", "y", "z", "w"] as const) {
      const value = this[key];

      if (value === undefined) break;

      yield value;
    }
  }

  public *keys(): IterableIterator<keyof this> {
    for (const key of ["x", "y", "z", "w"] as const) {
      if (this[key] === undefined) break;

      yield key;
    }
  }

  get size() {
    return this[size];
  }

  /**
   * Returns a string representation of the vector, such as "vector3(1, 2, 3)".
   */
  public toString() {
    return `vector${this.size}(${this.toArray().join(", ")})`;
  }

  /**
   * Creates a new vector with the same component values as this one.
   *
   * @returns A cloned vector.
   */
  public clone(): this {
    return Vector.create(this) as unknown as this;
  }

  /**
   * Computes the squared Euclidean distance to another vector.
   *
   * @param v - The vector to compute distance to.
   * @returns The squared distance.
   */
  public distanceSquared(v: VectorLike): number {
    const vec = this.subtract(v);
    return vec.dot(vec);
  }

  /**
   * Computes the Euclidean distance to another vector.
   *
   * @param v - The vector to compute distance to.
   * @returns The distance.
   */
  public distance(v: VectorLike): number {
    return Math.sqrt(this.distanceSquared(v));
  }

  /**
   * Converts the vector to an array of component values.
   *
   * @returns An array representing the vector.
   */
  public toArray<T extends this>() {
    return [...this] as VectorArray<T>;
  }

  /**
   * Replaces the current vector's components with another vector's values.
   *
   * @param v - The vector to copy components from.
   */
  public replace(v: this): void {
    for (const key of this.keys())
      if (key in v && typeof v[key] === "number") this[key] = v[key];
  }

  /**
   * Creates a new vector by reordering or duplicating components using a swizzle string.
   *
   * @param components - A string like 'xy', 'zyx', or 'wzyx' specifying the desired component order.
   * @returns A new vector based on the swizzle pattern.
   */
  public swizzle<T extends VectorSwizzle>(
    components: T
  ): T extends Vec2Swizzle
    ? Vector2
    : T extends Vec3Swizzle
    ? Vector3
    : Vector4 {
    if (!/^[xyzw]+$/.test(components))
      throw new Error(`Invalid key in swizzle components (${components}).`);

    const arr = components.split("").map((char) => (this as any)[char] ?? 0);

    //@ts-ignore
    return Vector.create(...arr);
  }

  /**
   * Compares this vector to another for exact component equality.
   *
   * @param v - The vector to compare with.
   * @returns `true` if all components are equal, otherwise `false`.
   */
  public equals(v: this) {
    if (this.size !== v.size) return false;

    for (const key of this.keys()) if (this[key] !== v[key]) return false;

    return true;
  }
}

/**
 * Represents a 2-dimensional vector.
 */
export class Vector2 extends Vector {
  override readonly [size]: number = 2;

  /**
   * Constructs a new 2D vector.
   * @param x The x-component of the vector.
   * @param y The y-component of the vector (optional, defaults to x).
   */
  constructor(x: number, y = x) {
    super(x, y);
  }
}

/**
 * Represents a 3-dimensional vector.
 */
export class Vector3 extends Vector implements Vec3 {
  override readonly [size]: number = 3;
  public override z = 0;

  /**
   * Constructs a new 3D vector.
   * @param x The x-component of the vector.
   * @param y The y-component of the vector (optional, defaults to x).
   * @param z The z-component of the vector (optional, defaults to y).
   */
  constructor(x: number, y = x, z = y) {
    super(x, y, z);
    this.z = z;
  }

  /**
   * @returns A vector containing the x, y components.
   */
  public toVec2() {
    return new Vector2(this.x, this.y);
  }
}

/**
 * Represents a 4-dimensional vector.
 */
export class Vector4 extends Vector {
  override readonly [size]: number = 4;
  public override z = 0;
  public override w = 0;

  /**
   * Constructs a new 4D vector.
   * @param x The x-component of the vector.
   * @param y The y-component of the vector (optional, defaults to x).
   * @param z The z-component of the vector (optional, defaults to y).
   * @param w The w-component of the vector (optional, defaults to z).
   */
  constructor(x: number, y = x, z = y, w = z) {
    super(x, y, z, w);
    this.z = z;
    this.w = w;
  }

  /**
   * @returns A vector containing the x, y components.
   */
  public toVec2() {
    return new Vector2(this.x, this.y);
  }

  /**
   * @returns A vector containing the x, y, z components.
   */
  public toVec3() {
    return new Vector3(this.x, this.y, this.z);
  }
}
