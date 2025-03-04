import { Box3, Vector3 } from "three";
import AABBNode from "./AABBNode";

const boxMerge = new Box3();
const tempVec = new Vector3();
export const calculateSurfaceArea = (aabb: Box3): number => {
  tempVec.subVectors(aabb.max, aabb.min);
  const { x, y, z } = tempVec;
  return 2 * (x * y + y * z + x * z);
};

export const calculateEnlargement = (node: AABBNode, aabb: Box3): number => {
  boxMerge.copy(node.aabb).union(aabb);
  const mergedArea = calculateSurfaceArea(boxMerge);
  return mergedArea - node.surfaceArea;
};
