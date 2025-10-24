export type Point = { x: number; y: number; };

interface Entry {
  coords: Point;
}

export interface RectEntry extends Entry {
  width: number;
  height: number;
}

export interface CircleEntry extends Entry {
  radius: number;
}

export type GridEntry = RectEntry | CircleEntry;

interface GridCache<T extends GridEntry> {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  lastX?: number;
  lastY?: number;
  entries: Set<T>;
  lastCell: Set<T>;
}

function filterSet<T>(set: Set<T>, predicate: (value: T) => boolean) {
  const result = new Set<T>();

  for (const value of set) {
    if (predicate(value)) result.add(value);
  }

  return result;
}

/**
 * A 2D spatial grid for efficiently indexing and querying objects within a space.
 */
export class Grid<T extends GridEntry> {
  #rows = new Map<number, Map<number, Set<T>>>();
  #entries = new Set<T>();
  #cache = {} as GridCache<T>;

  constructor(
    readonly cellWidth: number = 128,
    readonly cellHeight = cellWidth
  ) {
    this.resetCache();
  }

  /**
   * Calculates the grid cell boundaries that a rectangle (centreed at `point`)
   * with the given width and height spans.
   *
   * @param point The centre point in world coordinates.
   * @param width The width of the rectangle (optional, defaults to cellWidth).
   * @param height The height of the rectangle (optional, defaults to cellHeight).
   * @returns A tuple representing grid cell indices.
   */
  private getDimensions(
    point: Point,
    width?: number,
    height?: number
  ): [number, number, number, number] {
    const halfWidth = (width ?? this.cellWidth) / 2;
    const halfHeight = (height ?? this.cellHeight) / 2;

    const left = Math.floor((point.x - halfWidth) / this.cellWidth);
    const right = Math.floor((point.x + halfWidth) / this.cellWidth);
    const top = Math.floor((point.y - halfHeight) / this.cellHeight);
    const bottom = Math.floor((point.y + halfHeight) / this.cellHeight);

    return [left, right, top, bottom];
  }

  /**
   * Returns the width and height of an entry.
   *
   * If the entry is a rectangle, uses its `width` and `height` properties.
   * If the entry is a circle, calculates diameter from its `radius`.
   * @param entry The grid entry to calculate dimensions for.
   * @returns A tuple representing the dimensions of the entry.
   */
  private getEntryDimensions(entry: T) {
    const width = "width" in entry ? entry.width : (entry.radius ?? 0.5) * 2;
    const height = "height" in entry ? entry.height : (entry.radius ?? 0.5) * 2;

    return [width, height];
  }

