import {
  BoxGeometry,
  EdgesGeometry,
  LineSegments,
  MeshBasicMaterial,
  Scene,
} from "three";
import RigidBody from "./RigidBody";

const nearby = new Set<number>();
const GridHelpers: Map<number, LineSegments> = new Map();

let scene: Scene | undefined;

let g: BoxGeometry;
let e: EdgesGeometry;
let m: MeshBasicMaterial;
let line: LineSegments;

let invCellSize: number;

class SpatialHash {
  cellSize: number;
  grid: Map<number, Set<number>>;
  private hashesPerObject: Map<number, Set<number>>;
  private objectCount: number;
  constructor(cellSize: number, objectsCount: number) {
    this.cellSize = cellSize;
    invCellSize = 1 / cellSize;
    this.grid = new Map();
    this.objectCount = objectsCount;
    this.hashesPerObject = new Map();
  }
  private round = (n: number) => Math.floor(n * invCellSize);

  private hash(x: number, y: number, z: number) {
    var h = (x * 92837111) ^ (y * 689287499) ^ (z * 283923481);
    const absHash = h < 0 ? -h : h;
    return absHash % (this.objectCount - 1);
  }

  create(object: RigidBody, id: number) {
    const { min, max } = object.aabb;

    const mX = this.round(min.x);
    const mY = this.round(min.y);
    const mZ = this.round(min.z);

    const MX = this.round(max.x);
    const MY = this.round(max.y);
    const MZ = this.round(max.z);

    const hashes = new Set<number>();

    for (let x = mX; x <= MX; x++) {
      for (let y = mY; y <= MY; y++) {
        for (let z = mZ; z <= MZ; z++) {
          const key = this.hash(x, y, z);
          this.grid.set(key, new Set());
          this.grid.get(key)!.add(id);
          hashes.add(key);
        }
      }
    }
    this.hashesPerObject.set(id, hashes);
  }

  update(object: RigidBody, id: number) {
    const oldHashes = this.hashesPerObject.get(id);
    const { min, max } = object.aabb;

    const mX = this.round(min.x);
    const mY = this.round(min.y);
    const mZ = this.round(min.z);

    const MX = this.round(max.x);
    const MY = this.round(max.y);
    const MZ = this.round(max.z);

    const newHashes = new Set<number>();
    for (let x = mX; x <= MX; x++) {
      for (let y = mY; y <= MY; y++) {
        for (let z = mZ; z <= MZ; z++) {
          const key = this.hash(x, y, z);
          newHashes.add(key);
        }
      }
    }

    // Remove from old cells that are not in new hashes
    this.remove(id, oldHashes, newHashes);
    // Add to new cells
    for (const key of newHashes) {
      if (!oldHashes || !oldHashes.has(key)) {
        if (!this.grid.has(key)) {
          this.grid.set(key, new Set());
        }
        this.grid.get(key)!.add(id);
        this.updateVisualizer(key);
      }
    }
    this.hashesPerObject.set(id, newHashes);
  }

  remove(
    id: number,
    oldHashes: Set<number> | undefined,
    newHashes: Set<number>
  ) {
    if (oldHashes) {
      for (const key of oldHashes) {
        if (!newHashes.has(key)) {
          const cell = this.grid.get(key);
          if (cell) {
            cell.delete(id);
            if (cell.size === 0) {
              this.grid.delete(key);
              this.removeVisualizer(key);
            }
          }
        }
      }
    }
  }

  findNearby(object: RigidBody, id: number) {
    const { min, max } = object.aabb;

    const mX = this.round(min.x);
    const mY = this.round(min.y);
    const mZ = this.round(min.z);

    const MX = this.round(max.x);
    const MY = this.round(max.y);
    const MZ = this.round(max.z);

    nearby.clear();

    for (let x = mX; x <= MX; x++) {
      for (let y = mY; y <= MY; y++) {
        for (let z = mZ; z <= MZ; z++) {
          const key = this.hash(x, y, z);
          const cell = this.grid.get(key);
          if (cell) {
            for (let other of cell) {
              if (other !== id) {
                nearby.add(other);
              }
            }
          }
        }
      }
    }
    return Array.from(nearby);
  }
  private getCell(hash: number) {
    const x = (((hash >> 32) & 0xffff) << 16) >> 16; // Odtwarzanie liczby ze znakiem
    const y = (((hash >> 16) & 0xffff) << 16) >> 16;
    const z = ((hash & 0xffff) << 16) >> 16;

    return { x, y, z };
  }

  show(parentScene: Scene) {
    scene = parentScene;
    g = new BoxGeometry(this.cellSize, this.cellSize, this.cellSize);
    e = new EdgesGeometry(g);
    m = new MeshBasicMaterial({ color: 0xff0000 });
    line = new LineSegments(e, m);
    this.grid.forEach((_, key) => this.updateVisualizer(key));
  }

  private updateVisualizer(key: number) {
    if (!scene) return;
    if (!GridHelpers.has(key)) {
      const helper = line.clone();
      GridHelpers.set(key, helper);
      scene!.add(helper);
    }
    const helper = GridHelpers.get(key)!;
    const { x, y, z } = this.getCell(key);
    helper.position.set(
      x * this.cellSize + this.cellSize / 2,
      y * this.cellSize + this.cellSize / 2,
      z * this.cellSize + this.cellSize / 2
    );
  }

  private removeVisualizer(key: number) {
    if (!scene) return;
    const helper = GridHelpers.get(key);
    if (helper) {
      scene!.remove(helper);
      GridHelpers.delete(key);
    }
  }
}

export default SpatialHash;
