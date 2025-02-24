import { Box3 } from "three";
import { calculateEnlargement, calculateSurfaceArea } from "./utils";

let n = 0;
class AABBNode {
  aabb: Box3;
  name: string | null = null;
  parent: AABBNode | null = null;
  left: AABBNode | null = null;
  leftEnlargement = 0;
  rightEnlargement = 0;
  right: AABBNode | null = null;
  objectID: number | null = null;
  height: number = 0;
  cost = -1;
  biggestIncludedObjectId: number = -1;
  isLeaf = false;
  surfaceArea = 0;

  constructor(aabb: Box3, objectID?: number, name?: string, parent?: AABBNode) {
    this.aabb = aabb;
    this.name = name ?? null;
    this.parent = parent ?? null;
    this.objectID = objectID ?? null;
    this.calculateSurfaceArea();
    this.biggestIncludedObjectId = objectID ?? -1;
  }
  calculateSurfaceArea() {
    this.surfaceArea = calculateSurfaceArea(this.aabb);
  }

  calculateAABB(margin: number): void {
    if (this.left!.isLeaf && this.right!.isLeaf)
      this.aabb
        .copy(this.left!.aabb)
        .union(this.right!.aabb)
        .expandByScalar(margin);
    else this.aabb.copy(this.left!.aabb).union(this.right!.aabb);

    n = Math.max(this.left!.height, this.right!.height) + 1;
    this.height = n;
  }

  calculateEnlargement(childBox: Box3): void {
    const enlargement = calculateEnlargement(this, childBox);
    if (childBox === this.left!.aabb) this.leftEnlargement = enlargement;
    else this.rightEnlargement = enlargement;
  }

  fillInclludedLeafs(): void {
    if (this.isLeaf) return;
    let right = this.right!.biggestIncludedObjectId;
    let left = this.left!.biggestIncludedObjectId;
    this.biggestIncludedObjectId = Math.max(right, left);
  }

  reset() {
    this.parent = null;
    this.left = null;
    this.right = null;
    this.height = 0;
    this.cost = -1;
    this.surfaceArea = 0;
    this.biggestIncludedObjectId = -1;
  }
}

export default AABBNode;
