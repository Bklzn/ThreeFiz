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
let endpointsPool: EndPoint[];
let poolIndex = 0;
let objects: RigidBody[] = [];
let activeIndex: Set<number> = new Set();
let activeHost: boolean;

export const init = (objs: RigidBody[]) => {
  objects.push(...objs);
  endpointsPool = Array.from({ length: objs.length * 2 }, () => ({
    isStart: false,
    value: 0,
    index: 0,
  }));
};

const getEndpoint = () => {
  if (poolIndex >= endpointsPool.length) poolIndex = 0;
  return endpointsPool[poolIndex++];
};

const SweepAndPrune = (
  hostID: number,
  others: Uint16Array,
  maxResults: number
) => {
  endpoints.length = 0;
  endpoints.data.length = 0;
  activeIndex.clear();

  sortByAxis(objects[hostID], hostID);
  for (let i = 0; i < maxResults; i++)
    sortByAxis(objects[others[i]], others[i]);
  activeHost = false;

  while (endpoints.length > 0) {
    const obj = endpoints.pop();
    if (!obj) continue;
    if (obj.isStart) {
      if (obj.index === hostID) activeHost = true;
      else activeIndex.add(obj.index);
    } else {
      if (obj.index === hostID) return activeIndex;
      if (!activeHost) activeIndex.delete(obj.index);
    }
  }

  return activeIndex;
};

const sortByAxis = (obj: RigidBody, id: number) => {
  const start = getEndpoint();
  const end = getEndpoint();

  start.isStart = true;
  start.value = obj.aabb.min.x;
  start.index = id;

  end.isStart = false;
  end.value = obj.aabb.max.x;
  end.index = id;

  endpoints.push(start);
  endpoints.push(end);
};

export default SweepAndPrune;
