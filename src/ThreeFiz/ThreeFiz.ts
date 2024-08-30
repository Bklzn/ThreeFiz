import RigidBody from "./RigidBody";
import Cuboid from "./Cuboid";
import { Scene, Vector3 } from "three";

class ThreeFiz {
  dT: number;
  lastTicks: number;
  accumulator: number;
  TIME_STEP: number;
  objects: Cuboid[];
  SCENE: Scene;
  GRAVITY: Vector3;
  STOP: boolean;
  constructor({
    scene = new Scene(),
    TIME_STEP = 1,
    gravity = new Vector3(0, -9.8, 0),
  }: Partial<{
    scene: Scene;
    TIME_STEP: number;
    gravity: Vector3;
  }>) {
    this.dT = 0.0;
    this.accumulator = 0.0;
    this.lastTicks = 0.0;
    this.TIME_STEP = TIME_STEP;
    this.objects = [];
    this.SCENE = scene;
    this.GRAVITY = gravity;
    this.STOP = false;
  }
  addBox(object: Partial<Cuboid>) {
    this.objects.push(new Cuboid(object));
  }
  init() {
    this.objects.forEach((object) => {
      this.SCENE.add(object.mesh);
      object.mesh.position.copy(object.position);
    });
    this.lastTicks = Date.now();
  }
  objectsUpdate(dT: number) {
    this.processObjectsMovement(dT);
    this.collisionDetection();
  }
  processObjectsMovement(dT: number) {
    this.objects.forEach((object) => {
      if (!object.isStatic) {
        this.gravityStep(object, dT);
        object.updatePosition(dT);
        object.updateRotation(dT);
      }
      object.mesh.updateMatrix();
      object.mesh.updateMatrixWorld();
      object.updateCollider();
    });
  }
  collisionDetection() {
    for (let i = 0; i < this.objects.length - 1; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        const objA = this.objects[i];
        const objB = this.objects[j];
        if (objA.intersects(objB)) {
          const collision = objA.collider.getCollision(
            objB.collider,
            this.SCENE
          );
          // console.log(collision);
          // objA.collider.showCollision(this.SCENE);
          if (collision.depth > 0) objA.resolveCollision(objB, collision);
          if (isNaN(collision.depth)) this.STOP = true;
        }
      }
    }
  }
  gravityStep(object: RigidBody, dT: number) {
    object.velocity.add(this.GRAVITY.clone().multiplyScalar(dT));
  }
  resume() {
    this.STOP = false;
  }
  step() {
    const H = 0.001;
    this.accumulator += this.dT;
    while (this.accumulator >= H) {
      if (!this.STOP) this.objectsUpdate(H);
      this.accumulator -= H;
    }
    const ticks = Date.now();
    this.dT = (ticks - this.lastTicks) / 1000;
    this.lastTicks = ticks;
  }
}
export default ThreeFiz;
