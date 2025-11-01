export interface GridEntry {
  /** Horizontal world space coordinate of the entry. */
  x: number;
  /** Vertical world space coordinate of the entry. */
  y: number;
  /** Width of the entry, defaulting to grid cell width. */
  width?: number;
  /** Height of the entry, defaulting to grid cell height. */
  height?: number;
}

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
 * A 2D spatial grid for efficiently indexing and querying objects in a space.
 */
export class Grid<T extends GridEntry> {
  #rows = new Map<number, Map<number, Set<T>>>();
  #cache = {} as GridCache<T>;

  /** All registered entries in the grid. Should not be directly modified. */
  readonly entries = new Set<T>();

  constructor(
    readonly cellWidth: number = 128,
    readonly cellHeight = cellWidth,
  ) {
    this.resetCache();
  }

  /**
   * Calculates the grid cell boundaries occupied by a rectangle.
   *
   * @param wx The x-coordinate to convert to grid space.
   * @param wy The y-coordinate to convert to grid space.
   * @param width The width of the rectangle (optional, defaults to cellWidth).
   * @param height The height of the rectangle (optional, defaults to cellHeight).
   * @returns A tuple representing grid cell indices.
   */
  private getDimensions(
    wx: number,
    wy: number,
    width = this.cellWidth,
    height = this.cellHeight,
  ): [number, number, number, number] {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const left = Math.floor((wx - halfWidth) / this.cellWidth);
    const right = Math.floor((wx + halfWidth) / this.cellWidth);
    const top = Math.floor((wy - halfHeight) / this.cellHeight);
    const bottom = Math.floor((wy + halfHeight) / this.cellHeight);

    return [left, right, top, bottom];
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
   * Converts world space coordinates to grid-space indices.
   *
   * @param wx The `x` position in world space.
   * @param wy The `y` position in world space.
   * @returns A tuple representing the grid cell indices.
   */
  public getGridPosition(wx: number, wy: number): [number, number] {
    const x = Math.floor(wx / this.cellWidth);
    const y = Math.floor(wy / this.cellHeight);

    return [x, y];
  }

  /**
   * Converts grid-space indices to world space coordinates.
   * @param gx The horizontal grid-space index (column).
   * @param gy The vertical grid-space index (row).
   * @returns A tuple representing the centre of the grid cell in world space.
   */
  public getWorldPosition(gx: number, gy: number): [number, number] {
    const wx = gx * this.cellWidth + 0.5 * this.cellWidth;
    const wy = gy * this.cellHeight + 0.5 * this.cellHeight;

    return [wx, wy];
  }

  /**
   * Retrieves the set of entries in the cell containing the specified world coordinates.
   * @param wx The `x` position in world space.
   * @param wy The `y` position in world space.
   * @returns A read-only set of entries in the cell.
   */
  public getCell(wx: number, wy: number): ReadonlySet<T> {
    const [gx, gy] = this.getGridPosition(wx, wy);

    if (this.#cache.lastX !== gx || this.#cache.lastY !== gy) {
      this.#cache.lastX = gx;
      this.#cache.lastY = gy;
      this.#cache.lastCell = this.#rows.get(gy)?.get(gx) || new Set();
    }

    const cell = this.#cache.lastCell;

    return cell;
  }

  /**
   * Retrieves all entries occupying the same or neighbouring grid cells around a point.
   * @param wx The `x` position in world space.
   * @param wy The `y` position in world space.
   * @param predicate An optional filter applied to the entries.
   * @returns A read-only set of matching entries.
   */
  public getEntries(
    wx: number,
    wy: number,
    predicate?: (entry: T) => boolean,
  ): ReadonlySet<T> {
    const [left, right, top, bottom] = this.getDimensions(wx, wy);

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
    if (this.entries.has(entry)) {
      throw new Error(`Entry already exists in the grid.`);
    }

    const [left, right, top, bottom] = this.getDimensions(
      entry.x,
      entry.y,
      entry.width,
      entry.height,
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
    this.entries.add(entry);
  }

  /**
   * Removes an entry from the grid.
   * @param entry An existing grid entry.
   */
  public remove(entry: T) {
    if (!this.entries.has(entry)) return false;

    const [left, right, top, bottom] = this.getDimensions(
      entry.x,
      entry.y,
      entry.width,
      entry.height,
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
      this.entries.delete(entry);
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
  public update(entry: T, { x, y, width, height }: GridEntry) {
    if (!this.entries.has(entry)) {
      throw new Error(`Cannot update an entry that doesn't exist in the grid.`);
    }

    this.remove(entry);

    if (typeof x === 'number') entry.x = x;
    if (typeof y === 'number') entry.y = y;
    if (typeof width === 'number') entry.width = width;
    if (typeof height === 'number') entry.height = height;

    this.add(entry);
  }

  /**
   * Removes all entries from the grid.
   */
  public clear() {
    this.#rows.clear();
    this.entries.clear();
    this.resetCache();
  }
}
