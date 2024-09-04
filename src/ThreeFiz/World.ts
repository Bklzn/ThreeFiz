import { Vector3 } from "three";
import RigidBody from "./RigidBody";
import Cuboid from "./Cuboid";

class World {
  private gravity: Vector3;

  constructor(gravity: Vector3 = new Vector3(0, -9.8, 0)) {
    this.gravity = gravity;
  }

  setGravity(gravity: Vector3): void {
    this.gravity = gravity;
  }

  private applyGravity(object: RigidBody, dT: number): void {
    object.setVelocity((old) =>
      old.add(this.gravity.clone().multiplyScalar(dT))
    );
  }

  updateObjects(objects: Cuboid[], dT: number): void {
    objects.forEach((object) => {
      if (!object.isStatic) {
        this.applyGravity(object, dT);
      }
      object.updatePosition(dT);
      object.updateRotation(dT);
      object.mesh.updateMatrix();
      object.mesh.updateMatrixWorld();
      object.updateCollider();
      object.debug.update();
    });
  }
}

export default World;
