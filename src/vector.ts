import { clamp } from "./math.js";

/**
 * An object with vector components.
 */
export interface Vec {
  x: number;
  y: number;
  z?: number;
  w?: number;
}

/**
 * Represents a 2-dimensional vector.
 */
export interface Vec2 {
  x: number;
  y: number;
  z?: undefined;
  w?: undefined;
}

/**
 * Represents a 3-dimensional vector.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
  w?: undefined;
}

/**
 * Represents a 4-dimensional vector.
 */
export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * An array that can be converted to a vector.
 */
type VectorArray<T> = T extends typeof Vector
  ? VectorArray<InstanceType<T>>
  : T extends Vec4
  ? [number, number, number, number]
  : T extends Vec3
  ? [number, number, number]
  : T extends Vec2
  ? [number, number]
  : any;

/**
 * An object that can be converted to a vector.
 */
type VectorObject<T> = T extends typeof Vector
  ? VectorObject<InstanceType<T>>
  : T extends Vec4
  ? Vec4
  : T extends Vec3
  ? Vec3
  : T extends Vec2
  ? Vec2
  : Vec;

type CVector = typeof Vector2 | typeof Vector3 | typeof Vector4;
type VectorKey = "x" | "y" | "z" | "w";
type VectorSwizzle = Vec2Swizzle | Vec3Swizzle | Vec4Swizzle;
type Vec2Swizzle = `${VectorKey}${VectorKey}`;
type Vec3Swizzle = `${VectorKey}${VectorKey}${VectorKey}`;
type Vec4Swizzle = `${VectorKey}${VectorKey}${VectorKey}${VectorKey}`;

/**
 * A base vector class inherited by all vector classes.
 */
export abstract class Vector {
  static size = 2;
  public 0: number;
  public 1: number;
  public 2?: number;
  public 3?: number;
  [index: number]: number | undefined;

  /**
   * Constructs a new vector with optional components.
   *
   * @param x - The x-component of the vector.
   * @param y - The y-component of the vector. Defaults to `x` if not provided.
   * @param z - The z-component of the vector (optional).
   * @param w - The w-component of the vector (optional).
   */
  constructor(x: number, y = 0, z?: number, w?: number) {
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

    this[0] = x;
    this[1] = y;
    this[2] = z;
    this[3] = w;
  }

  get size() {
    return (this.constructor as CVector).size;
  }

  get x() {
    return this[0];
  }

  get y() {
    return this[1];
  }

  set x(v: number) {
    this[0] = v;
  }

  set y(v: number) {
    this[1] = v;
  }

  /**
   * Creates a vector from an array of numbers.
   *
   * @param primitive - An array representing the components of a vector.
   * @returns A new vector instance corresponding to the provided array length.
   */
  public static fromArray<T extends CVector, U extends VectorArray<T>>(
    this: T,
    primitive: U
  ): InstanceType<T> {
    const [x, y, z, w] = primitive as [number, number, number?, number?];
    return new this(x, y, z, w) as InstanceType<T>;
  }

  /**
   * Creates a vector from a number, array, or object.
   *
   * @param primitive - A number, array, or object with vector-like components.
   * @returns A new vector instance corresponding to the input.
   */
  public static fromInput<
    T extends CVector,
    U extends VectorObject<T> | VectorArray<T>
  >(this: T, primitive: number | U): InstanceType<T> {
    if (typeof primitive === "number")
      return new this(
        primitive,
        primitive,
        primitive,
        primitive
      ) as InstanceType<T>;

    if (Array.isArray(primitive))
      return this.fromArray(primitive as VectorArray<T>);

    const { x, y, z, w } = primitive as Vec;

    return new this(x, y, z, w) as InstanceType<T>;
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
  ): InstanceType<T>[] {
    return primitives.map(this.fromArray) as InstanceType<T>[];
  }

  /**
   * Applies a mathematical operation to each component of the vector.
   *
   * @param v The other vector or scalar to operate with.
   * @param operator - A function that defines the operation to apply.
   * @returns A reference to the vector.
   */
  private operate(
    v: VectorObject<this> | number,
    operator: (x: number, y: number) => number
  ): this {
    const vec = (this.constructor as any).fromInput(v);

    for (let i = 0; i < this.size; i++)
      this[i] = operator(this[i]!, vec[i] ?? 0);

    return this;
  }

