import { BoxGeometry, Vector3 } from "three";
import { OBBs } from "./OBB";
import RigidBody from "./RigidBody";

class Cuboid extends RigidBody {
  readonly ShapeType = 1;
  collider: OBBs;
  constructor(params: Partial<RigidBody>) {
    super(params);
    const { width, height, depth } = (this.mesh.geometry as BoxGeometry)
      .parameters;
    this.collider = new OBBs();
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
  boxBoxIntersect(object: Cuboid) {
    return this.collider.intersectsOBB(object.collider);
  }
  resolveIntersection(object: Cuboid, normal: Vector3, depth: number) {
    let thisVl = this.velocity.length();
    let objectVl = object.velocity.length();
    if (thisVl + objectVl === 0) {
      thisVl = 1;
      objectVl = 1;
    }
    const thisdisplacement = (thisVl / (thisVl + objectVl)) * depth;
    const objectdisplacement = (objectVl / (thisVl + objectVl)) * depth;
    // console.log(normal);
    // console.log(depth);
    // console.log(thisdisplacement, objectdisplacement);
    // console.log(JSON.stringify(this.position));
    // console.log(JSON.stringify(object.position));
    this.position.addScaledVector(normal, thisdisplacement + thisdisplacement);
    object.position.addScaledVector(
      normal,
      -objectdisplacement + objectdisplacement
    );
    // console.log(JSON.stringify(this.position));
    // console.log(JSON.stringify(object.position));
  }
  resolveCollision(
    object: Cuboid,
    collision: { point: Vector3; normal: Vector3; depth: number }
  ) {
    this.resolveIntersection(object, collision.normal, collision.depth);

    const r1 = collision.point.clone().sub(this.position);
    const r2 = collision.point.clone().sub(object.position);
    const n = collision.normal.clone();

    const v1 = this.velocity.clone();
    const v2 = object.velocity.clone();
    const omega1 = this.angularVelocity.clone();
    const omega2 = object.angularVelocity.clone();

    const v_rel = v1
      .clone()
      .add(new Vector3().crossVectors(omega1, r1))
      .sub(v2.clone().add(new Vector3().crossVectors(omega2, r2)));

    const v_rel_dot_n = v_rel.dot(n);

    const invMass1 = 1 / this.mass;
    const invMass2 = 1 / object.mass;
    const invInertia1 = this.inertiaTensor.clone().invert();
    const invInertia2 = object.inertiaTensor.clone().invert();

    const rot1 = new Vector3()
      .crossVectors(r1, n)
      .applyMatrix3(invInertia1)
      .cross(r1);
    const rot2 = new Vector3()
      .crossVectors(r2, n)
      .applyMatrix3(invInertia2)
      .cross(r2);
    const j_denom =
      invMass1 + invMass2 + n.clone().dot(rot1) + n.clone().dot(rot2);

    const j =
      (-(1 + (this.restitution + object.restitution) / 2) * v_rel_dot_n) /
      j_denom;

    if (!this.isStatic)
      this.velocity.add(n.clone().multiplyScalar(j * invMass1));
    if (!object.isStatic)
      object.velocity.add(n.clone().multiplyScalar(-j * invMass2));

    this.angularVelocity.add(
      new Vector3()
        .crossVectors(r1, n.clone().multiplyScalar(j))
        .applyMatrix3(invInertia1)
    );
    object.angularVelocity.add(
      new Vector3()
        .crossVectors(r2, n.clone().multiplyScalar(-j))
        .applyMatrix3(invInertia2)
    );
  }
  updateCollider() {
    this.collider.rotation.identity();
    this.collider.applyMatrix4(this.mesh.matrixWorld);
    this.collider.center.copy(this.position);
  }
}
export default Cuboid;
