import { ArrowHelper, Color, MeshBasicMaterial, Vector3 } from "three";
import RigidBody from "./RigidBody";

class Debug {
  LinearVelocityVector:
    | {
        color: Color;
        minLength: number;
      }
    | undefined;
  private object: RigidBody;
  private linearVectorHelper: ArrowHelper | undefined;
  constructor(object: RigidBody) {
    this.object = object;
    this.LinearVelocityVector;
    this.linearVectorHelper;
  }
  private drawVectorHelper() {
    const scene = this.object.mesh.parent;
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
    scene?.add(this.linearVectorHelper);
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
    const scene = this.object.mesh.parent;
    scene?.remove(this.linearVectorHelper!);
    this.linearVectorHelper = undefined;
  }
  update() {
    if (this.LinearVelocityVector) {
      if (!this.linearVectorHelper) this.drawVectorHelper();
      this.updateVectorHelper();
    } else {
      if (this.linearVectorHelper) {
        this.destroyVectorHelper();
      }
    }
  }
}
export default Debug;
