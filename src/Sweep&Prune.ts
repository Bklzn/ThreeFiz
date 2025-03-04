import RigidBody from "./RigidBody";
import { Box3 } from "three";

let objects: RigidBody[] = [];
let hostAABB: Box3;
let MatchedIds: Uint16Array;
let MatchedIndex: number;

export const init = (objs: RigidBody[]) => {
  objects.push(...objs);
  MatchedIds = new Uint16Array(objs.length);
};

const SweepAndPrune = (
  hostID: number,
  others: Uint16Array,
  maxResults: number
) => {
  hostAABB = objects[hostID].aabb;
  MatchedIndex = 0;

  for (let i = 0; i < maxResults; i++)
    if (isMatched(objects[others[i]].aabb)) others[MatchedIndex++] = others[i];

  return MatchedIndex;
};

const isMatched = (aabb: Box3) => {
  return hostAABB.min.x < aabb.max.x && hostAABB.max.x > aabb.min.x;
};

export default SweepAndPrune;
