import RigidBody from "./RigidBody";

interface EndPoint {
  isStart: boolean;
  value: number;
  index: number;
}

const SweepAndPrune = (objects: RigidBody[]) => {
  const potentialCollisionsIndexes = new Set<[number, number]>();
  const sortedObjects = sortByXAxis(objects);
  const activeIndex = new Set<number>();
  // console.log(objects);
  // console.log(sortedObjects);
  for (const obj of sortedObjects) {
    if (obj.isStart) {
      for (const id of activeIndex) {
        potentialCollisionsIndexes.add([
          Math.min(id, obj.index),
          Math.max(id, obj.index),
        ]);
      }
      activeIndex.add(obj.index);
    } else activeIndex.delete(obj.index);
  }
  // console.log(objects.length ** 2, potentialCollisionsIndexes.size);
  // throw new Error("Not implemented");
  return potentialCollisionsIndexes;
};

const sortByXAxis = (objects: RigidBody[]) => {
  const endpoints: EndPoint[] = new Array(objects.length * 2);
  let j = 0;
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    endpoints[j++] = { isStart: true, value: obj.aabb.min.x, index: i };
    endpoints[j++] = { isStart: false, value: obj.aabb.max.x, index: i };
  }
  return endpoints.sort((a, b) => a.value - b.value);
};

export default SweepAndPrune;
