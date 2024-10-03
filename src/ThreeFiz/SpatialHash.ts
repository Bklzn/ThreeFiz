import {
  Box3,
  BoxGeometry,
  EdgesGeometry,
  LineSegments,
  MeshBasicMaterial,
  Scene,
  Vector3,
} from "three";
import RigidBody from "./RigidBody";

const minV = new Vector3();
const maxV = new Vector3();

const nearby = new Set<number>();
const GridHelpers: Map<string, LineSegments> = new Map();

let scene: Scene | undefined;

let g: BoxGeometry;
let e: EdgesGeometry;
let m: MeshBasicMaterial;
let line: LineSegments;

class SpatialHash {
  cellSize: number;
  grid: Map<string, Set<number>>;
  private hashesPerObject: Map<number, Set<string>>;
  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.hashesPerObject = new Map();
  }

  private hash(x: number, y: number, z: number) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellY},${cellZ}`;
  }

  create(object: RigidBody, id: number) {
    const [min, max] = this.getBounds(object.aabb);

    const hashes = new Set<string>();

    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          const key = `${x},${y},${z}`;
          if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
          }
          this.grid.get(key)!.add(id);
          hashes.add(key);
        }
      }
    }
    this.hashesPerObject.set(id, hashes);
  }

  update(object: RigidBody, id: number) {
    const oldHashes = this.hashesPerObject.get(id);
    const [min, max] = this.getBounds(object.aabb);
    const newHashes = new Set<string>();
    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          const key = `${x},${y},${z}`;
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
    oldHashes: Set<string> | undefined,
    newHashes: Set<string>
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
    const [min, max] = this.getBounds(object.aabb);

    nearby.clear();

    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          const key = `${x},${y},${z}`;
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
  private getCell(hash: string) {
    return hash.split(",").map(Number);
  }
  private getBounds(box: Box3) {
    const min = box.min;
    const max = box.max;

    const [mX, mY, mZ] = this.getCell(this.hash(min.x, min.y, min.z));
    const [MX, MY, MZ] = this.getCell(this.hash(max.x, max.y, max.z));
    minV.set(mX, mY, mZ);
    maxV.set(MX, MY, MZ);
    return [minV, maxV];
  }

  show(parentScene: Scene) {
    scene = parentScene;
    g = new BoxGeometry(this.cellSize, this.cellSize, this.cellSize);
    e = new EdgesGeometry(g);
    m = new MeshBasicMaterial({ color: 0xff0000 });
    line = new LineSegments(e, m);
    this.grid.forEach((_, key) => this.updateVisualizer(key));
  }

  private updateVisualizer(key: string) {
    if (!scene) return;
    if (!GridHelpers.has(key)) {
      const helper = line.clone();
      GridHelpers.set(key, helper);
      scene!.add(helper);
    }
    const helper = GridHelpers.get(key)!;
    const [x, y, z] = this.getCell(key);
    helper.position.set(
      x * this.cellSize + this.cellSize / 2,
      y * this.cellSize + this.cellSize / 2,
      z * this.cellSize + this.cellSize / 2
    );
  }

  private removeVisualizer(key: string) {
    if (!scene) return;
    const helper = GridHelpers.get(key);
    if (helper) {
      scene!.remove(helper);
      GridHelpers.delete(key);
    }
  }
}

export default SpatialHash;