  /**
   * Adds the components of the vector by the components of another vector or scalar value.
   * @param v The target vector or scalar value.
   * @returns A reference to the vector.
   */
  public add(v: VectorObject<this> | number): this {
    return this.operate(v, (x, y) => x + y);
  }

  /**
   * Subtracts the components of the vector by the components of another vector or scalar value.
   * @param v The target vector or scalar value.
   * @returns A reference to the vector.
   */
  public subtract(v: VectorObject<this> | number): this {
    return this.operate(v, (x, y) => x - y);
  }

  /**
   * Multiplies the components of the vector by the components of another vector or scalar value.
   * @param v The target vector or scalar value.
   * @returns A reference to the vector.
   */
  public multiply(v: VectorObject<this> | number): this {
    return this.operate(v, (x, y) => x * y);
  }

  /**
   * Divides the components of the vector by the components of another vector or scalar value.
   * @param v The target vector or scalar vector.
   * @returns A reference to the vector.
   */
  public divide(v: VectorObject<this> | number): this {
    return this.operate(v, (x, y) => x / y);
  }

  /**
   * Linearly interpolates each component of the vector towards another vector or scalar value.
   * @param v The target vector or scalar value.
   * @param factor The interpolation factor, typically between 0 and 1.
   * @returns A reference to the vector.
   */
  public lerp(v: VectorObject<this> | number, factor: number): this {
    return this.operate(v, (a, b) => a + (b - a) * factor);
  }

  /**
   * Computes the dot product of this vector and another.
   *
   * @param v The vector to perform the dot product with.
   * @returns The scalar dot product value.
   */
  public dot(v: VectorObject<this>): number {
    const vec =
      v instanceof Vector ? v : (this.constructor as any).fromInput(v);

    if (this.size !== vec.size)
      throw new Error("Vectors must have the same dimensions.");

    let result = 0;

    for (let i = 0; i < this.size; i++) result += this[i]! * vec[i];

    return result;
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
   * Calculates the squared Euclidean length (magnitude) of this vector.
   *
   * @returns The magnitude of the vector.
   */
  public lengthSquared(): number {
    let sum = 0;

    for (let i = 0; i < this.size; i++) sum += this[i]! * this[i]!;

    return sum;
  }

  /**
   * Calculates the Euclidean length (magnitude) of this vector.
   *
   * @returns The magnitude of the vector.
   */
  public length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  public forEach(fn: (value: number, index: number) => void) {
    for (let i = 0; i < this.size; i++) fn(this[i]!, i);
  }

  *[Symbol.iterator]() {
    for (let i = 0; i < this.size; i++) yield this[i]!;
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
    return (this.constructor as any).fromInput(this) as this;
  }

  /**
   * Computes the squared Euclidean distance to another vector.
   *
   * @param v The vector to compute distance to.
   * @returns The squared distance.
   */
  public distanceSquared(v: VectorObject<this>): number {
    let sum = 0;
    const vec =
      v instanceof Vector ? v : (this.constructor as any).fromInput(v);

    for (let i = 0; i < this.size; i++) {
      const diff = this[i]! - vec[i]!;
      sum += diff * diff;
    }

    return sum;
  }

  /**
   * Computes the Euclidean distance to another vector.
   *
   * @param v The vector to compute distance to.
   * @returns The distance.
   */
  public distance(v: VectorObject<this>): number {
    return Math.sqrt(this.distanceSquared(v));
  }

  /**
   * Converts the vector to an array of component values.
   *
   * @returns An array representing the vector.
   */
  public toArray() {
    return [...this];
  }

  /**
   * Replaces the current vector's components with another vector's values.
   *
   * @param v The vector to copy components from.
   * @returns A reference to the vector.
   */
  public copy(v: Partial<VectorObject<this>>): this {
    const vec = (this.constructor as any).fromInput(v);

    for (let i = 0; i < this.size; i++)
      if (typeof vec[i] === "number") this[i] = vec[i]!;

    return this;
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
    return new this.constructor(...arr);
  }

  /**
   * Compares this vector to another for exact component equality.
   *
   * @param v The vector to compare with.
   * @returns `true` if all components are equal, otherwise `false`.
   */
  public equals(v: this) {
    if (this.size !== v.size) return false;

    for (let i = 0; i < this.size; i++) if (this[i] !== v[i]) return false;

    return true;
  }

  /**
   * Clamps a vector's components between the corresponding components of `min` and `max`.
   * @param min A scalar or vector defining the minimum value for each component.
   * @param max A scalar or vector defining the maximum value for each component.
   * @returns A reference to the vector.
   */
  public clamp(
    min: VectorObject<this> | number,
    max: VectorObject<this> | number
  ): this {
    const minNumber = typeof min === "number";
    const maxNumber = typeof max === "number";

    min =
      minNumber || min instanceof Vector
        ? min
        : (this.constructor as any).fromInput(min);
    max =
      maxNumber || max instanceof Vector
        ? max
        : (this.constructor as any).fromInput(max);

    for (let i = 0; i < this.size; i++) {
      this[i] = clamp(
        this[i]!,
        minNumber ? min : (min as any)[i],
        maxNumber ? max : (max as any)[i]
      );
    }

    return this;
  }

  /**
   * Rounds the components of the vector up to the nearest integer.
   * @returns A reference to the vector.
   */
  public ceil() {
    for (let i = 0; i < this.size; i++) this[i] = Math.floor(this[i]!);

    return this;
  }

  /**
   * Rounds the components of the vector down to the nearest integer.
   * @returns A reference to the vector.
   */
  public floor() {
    for (let i = 0; i < this.size; i++) this[i] = Math.floor(this[i]!);

    return this;
  }

  /**
   * Rounds the components of the vector to the nearest integer.
   * @returns A reference to the vector.
   */
  public round() {
    for (let i = 0; i < this.size; i++) this[i] = Math.round(this[i]!);

    return this;
  }
}

/**
 * Represents a 2-dimensional vector.
 */
export class Vector2 extends Vector {
  static override size = 2;

