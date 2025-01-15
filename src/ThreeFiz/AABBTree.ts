import { Box3, Box3Helper, Color, Scene } from "three";
import RigidBody from "./RigidBody";

const DEFAULT_MARGIN = 5;

const boxMerge = new Box3();
const leafNodes = new Map<RigidBody, Node>();
const freeNodes: Node[] = [];
let n = 0;
let m = 0;
const helpers: Box3Helper[] = [];

class Node {
  aabb: Box3;
  name: string | null = null;
  parent: Node | null = null;
  left: Node | null = null;
  right: Node | null = null;
  object: RigidBody | null = null;
  height: number = 0;

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
  nodes: Node[] = [];
  margin: number;

  constructor(margin: number = DEFAULT_MARGIN) {
    this.root = null;
    this.margin = margin;
  }

  insert(object: RigidBody, name?: string): void {
    const aabb = object.aabb;
    const node = new Node(aabb, object, name);
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
    const newParent = new Node(new Box3().copy(node.aabb).union(bestLeaf.aabb));

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
        if (current.left?.isLeaf || current.right?.isLeaf)
          current.aabb
            .copy(current.left!.aabb)
            .union(current.right!.aabb)
            .expandByScalar(this.margin);
        else current.aabb.copy(current.left!.aabb).union(current.right!.aabb);
        n = Math.max(current.left!.height, current.right!.height) + 1;
        current.height = n;
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
    const node = leafNodes.get(object)!;
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

    this.nodes.splice(this.nodes.indexOf(parent), 1);

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

  visualizeToString(node: Node | null = this.root): string {
    if (!node) return "";
    const indent = "  ".repeat(node.height);
    const info = node.isLeaf
      ? `${node.name}`
      : node === this.root
      ? "ROOT"
      : "B";

    const rightSubtree = this.visualizeToString(node.right);
    const leftSubtree = this.visualizeToString(node.left);

    return `${leftSubtree}${indent}${info}\n${rightSubtree}`;
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

export default AABBTree;
