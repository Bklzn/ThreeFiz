import { Vector3 } from "three";
import RigidBody from "./RigidBody";
import SpatialHash from "./SpatialHash";

const v = new Vector3();
class World {
  private gravity: Vector3;

  constructor(gravity: Vector3 = new Vector3(0, -9.8, 0)) {
    this.gravity = gravity;
  }

  setGravity(gravity: Vector3): void {
    this.gravity = gravity;
  }

  private applyGravity(object: RigidBody, dT: number): void {
    if (!object.isStatic)
      object.setVelocity((old) =>
        old.add(v.copy(this.gravity).multiplyScalar(dT))
      );
  }

  updateObjects(
    objects: RigidBody[],
    dT: number,
    spartialGrid?: SpatialHash
  ): void {
    objects.forEach((object, i) => {
      if (!object.isStatic) object.needsUpdate = true;
      if (object.needsUpdate) {
        this.applyGravity(object, dT);
        object.updatePosition(dT);
        object.updateRotation(dT);
        object.mesh.updateMatrix();
        object.mesh.updateMatrixWorld();
        object.updateAABB();
        object.updateCollider();
        spartialGrid && spartialGrid.update(object, i);
        object.needsUpdate = false;
      }
      object.debug.update();
    });
  }
}

export default World;
