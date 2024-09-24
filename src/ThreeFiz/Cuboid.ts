import { BoxGeometry, Vector3 } from "three";
import { OBBs } from "./OBB";
import RigidBody, { RigidBodyProps } from "./RigidBody";
import Sphere from "./Sphere";

class Cuboid extends RigidBody {
  readonly ShapeType = 1;
  collider: OBBs;
  constructor(params: Partial<RigidBodyProps>) {
    super(params);
    const { width, height, depth } = (this.mesh.geometry as BoxGeometry)
      .parameters;
    const halfSize = new Vector3(width, height, depth).multiplyScalar(0.5);
    this.collider = new OBBs(this, halfSize);
    this.invertedInertia
      .set(
        (this.mass / 12) * (height ** 2 + depth ** 2),
        0,
        0,
        0,
        (this.mass / 12) * (width ** 2 + height ** 2),
        0,
        0,
        0,
        (this.mass / 12) * (width ** 2 + depth ** 2)
      )
      .invert();
  }

  intersects(object: RigidBody) {
    if (object instanceof Cuboid) return this.boxBoxIntersect(object);
    if (object instanceof Sphere) return this.sphereBoxIntersect(object);
    return false;
  }

  getCollision(object: Cuboid | Sphere): {
    point: Vector3;
    normal: Vector3;
    depth: number;
  } {
    return this.collider.getCollision(object.collider);
  }

  boxBoxIntersect = (object: Cuboid) =>
    this.collider.intersectsOBB(object.collider);

  sphereBoxIntersect = (object: Sphere) =>
    this.collider.intersectsSphere(object.collider);

  updateCollider() {
    if (
      !this.prevPosition.equals(this.position) ||
      !this.prevRotation.equals(this.rotation)
    ) {
      this.collider.rotation.identity();
      this.collider.applyMatrix4(this.mesh.matrixWorld);
      this.collider.center.copy(this.position);
    }
  }
}
export default Cuboid;