  /**
   * Constructs a new 2D vector.
   * @param x The x-component of the vector.
   * @param y The y-component of the vector.
   */
  constructor(x = 0, y = 0) {
    super(x, y);
  }

  /**
   * Computes the cross product between this and another vector.
   *
   * @param v The other vector.
   * @returns A new vector orthogonal to both inputs.
   */
  public cross(v: VectorObject<this>): number {
    const vec =
      v instanceof Vector ? v : (this.constructor as any).fromInput(v);

    return this[0] * vec[1] - this[1] * vec[0];
  }
}

/**
 * Represents a 3-dimensional vector.
 */
export class Vector3 extends Vector {
  static override size = 3;
  public override 2 = 0;

  /**
   * Constructs a new 3D vector.
   * @param x The x-component of the vector.
   * @param y The y-component of the vector.
   * @param z The z-component of the vector.
   */
  constructor(x = 0, y = 0, z = 0) {
    super(x, y, z);
    this[2] = z;
  }

  get z() {
    return this[2];
  }

  set z(v: number) {
    this[2] = v;
  }

  /**
   * Computes the cross product between this and another vector.
   *
   * @param v The other vector.
   * @returns A new vector orthogonal to both inputs.
   */
  public cross(v: VectorObject<this>): Vector3 {
    const vec =
      v instanceof Vector ? v : (this.constructor as any).fromInput(v);

    return new Vector3(
      this[1] * vec[2] - this[2] * vec[1],
      this[2] * vec[0] - this[0] * vec[2],
      this[0] * vec[1] - this[1] * vec[0]
    );
  }
}

/**
 * Represents a 4-dimensional vector.
 */
export class Vector4 extends Vector {
  static override size = 4;
  public override 2 = 0;
  public override 3 = 0;

  /**
   * Constructs a new 4D vector.
   * @param x The x-component of the vector.
   * @param y The y-component of the vector.
   * @param z The z-component of the vector.
   * @param w The w-component of the vector.
   */
  constructor(x = 0, y = 0, z = 0, w = 0) {
    super(x, y, z, w);
    this[2] = z;
    this[3] = w;
  }

  get z() {
    return this[2];
  }

  get w() {
    return this[3];
  }

  set z(v: number) {
    this[2] = v;
  }

  set w(v: number) {
    this[3] = v;
  }
}
