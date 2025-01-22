import { Box3, Box3Helper, Color, Scene, Vector3 } from "three";
import RigidBody from "./RigidBody";
import TinyQueue from "tinyqueue";

const DEFAULT_MARGIN = 10;

const boxMerge = new Box3();
const leafNodes = new Map<RigidBody, Node>();
const freeNodes: Node[] = [];
const bestCostCandidates = new TinyQueue<Node>([], (a, b) => a.cost - b.cost);
let n = 0;
let m = 0;
const tempVec = new Vector3();
const helpers: Box3Helper[] = [];

class Node {
  aabb: Box3;
  name: string | null = null;
  parent: Node | null = null;
  left: Node | null = null;
  right: Node | null = null;
  object: RigidBody | null = null;
  height: number = 0;
  cost = Number.MAX_VALUE;
  isLeaf = false;
  surfaceArea = 0;

  constructor(aabb: Box3, object?: RigidBody, name?: string, parent?: Node) {
    this.aabb = aabb;
    this.name = name || null;
    this.parent = parent || null;
    this.object = object || null;
    this.calculateSurfaceArea;
  }
  calculateSurfaceArea() {
    tempVec.subVectors(this.aabb.max, this.aabb.min);
    const { x, y, z } = tempVec;
    this.surfaceArea = 2 * (x * y + y * z + x * z);
  }

  reset() {
    this.parent = null;
    this.left = null;
    this.right = null;
    this.object = null;
    this.height = 0;
    this.cost = Number.MAX_VALUE;
    this.isLeaf = false;
    this.surfaceArea = 0;
  }
}

class AABBTree {
  root: Node | null;
  nodes: Node[] = [];
  margin: number;

  constructor(margin: number = DEFAULT_MARGIN) {
    this.root = null;
    this.margin = margin;
  }

  insert(object: RigidBody, name?: string): void {
    const aabb = object.aabb;
    const node = new Node(aabb, object, name);
    node.isLeaf = true;
    this.nodes.push(node);
    leafNodes.set(object, node);
    if (!this.root) {
      this.root = node;
      return;
    }
    this.insertNode(node);
  }

  private insertNode(node: Node): void {
    const bestLeaf = this.findBestLeaf(node);
    let newParent = freeNodes.pop();
    if (!newParent)
      newParent = new Node(new Box3().copy(node.aabb).union(bestLeaf.aabb));

    newParent.left = bestLeaf;
    newParent.right = node;

    this.nodes.push(newParent);

    const oldParent = bestLeaf.parent;
    if (oldParent) {
      newParent.parent = oldParent;
      if (oldParent.left === bestLeaf) oldParent.left = newParent;
      else oldParent.right = newParent;
    } else this.root = newParent;

    bestLeaf.parent = newParent;
    node.parent = newParent;

    this.refitAncestors(newParent);
  }

  private findBestLeaf(node: Node): Node {
    let bestCost = Infinity;
    let bestNode = this.root!;

    bestCostCandidates.push(this.root!);

    while (bestCostCandidates.length > 0) {
      const current = this.popBestNode();
      if (!current) continue;

      const directCost = this.calculateEnlargement(current, node.aabb);
      const inheritanceCost = this.calculateInheritanceCost(current);
      const totalCost = directCost + inheritanceCost;

      if (totalCost < bestCost) {
        if (current.isLeaf) {
          bestCost = totalCost;
          bestNode = current;
        } else {
          const leftCost = this.calculateCost(current.left!, node);
          const rightCost = this.calculateCost(current.right!, node);
          current.left!.cost = leftCost;
          current.right!.cost = rightCost;

          if (leftCost < bestCost) bestCostCandidates.push(current.left!);
          if (rightCost < bestCost) bestCostCandidates.push(current.right!);
        }
      }
    }

    return bestNode;
  }

  private popBestNode(): Node | null {
    if (bestCostCandidates.length === 0) return null;
    return bestCostCandidates.pop()!;
  }

  private calculateCost(node1: Node, node2: Node) {
    return (
      this.calculateEnlargement(node1, node2.aabb) +
      this.calculateInheritanceCost(node1)
    );
  }

