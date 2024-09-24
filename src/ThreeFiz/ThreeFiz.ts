import Cuboid from "./Cuboid";
import { Scene, Vector3 } from "three";
import World from "./World";
import RigidBody, { RigidBodyProps } from "./RigidBody";
import Sphere from "./Sphere";
import SweepAndPrune from "./Sweep&Prune";

const v = new Vector3();

type Props = {
  scene: Scene;
  timeStep: number;
  gravity: Vector3;
};
class ThreeFiz {
  private dT: number = 0.0;
  private accumulator: number = 0.0;
  private lastTicks: number = 0.0;
  objects: RigidBody[] = [];
  private readonly scene: Scene;
  private readonly world: World;
  private isPaused: boolean = false;

  constructor({
    scene = new Scene(),
    gravity = new Vector3(0, -9.8, 0),
  }: Partial<Props> = {}) {
    this.scene = scene;
    this.world = new World(gravity);
    document.addEventListener("visibilitychange", this.visibilityChange);
  }

  addBox(object: Partial<RigidBodyProps>): void {
    const newObject = new Cuboid(object);
    this.objects.push(newObject);
    this.scene.add(newObject.mesh);
    newObject.mesh.position.copy(newObject.getPosition(v));
  }

  addSphere(object: Partial<RigidBodyProps>): void {
    const newObject = new Sphere(object);
    this.objects.push(newObject);
    this.scene.add(newObject.mesh);
  }

  init(): void {
    this.lastTicks = Date.now();
    this.world.updateObjects(this.objects, 0);
  }

  setGravity(gravity: Vector3): void {
    this.world.setGravity(gravity);
  }

  private update(dT: number): void {
    this.world.updateObjects(this.objects, dT);
    this.detectCollisions();
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }
  onCollision(_object1: RigidBody, _object2: RigidBody): void {}
  private detectCollisions(): void {
    const potentialCollisionsIndexes = SweepAndPrune(this.objects);
    potentialCollisionsIndexes.forEach((indexes) => {
      const objA = this.objects[indexes[0]];
      const objB = this.objects[indexes[1]];
      if (!objA.isStatic || !objB.isStatic)
        if (objA.intersects(objB)) {
          objA.resolveCollision(objB);
          this.onCollision(objA, objB);
        }
    });
  }

  visibilityChange = () => {
    if (!document.hidden) this.lastTicks = Date.now();
  };

  step(): void {
    const fixedTimeStep = 0.001;
    this.accumulator += this.dT;

    while (this.accumulator >= fixedTimeStep) {
      if (!this.isPaused) this.update(fixedTimeStep);
      this.accumulator -= fixedTimeStep;
    }

    const currentTime = Date.now();
    this.dT = (currentTime - this.lastTicks) / 1000;
    this.lastTicks = currentTime;
  }
}

export default ThreeFiz;