  /**
   * Clears the internal cache used to optimise repeated queries.
   */
  private resetCache() {
    const entries = this.#cache.entries ?? new Set();
    const lastCell = this.#cache.lastCell ?? new Set();
    lastCell.clear();
    entries.clear();

    return (this.#cache = {
      entries: entries,
      lastCell: lastCell,
    });
  }

  /**
   * Returns the number of entries in the grid.
   */
  public get size() {
    return this.#entries.size;
  }

  /**
   * Converts world-space coordinates to grid-space indices.
   *
   * @param wx The `x` position in world-space.
   * @param wy The `y` position in world-space.
   * @returns A tuple representing the grid cell indices.
   */
  public getGridPosition(wx: number, wy: number): [number, number] {
    const x = Math.floor(wx / this.cellWidth);
    const y = Math.floor(wy / this.cellHeight);

    return [x, y];
  }

  /**
   * Converts grid-space indices to world-space coordinates.
   * @param x The horizontal grid-space index (column).
   * @param y The vertical grid-space index (row).
   * @returns A tuple representing the centre of the grid cell in world space.
   */
  public getWorldPosition(x: number, y: number): [number, number] {
    const wx = x * this.cellWidth + 0.5 * this.cellWidth;
    const wy = y * this.cellHeight + 0.5 * this.cellHeight;

    return [wx, wy];
  }

  /**
   * Retrieves the grid cell containing the given point.
   * @param point The world-space position to check within the grid.
   * @returns A read-only set of entries in the cell.
   */
  public getCell(point: Point): ReadonlySet<T> {
    const [x, y] = this.getGridPosition(point.x, point.y);

    if (this.#cache.lastX !== x || this.#cache.lastY !== y) {
      this.#cache.lastX = x;
      this.#cache.lastY = y;
      this.#cache.lastCell = this.#rows.get(y)?.get(x) || new Set();
    }

    const cell = this.#cache.lastCell;

    return cell;
  }

  /**
   * Computes all entries intersecting the bounds around a point.
   * Optionally filters the result using a predicate.
   *
   * Uses a bounding box based on the entry's dimensions.
   * @param point The centre point of the search.
   * @param predicate An optional filter applied to the entries.
   * @returns A read-only array of matching entries.
   */
  public getEntries(
    point: Point,
    predicate?: (entry: T) => boolean
  ): ReadonlySet<T> {
    const [left, right, top, bottom] = this.getDimensions(point);

    if (
      this.#cache.left === left &&
      this.#cache.right === right &&
      this.#cache.top === top &&
      this.#cache.bottom === bottom
    ) {
      return predicate
        ? filterSet(this.#cache.entries, predicate)
        : this.#cache.entries;
    }

    const entries = new Set<T>();

    for (let y = top; y <= bottom; y++) {
      const row = this.#rows.get(y);

      if (!row) continue;

      for (let x = left; x <= right; x++) {
        const cell = row.get(x);

        if (!cell) continue;

        for (const entry of cell) {
          entries.add(entry);
        }
      }
    }

    this.#cache.left = left;
    this.#cache.right = right;
    this.#cache.top = top;
    this.#cache.bottom = bottom;
    this.#cache.entries = entries;

    return predicate
      ? filterSet(this.#cache.entries, predicate)
      : this.#cache.entries;
  }

  /**
   * Adds a new entry to the grid.
   * @param entry A new object to add to the grid.
   */
  public add(entry: T) {
    if (this.#entries.has(entry)) {
      throw new Error(`Entry already exists in the grid.`);
    }

    const [left, right, top, bottom] = this.getDimensions(
      entry.coords,
      ...this.getEntryDimensions(entry)
    );

    for (let y = top; y <= bottom; y++) {
      let row = this.#rows.get(y);

      if (!row) {
        this.#rows.set(y, (row = new Map()));
      }

      for (let x = left; x <= right; x++) {
        if (!row.has(x)) row.set(x, new Set());

        row.get(x)!.add(entry);
      }
    }

    this.resetCache();
    this.#entries.add(entry);
  }

  /**
   * Removes an entry from the grid.
   * @param entry An existing grid entry.
   */
  public remove(entry: T) {
    if (!this.#entries.has(entry)) return false;

    const [left, right, top, bottom] = this.getDimensions(
      entry.coords,
      ...this.getEntryDimensions(entry)
    );

    let success = false;

    for (let y = top; y <= bottom; y++) {
      const row = this.#rows.get(y);

      if (!row) continue;

      for (let x = left; x <= right; x++) {
        const cell = row.get(x);

        if (!cell) continue;

        if (cell.delete(entry)) success = true;

        if (cell.size === 0) row.delete(x);
      }

      if (row.size === 0) this.#rows.delete(y);
    }

    if (success) {
      this.resetCache();
      this.#entries.delete(entry);
    }

    return success;
  }

  /**
   * Adds multiple entries to the grid.
   * @param entries An array of entries to add.
   */
  public addAll(entries: T[]) {
    for (const entry of entries) this.add(entry);
  }

  /**
   * Removes multiple entries from the grid.
   * @param entries An array of entries to remove.
   */
  public removeAll(entries: T[]) {
    for (const entry of entries) this.remove(entry);
  }

  /**
   * Updates the position and dimensions of an existing entry in the grid.
   * @param entry The entry to update.
   */
  public update(
    entry: T,
    values: Partial<
      Point &
      (T extends RectEntry
        ? { width: number; height: number; }
        : { radius: number; })
    >
  ) {
    if (!this.#entries.has(entry)) {
      throw new Error(`Cannot update an entry that doesn't exist in the grid.`);
    }

    this.remove(entry);

    if (typeof values.x === "number") entry.coords.x = values.x;
    if (typeof values.y === "number") entry.coords.y = values.y;

    if ("width" in values && typeof values.width === "number") {
      (entry as RectEntry).width = values.width;
    }

    if ("height" in values && typeof values.height === "number") {
      (entry as RectEntry).height = values.height;
    }

    if ("radius" in values && typeof values.radius === "number") {
      (entry as CircleEntry).radius = values.radius;
    }

    this.add(entry);
  }

  /**
   * Checks if an object is an entry in the grid.
   * @param entry The object to check.
   */
  public has(entry: T) {
    return this.#entries.has(entry);
  }

  /** Returns a iterable set of all entries in the grid. */
  public entries() {
    return this.#entries.values();
  }

  /** Returns an array of all entries in the grid. */
  public toArray() {
    return Array.from(this.#entries);
  }

  /**
   * Removes all entries from the grid.
   */
  public clear() {
    this.#rows.clear();
    this.#entries.clear();
    this.resetCache();
  }
}
