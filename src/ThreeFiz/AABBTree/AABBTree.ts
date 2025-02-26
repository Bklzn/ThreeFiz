import { Box3, Box3Helper, Color, Scene } from "three";
import TinyQueue from "tinyqueue";
import AABBNode from "./AABBNode";
import { calculateEnlargement } from "./utils";

const DEFAULT_MARGIN = 1;

const leafNodes: AABBNode[] = [];
const freeNodes: AABBNode[] = [];
const costResetNodes: AABBNode[] = [];
const bestCostCandidates = new TinyQueue<AABBNode>(
  [],
  (a, b) => a.cost - b.cost
);
let n = 0;
let m = 0;
const helpers: Box3Helper[] = [];
let RESULTS_COUNT = 0;
const STACK: AABBNode[] = new Array<AABBNode>(126);
let STACK_INDEX = 0;

class AABBTree {
  root: AABBNode | null;
  nodes: AABBNode[] = [];
  margin: number;

  constructor(margin: number = DEFAULT_MARGIN) {
    this.root = null;
    this.margin = margin;
  }

  insert(aabb: Box3, objectID: number, name?: string): void {
    const node = new AABBNode(aabb, objectID, name);
    STACK_INDEX++;
    node.isLeaf = true;
    this.nodes.push(node);
    leafNodes[objectID] = node;
    this.insertNode(node);
  }

  private insertNode(node: AABBNode): void {
    if (!this.root) {
      this.root = node;
      return;
    }

    const bestLeaf = this.findBestLeaf(node);
    let newParent = freeNodes.pop();
    if (!newParent)
      newParent = new AABBNode(new Box3().copy(node.aabb).union(bestLeaf.aabb));

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
    this.refitAncestors(node);
  }

  private findBestLeaf(node: AABBNode): AABBNode {
    let bestCost = Number.MAX_VALUE;
    let bestNode = this.root!;

    this.root!.cost = calculateEnlargement(bestNode, node.aabb);
    bestCostCandidates.push(bestNode);

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
          if (rightCost < bestCost) bestCostCandidates.push(current.right!);
        }
      }
    }
    this.resetCosts();
    return bestNode;
  }

  private popBestNode(): AABBNode {
    const node = bestCostCandidates.pop()!;
    costResetNodes.push(node);
    return node;
  }

  private resetCosts(): void {
    while (costResetNodes.length) {
      costResetNodes.pop()!.cost = -1;
    }
  }

  private calculateCost(node1: AABBNode, node2: AABBNode) {
    return (
      calculateEnlargement(node1, node2.aabb) +
      this.calculateInheritanceCost(node1)
    );
  }

  private calculateInheritanceCost(node: AABBNode): number {
    let cost = 0;
    let child = node;
    let current = node.parent;
    let enlargement = 0;

    while (current) {
      enlargement = current.rightEnlargement;
      if (child == current.left) enlargement = current.leftEnlargement;
      cost += enlargement;
      child = current;
      current = current.parent;
    }

    return cost;
  }

  private refitAncestors(node: AABBNode): void {
    let current: AABBNode | null = node;
    let childAABB = current.aabb;

    while (current !== null) {
      if (!current.isLeaf) {
        current.calculateAABB(this.margin);

        current.calculateEnlargement(childAABB);
        current.fillInclludedLeafs();
      }
      current.calculateSurfaceArea();

      childAABB = current.aabb;
      current = current.parent;
    }
  }

  query(results: Uint16Array, aabb: Box3, objectID: number): number {
    RESULTS_COUNT = 0;
    if (!this.root) return RESULTS_COUNT;
    STACK[0] = this.root;
    STACK_INDEX = 1;

    let node: AABBNode;
    while (STACK_INDEX !== 0) {
      node = STACK[--STACK_INDEX];
      if (objectID >= node.biggestIncludedObjectId) continue;
      if (!node.aabb.intersectsBox(aabb)) continue;
      if (node.isLeaf) {
        results[RESULTS_COUNT++] = node.objectID!;
      } else {
        STACK[STACK_INDEX++] = node.left!;
        STACK[STACK_INDEX++] = node.right!;
      }
    }

    return RESULTS_COUNT;
  }

  update(objectID: number, aabb: Box3): void {
    const node = leafNodes[objectID];
    if (!node) return;
    if (node.parent!.aabb.containsBox(aabb)) {
      return; // No need to update if new AABB is contained in the old one
    }

    this.removeLeaf(node);
    this.insertNode(node);
    this.refitAncestors(node);
    this.updateHelpers();
  }

  private removeLeaf(node: AABBNode): void {
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

  visualizeToString(
    node: AABBNode | null = this.root,
    depth: number = 0
  ): string {
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
    node: AABBNode | null = this.root,
    color: Color = new Color("blue")
  ): void {
    if (!node) return;
    const helper = new Box3Helper(
      node.isLeaf ? node.aabb : new Box3().copy(node.aabb),
      color
    );
    helper.userData = { isLeaf: node.isLeaf };

    scene.add(helper);
    helpers.push(helper);

    this.visualize(scene, node.right, color);
    this.visualize(scene, node.left, color);
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
