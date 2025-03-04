import {
  ArrowHelper,
  Box3Helper,
  Color,
  MeshBasicMaterial,
  Scene,
  Vector3,
} from "three";
import RigidBody from "./RigidBody";

class Debug {
  LinearVelocityVector:
    | {
        color: Color;
        minLength: number;
      }
    | undefined;
  showAABB:
    | {
        color: Color;
      }
    | undefined;
  private AABBHelper: Box3Helper | undefined;
  private scene: Scene;
  private object: RigidBody;
  private linearVectorHelper: ArrowHelper | undefined;
  constructor(object: RigidBody) {
    this.object = object;
    this.LinearVelocityVector;
    this.linearVectorHelper;
    this.scene = this.object.mesh.parent as Scene;
  }

  private drawVectorHelper() {
    const { color, minLength } = this.LinearVelocityVector!;
    this.linearVectorHelper = new ArrowHelper(
      new Vector3(),
      new Vector3(),
      minLength
    );
    const material = new MeshBasicMaterial({ color: color });
    material.depthTest = false;
    this.linearVectorHelper.renderOrder = 9999;
    this.linearVectorHelper.line.material = material;
    this.linearVectorHelper.cone.material = material;
    this.scene.add(this.linearVectorHelper);
  }

  private updateVectorHelper() {
    const direction = this.object.getVelocity().normalize();
    const velocityLength = this.object.getVelocity().length();
    const objPosition = this.object.getPosition();
    this.linearVectorHelper!.setLength(
      velocityLength + this.LinearVelocityVector!.minLength
    );
    this.linearVectorHelper!.setDirection(direction);
    this.linearVectorHelper!.position.copy(objPosition);
  }

  private destroyVectorHelper() {
    this.scene.remove(this.linearVectorHelper!);
    this.linearVectorHelper = undefined;
  }

  private drawBoxHelper() {
    const boxHelper = new Box3Helper(this.object.aabb, this.showAABB!.color);
    this.AABBHelper = boxHelper;
    this.scene.add(this.AABBHelper);
  }

  private destroyBoxHelper() {
    this.scene.remove(this.AABBHelper!);
    this.AABBHelper = undefined;
  }

  update() {
    if (this.scene === null) {
      this.scene = this.object.mesh.parent as Scene;
    } else {
      if (this.LinearVelocityVector) {
        if (!this.linearVectorHelper) this.drawVectorHelper();
        this.updateVectorHelper();
      } else {
        if (this.linearVectorHelper) {
          this.destroyVectorHelper();
        }
      }
    }

    if (this.showAABB) {
      if (!this.AABBHelper) this.drawBoxHelper();
    } else {
      if (this.AABBHelper) this.destroyBoxHelper();
    }
  }
}
export default Debug;
