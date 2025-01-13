import { Box3 } from "three";
import RigidBody from "./RigidBody";

const boxMerge = new Box3();
const bodyToNode = new Map<RigidBody, Node>();
const freeNodes: Node[] = [];

class Node {
  aabb: Box3;
  name: string | null = null;
  parent: Node | null = null;
  left: Node | null = null;
  right: Node | null = null;
  object: RigidBody | null = null;

  constructor(aabb: Box3, object?: RigidBody, name?: string, parent?: Node) {
    this.aabb = aabb;
    this.name = name || null;
    this.parent = parent || null;
    this.object = object || null;
  }

  get isLeaf(): boolean {
    return !this.left && !this.right;
  }
}

class AABBTree {
  root: Node | null;

  constructor() {
    this.root = null;
  }

  insert(object: RigidBody, name?: string): void {
    const aabb = object.aabb;
    const node = new Node(aabb, object, name);
    bodyToNode.set(object, node);
    if (!this.root) {
      this.root = node;
      return;
    }
    this.root = this.insertNode(node);
  }

  private mergeAABBs(aabb1: Box3, aabb2: Box3, margin: number = 0): Box3 {
    return new Box3().copy(aabb1).union(aabb2).expandByScalar(margin);
  }

  private insertNode(node: Node): Node {
    const bestLeaf = this.findBestLeaf(node);
    const newParent = new Node(this.mergeAABBs(node.aabb, bestLeaf.aabb, 1));

    const oldParent = bestLeaf.parent;
    if (oldParent) {
      if (oldParent.left === bestLeaf) {
        oldParent.left = newParent;
      } else {
        oldParent.right = newParent;
      }
      newParent.parent = oldParent;
    }

    newParent.left = bestLeaf;
    newParent.right = node;
    bestLeaf.parent = newParent;
    node.parent = newParent;

    this.refitAncestors(newParent);

    return oldParent || newParent;
  }

  private findBestLeaf(node: Node): Node {
    let current = this.root!;
    let bestCost = Infinity;
    let bestNode = null;

    while (!current.isLeaf) {
      const currentCost = this.calculateEnlargement(current.aabb, node.aabb);

      if (currentCost < bestCost) {
        bestCost = currentCost;
        bestNode = current;
      }

      const leftCost = this.calculateEnlargement(current.left!.aabb, node.aabb);
      const rightCost = this.calculateEnlargement(
        current.right!.aabb,
        node.aabb
      );

      current = leftCost < rightCost ? current.left! : current.right!;
    }

    return current;
  }

  private refitAncestors(node: Node): void {
    let current: Node | null = node;
    while (current !== null) {
      if (!current.isLeaf) {
        current.aabb.copy(current.left!.aabb).union(current.right!.aabb);
      }
      current = current.parent;
    }
  }

  private calculateEnlargement(aabb1: Box3, aabb2: Box3): number {
    boxMerge.copy(aabb1).union(aabb2);
    const area = this.calculateSurfaceArea(aabb1);
    const mergedArea = this.calculateSurfaceArea(boxMerge);
    return mergedArea - area;
  }

  private calculateSurfaceArea(aabb: Box3): number {
    const dx = aabb.max.x - aabb.min.x;
    const dy = aabb.max.y - aabb.min.y;
    const dz = aabb.max.z - aabb.min.z;
    return 2 * (dx * dy + dy * dz + dx * dz);
  }

  query(
    aabb: Box3,
    results: RigidBody[],
    node: Node | null = this.root!
  ): RigidBody[] {
    if (!node) return results;
    console.log(node, aabb.intersectsBox(node.aabb));
    if (node.isLeaf) {
      console.log(node.aabb);
    }
    if (aabb.intersectsBox(node.aabb)) {
      if (node.isLeaf && !aabb.equals(node.aabb)) {
        results.push(node.object!);
      } else {
        this.query(aabb, results, node.left);
        this.query(aabb, results, node.right);
      }
    }
    return results;
  }

  update(object: RigidBody): void {
    const node = bodyToNode.get(object)!;
    if (node.parent!.aabb.containsBox(object.aabb)) {
      return; // No need to update if new AABB is contained in the old one
    }
    // console.log("udpate", node.name);
    this.removeNode(node);
    this.insertNode(node);
    this.refitAncestors(node);
  }

  private removeNode(node: Node): void {
    if (node === this.root) {
      this.root = null;
      return;
    }

    const parent = node.parent!;
    const grandParent = parent.parent;
    const sibling = parent.left === node ? parent.right! : parent.left!;

    if (grandParent) {
      if (grandParent.left === parent) {
        grandParent.left = sibling;
      } else {
        grandParent.right = sibling;
      }
      sibling.parent = grandParent;

      this.refitAncestors(grandParent);
    } else {
      this.root = sibling;
      sibling.parent = null;
    }
  }

  visualizeToString(node: Node | null = this.root, depth: number = 0): string {
    if (!node) return "";
    const indent = "    ".repeat(depth);
    const info = node.isLeaf ? `${node.name}` : depth < 1 ? "ROOT" : "[_box_]";

    const rightSubtree = this.visualizeToString(node.right, depth + 1);

    const leftSubtree = this.visualizeToString(node.left, depth + 1);

    return `${rightSubtree}${indent}${info}\n${leftSubtree}`;
  }
}

export default AABBTree;
