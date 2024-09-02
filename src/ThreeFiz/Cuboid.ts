import { BoxGeometry, Vector3 } from "three";
import { OBBs } from "./OBB";
import RigidBody, { RigidBodyProps } from "./RigidBody";
import Collision from "./Collision";

class Cuboid extends RigidBody {
  readonly ShapeType = 1;
  collider: OBBs;
  constructor(params: Partial<RigidBodyProps>) {
    super(params);
    const { width, height, depth } = (this.mesh.geometry as BoxGeometry)
      .parameters;
    this.collider = new OBBs(this);
    this.collider.halfSize = new Vector3(width, height, depth).multiplyScalar(
      0.5
    );
    this.inertiaTensor.set(
      (this.mass / 12) * (height ** 2 + depth ** 2),
      0,
      0,
      0,
      (this.mass / 12) * (width ** 2 + height ** 2),
      0,
      0,
      0,
      (this.mass / 12) * (width ** 2 + depth ** 2)
    );
  }
  intersects(object: Cuboid) {
    this.updateCollider();
    return this.boxBoxIntersect(object);
  }
  boxBoxIntersect = (object: Cuboid) =>
    this.collider.intersectsOBB(object.collider);

  resolveIntersection(object: Cuboid, normal: Vector3, depth: number) {
    let thisVl = this.velocity.length();
    let objectVl = object.velocity.length();
    if (thisVl + objectVl === 0) {
      thisVl = 1;
      objectVl = 1;
    }
    const thisdisplacement = (thisVl / (thisVl + objectVl)) * depth;
    const objectdisplacement = (objectVl / (thisVl + objectVl)) * depth;
    this.position.addScaledVector(normal, thisdisplacement);
    object.position.addScaledVector(normal, -objectdisplacement);
  }
  resolveCollision(object: Cuboid) {
    const c = this.collider.getCollision(object.collider);
    if (c.depth > 0)
      this.oldResolveFunc(
        object,
        new Collision(this, object, c.point, c.normal, c.depth)
      );
  }
  oldResolveFunc(object: Cuboid, collision: Collision) {
    this.resolveIntersection(
      object,
      collision.getNormal(),
      collision.getDepth()
    );

    const j = collision.getImpulse();

    if (!this.isStatic) {
      collision.applyLinearVelocity(this, j);
      collision.applyAngularVelocity(this, j);
    }
    if (!object.isStatic) {
      collision.applyLinearVelocity(object, -j);
      collision.applyAngularVelocity(object, -j);
    }
  }
  updateCollider() {
    this.collider.rotation.identity();
    this.collider.applyMatrix4(this.mesh.matrixWorld);
    this.collider.center.copy(this.position);
  }
}
export default Cuboid;
