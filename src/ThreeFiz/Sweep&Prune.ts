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
const sortArr: { body: RigidBody; id: number }[] = [];
let activeIndex: number[] = [];
let activeHost = false;
const collisionsIndexes: number[][] = [];
let PAIRS_POOL: number[][] = [];
let PAIRS_POOL_INIT = false;
let pairsPoolIndex = 0;

const getMaxPairsCount = (n: number) => n - 1;

const SweepAndPrune = (
  objects: RigidBody[],
  hostID: number,
  others: number[]
) => {
  if (!PAIRS_POOL_INIT) {
    const maxPairs = getMaxPairsCount(objects.length);
    PAIRS_POOL = Array(maxPairs)
      .fill(null)
      .map(() => [hostID, 0]);
    activeIndex = Array(maxPairs).fill(-1);
    PAIRS_POOL_INIT = true;
  }

  collisionsIndexes.length = 0;
  pairsPoolIndex = 0;

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