  private calculateInheritanceCost(node: Node): number {
    let cost = 0;
    let current = node.parent;
    let previousAabb = node.aabb;

    while (current) {
      const enlargement = this.calculateEnlargement(current, previousAabb);
      cost += enlargement;
      previousAabb = current.aabb;
      current = current.parent;
    }

    return cost;
  }

  private calculateEnlargement(node: Node, aabb: Box3): number {
    boxMerge.copy(node.aabb).union(aabb);
    const mergedArea = this.calculateSurfaceArea(boxMerge);
    return mergedArea - node.surfaceArea;
  }

  calculateSurfaceArea(aabb: Box3): number {
    tempVec.subVectors(aabb.max, aabb.min);
    const { x, y, z } = tempVec;
    return 2 * (x * y + y * z + x * z);
  }

  private refitAncestors(node: Node): void {
    let current: Node | null = node;
    while (current !== null) {
      if (!current.isLeaf) {
        if (current.left?.isLeaf && current.right?.isLeaf)
          current.aabb
            .copy(current.left!.aabb)
            .union(current.right!.aabb)
            .expandByScalar(this.margin);
        else current.aabb.copy(current.left!.aabb).union(current.right!.aabb);
        current.calculateSurfaceArea();
        n = Math.max(current.left!.height, current.right!.height) + 1;
        current.height = n;
      }
      current = current.parent;
    }
  }

  query(aabb: Box3, results: RigidBody[]): RigidBody[] {
    if (!this.root) return results;

    const stack: Node[] = [this.root];
    let stackIndex = 1;

    while (stackIndex > 0) {
      const node = stack[--stackIndex];

      if (aabb.intersectsBox(node.aabb)) {
        if (node.isLeaf && !aabb.equals(node.aabb)) {
          results.push(node.object!);
        } else if (node.left && node.right) {
          stack[stackIndex++] = node.right;
          stack[stackIndex++] = node.left;
        }
      }
    }

    return results;
  }
  update(object: RigidBody): void {
    const node = leafNodes.get(object);
    if (!node) return;
    if (node.parent!.aabb.containsBox(object.aabb)) {
      return; // No need to update if new AABB is contained in the old one
    }

    this.removeLeaf(node);
    this.insertNode(node);
    this.refitAncestors(node.parent!);

    this.updateHelpers();
  }

  private removeLeaf(node: Node): void {
    if (node === this.root) {
      this.root = null;
      return;
    }

    const parent = node.parent!;
    const grandParent = parent.parent;
    const sibling = parent.left === node ? parent.right! : parent.left!;

    this.nodes[this.nodes.indexOf(parent)] = this.nodes[this.nodes.length - 1];
    this.nodes.pop();

    freeNodes.push(parent);
    parent.reset();

    if (grandParent) {
      if (grandParent.left === parent) {
        grandParent.left = sibling;
      } else {
        grandParent.right = sibling;
      }
      sibling.parent = grandParent;
    } else {
      // parent is root
      this.root = sibling;
      sibling.parent = null;
    }
    this.refitAncestors(sibling.parent!);
  }

  visualizeToString(node: Node | null = this.root, depth: number = 0): string {
    if (!node) return "";
    const indent = "  ".repeat(depth);
    const info = node.isLeaf
      ? `${node.name}`
      : node === this.root
      ? "ROOT"
      : "B";

    const rightSubtree = this.visualizeToString(node.right, depth + 1);
    const leftSubtree = this.visualizeToString(node.left, depth + 1);

    return `${rightSubtree}${indent}${info}\n${leftSubtree}`;
  }

  visualize(
    scene: Scene,
    node: Node | null = this.root,
    color: Color = new Color("blue"),
    height: number = 0
  ): void {
    if (!node) return;
    const helper = new Box3Helper(
      node.isLeaf ? node.aabb : new Box3().copy(node.aabb),
      color
    );
    helper.userData = { isLeaf: node.isLeaf };

    scene.add(helper);
    helpers.push(helper);

    this.visualize(scene, node.right, color, height + 1);
    this.visualize(scene, node.left, color, height + 1);
  }

  private updateHelpers(): void {
    if (helpers.length) {
      n = m = 0;
      const parents = this.nodes.filter((n) => !n.isLeaf);
      while (n < parents.length) {
        if (!helpers[m].userData.isLeaf) {
          helpers[m].box.copy(parents[n].aabb);
          n++;
        }
        m++;
      }
    }
  }
}

export default AABBTree;
