import { Matrix3, Vector3 } from "three";
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

  getTangentialCollisionArm = (
    massCenter: Vector3,
    relativeVelocity: Vector3
  ) =>
    this.getCollisionArm(massCenter).cross(this.getTangent(relativeVelocity));

  getTangent = (relativeVelocity: Vector3) => {
    const velocityAlongNormal = relativeVelocity.dot(this.normal);
    const velocityNormalComponent = this.normal
      .clone()
      .multiplyScalar(velocityAlongNormal);
    return relativeVelocity.clone().sub(velocityNormalComponent).normalize();
  };

  getVelocityAtPoint(object: RigidBody) {
    const omega = object.getAngularVelocity(new Vector3());
    const r = this.getCollisionArm(object.getPosition(new Vector3()));
    return object.getVelocity(new Vector3()).add(omega.cross(r));
  }

  getRelativeVelocity = () =>
    this.getVelocityAtPoint(this.obj_A).sub(
      this.getVelocityAtPoint(this.obj_B)
    );

  getRelativeVelocityAlongTangent(relativeVelocity: Vector3) {
    return relativeVelocity.dot(this.getTangent(relativeVelocity));
  }
  getRotationalImpulse(obj: RigidBody) {
    if (obj.isStatic) return new Vector3();
    const r = this.getCollisionArm(obj.getPosition(new Vector3()));
    const invertInertia = obj.getInvertedInertia(new Matrix3());
    return new Vector3()
      .crossVectors(r, this.getNormal())
      .applyMatrix3(invertInertia)
      .cross(r);
  }

  getTangentialInertialComponent(tangentialArm: Vector3, obj: RigidBody) {
    const invertInertia = obj.getInvertedInertia(new Matrix3());
    return tangentialArm.applyMatrix3(invertInertia).dot(tangentialArm);
  }

  getInvertMass(obj: RigidBody) {
    return obj.isStatic ? 0 : 1 / obj.mass;
  }

  getImpulse_Denominator() {
    const rotA = this.getRotationalImpulse(this.obj_A);
    const rotB = this.getRotationalImpulse(this.obj_B);

    const invertMassA = this.getInvertMass(this.obj_A);
    const invertMassB = this.getInvertMass(this.obj_B);
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

  getFrictionImpulse = () => {
    const invertMassA = this.getInvertMass(this.obj_A);
    const invertMassB = this.getInvertMass(this.obj_B);
    const relativeVelocity = this.getRelativeVelocity();
    const TangentialArmA = this.getTangentialCollisionArm(
      this.obj_A.getPosition(new Vector3()),
      relativeVelocity
    );
    const TangentialArmB = this.getTangentialCollisionArm(
      this.obj_B.getPosition(new Vector3()),
      relativeVelocity
    );
    const angularComponent =
      this.getTangentialInertialComponent(TangentialArmA, this.obj_A) +
      this.getTangentialInertialComponent(TangentialArmB, this.obj_B);
    return (
      -this.getRelativeVelocityAlongTangent(relativeVelocity) /
      (invertMassA + invertMassB + angularComponent)
    );
  };

  applyLinearVelocity(object: RigidBody, j: number) {
    const invertMass = this.getInvertMass(object);
    object.setVelocity((oldV) =>
      oldV.add(this.getNormal().multiplyScalar(j * invertMass))
    );
  }

  applyAngularVelocity(object: RigidBody, j: number) {
    const invertInertia = object.getInvertedInertia(new Matrix3());
    const r = this.getCollisionArm(object.getPosition(new Vector3()));
    object.setAngularVelocity((oldV) =>
      oldV.add(
        new Vector3()
          .crossVectors(r, this.getNormal().multiplyScalar(j))
          .applyMatrix3(invertInertia)
      )
    );
  }
  applyFriction(object: RigidBody, friction: number, jT: number, j: number) {
    const tangent = this.getTangent(this.getRelativeVelocity());
    const impulseMagnitude = Math.min(
      Math.max(jT, -friction * j),
      friction * j
    );
    const impulse = tangent.clone().multiplyScalar(impulseMagnitude);
    const invertMass = this.getInvertMass(object);
    const invertInertia = object.getInvertedInertia(new Matrix3());
    const r = this.getCollisionArm(object.getPosition(new Vector3()));
    object.setVelocity((oldV) =>
      oldV.add(impulse.clone().multiplyScalar(invertMass))
    );
    object.setAngularVelocity((oldV) =>
      oldV.add(
        new Vector3().crossVectors(r, impulse).applyMatrix3(invertInertia)
      )
    );
  }
}
export default CollisionInfo;
