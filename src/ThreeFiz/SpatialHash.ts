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
  private hashesPerObject: Map<number, string[]>;
  private invCellSize: number;
  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;
    this.grid = new Map();
    this.hashesPerObject = new Map();
  }

  // Funkcja haszująca dla pozycji
  private hash(v: Vector3) {
    const cellX = Math.floor(v.x * this.invCellSize);
    const cellY = Math.floor(v.y * this.invCellSize);
    const cellZ = Math.floor(v.z * this.invCellSize);
    return `${cellX},${cellY},${cellZ}`;
  }

  // Dodaj obiekt do siatki
  create(object: RigidBody, id: number): void {
    const [mX, mY, mZ] = this.getCell(this.hash(object.aabb.min));
    const [MX, MY, MZ] = this.getCell(this.hash(object.aabb.max));

    const cells: string[] = [];
    for (let x = mX; x <= MX; x++) {
      for (let y = mY; y <= MY; y++) {
        for (let z = mZ; z <= MZ; z++) {
          const hash = `${x},${y},${z}`;
          let cell = this.grid.get(hash);
          if (!cell) {
            cell = new Set();
            this.grid.set(hash, cell);
          }
          cell.add(id);
          cells.push(hash);
        }
      }
    }
    this.hashesPerObject.set(id, cells);
  }

  update(object: RigidBody, id: number) {
    const oldCells = this.hashesPerObject.get(id);
    const [mX, mY, mZ] = this.getCell(this.hash(object.aabb.min));
    const [MX, MY, MZ] = this.getCell(this.hash(object.aabb.max));

    const newCells: string[] = [];
    for (let x = mX; x <= MX; x++) {
      for (let y = mY; y <= MY; y++) {
        for (let z = mZ; z <= MZ; z++) {
          const hash = `${x},${y},${z}`;
          if (!oldCells || !oldCells.includes(hash)) {
            let cell = this.grid.get(hash);
            if (!cell) {
              cell = new Set();
              this.grid.set(hash, cell);
            }
            cell.add(id);
          }
          newCells.push(hash);
        }
      }
    }
    // Remove from old cells that are not in new hashes
    if (oldCells) {
      for (const x of oldCells) {
        if (!newCells.includes(x)) {
          const cell = this.grid.get(x);
          if (cell) {
            cell.delete(id);
            if (cell.size === 0) {
              this.grid.delete(x);
            }
          }
        }
      }
    }

    this.hashesPerObject.set(id, newCells);
  }

  findNearby(object: RigidBody, id: number) {
    const [mX, mY, mZ] = this.getCell(this.hash(object.aabb.min));
    const [MX, MY, MZ] = this.getCell(this.hash(object.aabb.max));

    const nearby: number[] = [];
    for (let x = mX; x <= MX; x++) {
      for (let y = mY; y <= MY; y++) {
        for (let z = mZ; z <= MZ; z++) {
          const hash = `${x},${y},${z}`;
          const cell = this.grid.get(hash);
          if (cell) {
            for (const other of cell) {
              if (other !== id) {
                nearby.push(other);
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

  show(parentScene: Scene) {
    scene = parentScene;
    g = new BoxGeometry(this.cellSize, this.cellSize, this.cellSize);
    e = new EdgesGeometry(g);
    m = new MeshBasicMaterial({ color: 0xff0000 });
    line = new LineSegments(e, m);
    this.updateVisualizer(this.grid.keys());
  }

  private updateVisualizer(keys: Iterable<string>) {
    if (!scene) return;
    for (const key of keys) {
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
