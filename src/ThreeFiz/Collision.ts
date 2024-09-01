import { Vector3 } from "three";
import RigidBody from "./RigidBody";

class CollisionInfo {
  obj_A: RigidBody;
  obj_B: RigidBody;
  private point: Vector3;
  private normal: Vector3;
  private depth: number;
  constructor(
    obj_A: RigidBody,
    obj_B: RigidBody,
    point: Vector3,
    normal: Vector3,
    depth: number
  ) {
    this.obj_A = obj_A;
    this.obj_B = obj_B;
    this.point = point;
    this.normal = normal;
    this.depth = depth;
  }

  getPoint = () => this.point.clone();

  getNormal = () => this.normal.clone();

  getDepth = () => this.depth;

  getCollisionArm = (massCenter: Vector3) => this.point.clone().sub(massCenter);

  getVelocityAtPoint(object: RigidBody) {
    const omega = object.getAngularVelocity();
    const r = this.getCollisionArm(object.getPosition());
    return object.getVelocity().add(omega.cross(r));
  }

  getRelativeVelocity = () =>
    this.getVelocityAtPoint(this.obj_A).sub(
      this.getVelocityAtPoint(this.obj_B)
    );

  getRotationalImpulse(obj: RigidBody) {
    const r = this.getCollisionArm(obj.getPosition());
    const invertInertia = obj.getInertiaTensor().invert();
    return new Vector3()
      .crossVectors(r, this.getNormal())
      .applyMatrix3(invertInertia)
      .cross(r);
  }

  getImpulse_Denominator() {
    const rotA = this.getRotationalImpulse(this.obj_A);
    const rotB = this.getRotationalImpulse(this.obj_B);

    const invertMassA = 1 / this.obj_A.mass;
    const invertMassB = 1 / this.obj_A.mass;
    return (
      invertMassA +
      invertMassB +
      this.getNormal().dot(rotA) +
      this.getNormal().dot(rotB)
    );
  }

  getImpulse_Numerator = () =>
    -(1 + (this.obj_A.restitution + this.obj_B.restitution) / 2) *
    this.getRelativeVelocity().dot(this.getNormal());

  getImpulse = () =>
    this.getImpulse_Numerator() / this.getImpulse_Denominator();

  applyLinearVelocity(object: RigidBody, j: number) {
    const invertMass = 1 / object.mass;
    object.setVelocity((oldV) =>
      oldV.add(this.getNormal().multiplyScalar(j * invertMass))
    );
  }

  applyAngularVelocity(object: RigidBody, j: number) {
    const invertInertia = object.getInertiaTensor().invert();
    const r = this.getCollisionArm(object.getPosition());
    object.setAngularVelocity((oldV) =>
      oldV.add(
        new Vector3()
          .crossVectors(r, this.getNormal().multiplyScalar(j))
          .applyMatrix3(invertInertia)
      )
    );
  }
}
export default CollisionInfo;
