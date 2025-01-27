import { Box3, Box3Helper, Color, Scene, Vector3 } from "three";
import TinyQueue from "tinyqueue";

const DEFAULT_MARGIN = 3;

const boxMerge = new Box3();
const leafNodes = new Map<number, Node>();
const freeNodes: Node[] = [];
const costResetNodes: Node[] = [];
const bestCostCandidates = new TinyQueue<Node>([], (a, b) => a.cost - b.cost);
let n = 0;
let m = 0;
const tempVec = new Vector3();
const helpers: Box3Helper[] = [];

const calculateSurfaceArea = (aabb: Box3): number => {
  tempVec.subVectors(aabb.max, aabb.min);
  const { x, y, z } = tempVec;
  return 2 * (x * y + y * z + x * z);
};

const calculateEnlargement = (node: Node, aabb: Box3): number => {
  boxMerge.copy(node.aabb).union(aabb);
  const mergedArea = calculateSurfaceArea(boxMerge);
  return mergedArea - node.surfaceArea;
};

class Node {
  aabb: Box3;
  name: string | null = null;
  parent: Node | null = null;
  left: Node | null = null;
  leftEnlargement = 0;
  rightEnlargement = 0;
  right: Node | null = null;
  objectID: number | null = null;
  height: number = 0;
  cost = -1;
  isLeaf = false;
  surfaceArea = 0;

  constructor(aabb: Box3, objectID?: number, name?: string, parent?: Node) {
    this.aabb = aabb;
    this.name = name ?? null;
    this.parent = parent ?? null;
    this.objectID = objectID ?? null;
    this.calculateSurfaceArea();
  }
  calculateSurfaceArea() {
    tempVec.subVectors(this.aabb.max, this.aabb.min);
    const { x, y, z } = tempVec;
    this.surfaceArea = 2 * (x * y + y * z + x * z);
  }

  calculateAABB(margin: number): void {
    if (this.left!.isLeaf && this.right!.isLeaf)
      this.aabb
        .copy(this.left!.aabb)
        .union(this.right!.aabb)
        .expandByScalar(margin);
    else this.aabb.copy(this.left!.aabb).union(this.right!.aabb);

    this.calculateSurfaceArea();

    n = Math.max(this.left!.height, this.right!.height) + 1;
    this.height = n;
  }

  calculateEnlargement(childBox: Box3): void {
    const enlargement = calculateEnlargement(this, childBox);
    if (childBox === this.left!.aabb) this.leftEnlargement = enlargement;
    else this.rightEnlargement = enlargement;
  }

  reset() {
    this.parent = null;
    this.left = null;
    this.right = null;
    this.height = 0;
    this.cost = -1;
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

  insert(aabb: Box3, objectID: number, name?: string): void {
    const node = new Node(aabb, objectID, name);
    node.isLeaf = true;
    this.nodes.push(node);
    leafNodes.set(objectID, node);
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

    this.root!.cost = calculateEnlargement(this.root!, node.aabb);
    bestCostCandidates.push(this.root!);

    while (bestCostCandidates.length) {
      const current = this.popBestNode();
      const totalCost = current.cost;

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
          if (rightCost < leftCost) bestCostCandidates.push(current.right!);
        }
      }
    }
    this.resetCosts();
    return bestNode;
  }

  private popBestNode(): Node {
    const node = bestCostCandidates.pop()!;
    costResetNodes.push(node);
    return node;
  }

  private resetCosts(): void {
    while (costResetNodes.length) {
      costResetNodes.pop()!.cost = -1;
    }
  }

  private calculateCost(node1: Node, node2: Node) {
    return (
      calculateEnlargement(node1, node2.aabb) +
      this.calculateInheritanceCost(node1)
    );
  }

  private calculateInheritanceCost(node: Node): number {
    let cost = 0;
    let child = node;
    let current = node.parent;

    while (current) {
      const enlargement =
        child == current.left
          ? current.leftEnlargement
          : current.rightEnlargement;
      cost += enlargement;
      child = current;
      current = current.parent;
    }

    return cost;
  }

  private refitAncestors(
    node: Node,
    callback?: (node: Node, box: Box3) => void
  ): void {
    let current: Node | null = node;
    let childAABB = current.aabb;

    while (current !== null) {
      if (!current.isLeaf) {
        current.calculateAABB(this.margin);

        callback && callback(current, childAABB);
      }
      childAABB = current.aabb;
      current = current.parent;
    }
  }

  query(aabb: Box3): number[] {
    const results: number[] = [];
    if (!this.root) return results;

    const stack: Node[] = [this.root];
    let stackIndex = 1;

    while (stackIndex > 0) {
      const node = stack[--stackIndex];

      if (aabb.intersectsBox(node.aabb)) {
        if (node.isLeaf && !aabb.equals(node.aabb)) {
          results.push(node.objectID!);
        } else if (node.left && node.right) {
          stack[stackIndex++] = node.right;
          stack[stackIndex++] = node.left;
        }
      }
    }

    return results;
  }

  update(objectID: number, aabb: Box3): void {
    const node = leafNodes.get(objectID);
    if (!node) return;
    if (node.parent!.aabb.containsBox(aabb)) {
      return; // No need to update if new AABB is contained in the old one
    }

    this.removeLeaf(node);
    this.insertNode(node);
    this.refitAncestors(node, (n, b) => n.calculateEnlargement(b));

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
      this.refitAncestors(sibling.parent);
    } else {
      // parent is root
      this.root = sibling;
      sibling.parent = null;
    }
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
