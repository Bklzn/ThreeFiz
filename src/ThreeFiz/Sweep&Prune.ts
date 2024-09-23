import RigidBody from "./RigidBody";

interface EndPoint {
  isStart: boolean;
  value: number;
  index: number;
}

const SweepAndPrune = (objects: RigidBody[]) => {
  const potentialCollisionsOnX_Indexes = new Set<number[]>();
  const potentialCollisionsIndexes = new Set<number[]>();
  const sortedObjects = sortByXAxis(objects);
  const activeIndex = new Set<number>();
  for (const obj of sortedObjects) {
    if (obj.isStart) {
      for (const id of activeIndex) {
        potentialCollisionsOnX_Indexes.add([
          Math.min(id, obj.index),
          Math.max(id, obj.index),
        ]);
      }
      activeIndex.add(obj.index);
    } else activeIndex.delete(obj.index);
  }

  for (const pair of potentialCollisionsOnX_Indexes) {
    const [i, j] = pair;
    if (checkYAxisCollision(objects[i], objects[j])) {
      potentialCollisionsIndexes.add(pair);
    }
  }

  return Array.from(potentialCollisionsIndexes).map((pair) => [
    pair[0],
    pair[1],
  ]);
};

const sortByXAxis = (objects: RigidBody[]) => {
  const endpoints: EndPoint[] = [];

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    endpoints.push({ isStart: true, value: obj.aabb.min.x, index: i });
    endpoints.push({ isStart: false, value: obj.aabb.max.x, index: i });
  }

  return endpoints.sort((a, b) => a.value - b.value);
};

const checkYAxisCollision = (obj1: RigidBody, obj2: RigidBody) => {
  return (
    obj1.aabb.min.y <= obj2.aabb.max.y && obj1.aabb.max.y >= obj2.aabb.min.y
  );
};

export default SweepAndPrune;
