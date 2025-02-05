import TinyQueue from "tinyqueue";
import RigidBody from "./RigidBody";

interface EndPoint {
  isStart: boolean;
  value: number;
  index: number;
}

const endpoints: TinyQueue<EndPoint> = new TinyQueue<EndPoint>(
  [],
  (a: EndPoint, b: EndPoint) => a.value - b.value
);
let objects: RigidBody[] = [];
const sortArr: { body: RigidBody; id: number }[] = [];
let activeIndex: number[] = [];
let activeHost = false;
const collisionsIndexes: number[][] = [];
let PAIRS_POOL: number[][] = [];
let pairsPoolIndex = 0;

const getMaxPairsCount = (n: number) => n - 1;

export const init = (objs: RigidBody[]) => {
  objects.push(...objs);
  const maxPairs = getMaxPairsCount(objects.length);
  PAIRS_POOL = Array(maxPairs)
    .fill(null)
    .map(() => [0, 0]);
  activeIndex = Array(maxPairs).fill(-1);
};

const SweepAndPrune = (hostID: number, others: number[]) => {
  collisionsIndexes.length = 0;
  pairsPoolIndex = 0;
  endpoints.length = 0;
  endpoints.data.length = 0;

  sortArr.push({ body: objects[hostID], id: hostID });
  for (const i of others) {
    sortArr.push({ body: objects[i], id: i });
  }

  sortByXAxis(sortArr);
  activeHost = false;

  while (endpoints.data.length > 0) {
    const obj = endpoints.pop();
    if (!obj) continue;
    if (obj.isStart) {
      if (obj.index === hostID) activeHost = true;
      else activeIndex[obj.index] = obj.index;
    } else {
      if (obj.index === hostID) break;
      if (!activeHost) activeIndex[obj.index] = -1;
    }
  }

  while (others.length > 0) {
    const id = others.pop();
    if (!id) continue;
    if (activeIndex[id] === -1) continue;
    const pair = PAIRS_POOL[pairsPoolIndex++];
    pair[0] = hostID;
    pair[1] = activeIndex[id];
    collisionsIndexes.push(pair);
  }

  return collisionsIndexes;
};

const sortByXAxis = (arr: typeof sortArr) => {
  for (const obj of arr) {
    endpoints.push({
      isStart: true,
      value: obj.body.aabb.min.x,
      index: obj.id,
    });
    endpoints.push({
      isStart: false,
      value: obj.body.aabb.max.x,
      index: obj.id,
    });
  }
  arr.length = 0;
};

export default SweepAndPrune;
