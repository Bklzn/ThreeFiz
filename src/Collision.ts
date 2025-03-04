import { Matrix3, Vector3 } from "three";
import RigidBody from "./RigidBody";

const v1 = new Vector3();
const v2 = new Vector3();
const v3 = new Vector3();
const r1 = new Vector3();
const r2 = new Vector3();
const t1 = new Vector3();
const t2 = new Vector3();
const relativeVelocity = new Vector3();
const Point = new Vector3();
const Normal = new Vector3();
const Tangent = new Vector3();

class ObjectData {
  parent: RigidBody;
  linearVelocity: Vector3;
  angularVelocity: Vector3;
  invertedMass: number;
  invertedInerttia: Matrix3;
  massCenter: Vector3;
  collisionArm: Vector3;
  constructor() {
    this.parent = null!;
    this.linearVelocity = new Vector3();
    this.angularVelocity = new Vector3();
    this.invertedMass = 0;
    this.invertedInerttia = new Matrix3();
    this.massCenter = new Vector3();
    this.collisionArm = new Vector3();
  }

  set(object: RigidBody) {
    this.parent = object;
    object.getPosition(this.massCenter);
    object.getInvertedInertia(this.invertedInerttia);
    this.invertedMass = this.getInvertMass(object);
    this.update();
  }

  update() {
    this.parent.getVelocity(this.linearVelocity);
    this.parent.getAngularVelocity(this.angularVelocity);
    this.collisionArm.set(0, 0, 0);
    if (!this.parent.isStatic) this.getCollisionArm(Point, this.collisionArm);
  }

  getInvertMass(obj: RigidBody) {
    return obj.isStatic ? 0 : 1 / obj.mass;
  }

  getCollisionArm(point: Vector3, target: Vector3) {
    return target.copy(point).sub(this.massCenter);
  }
}

const thisObject = new ObjectData();
const otherObject = new ObjectData();

const update = (
  obj_A: RigidBody,
  obj_B: RigidBody,
  point: Vector3,
  normal: Vector3
) => {
  Point.copy(point);
  Normal.copy(normal);
  thisObject.set(obj_A);
  otherObject.set(obj_B);
};

const getVelocityAtPoint = (object: ObjectData, target: Vector3) => {
  const omega = object.angularVelocity;
  const r = object.collisionArm;
  const linear = object.linearVelocity;
  return target.copy(linear).add(v3.crossVectors(omega, r));
};

const setRelativeVelocity = () => {
  getVelocityAtPoint(thisObject, v1);
  getVelocityAtPoint(otherObject, v2);
  relativeVelocity.copy(v1).sub(v2);
};

//-----------------normal impulse equation--------------
const getRotationalImpulse = (obj: ObjectData, target: Vector3) => {
  if (obj.parent.isStatic) {
    target.set(0, 0, 0);
    return target;
  }
  const r = obj.collisionArm;
  const invertInertia = obj.invertedInerttia;
  return target.crossVectors(r, Normal).applyMatrix3(invertInertia).cross(r);
};

const getImpulse_Numerator = () =>
  -(1 + (thisObject.parent.restitution + otherObject.parent.restitution) / 2) *
  relativeVelocity.dot(Normal);

const getImpulse_Denominator = () => {
  getRotationalImpulse(thisObject, r1);
  getRotationalImpulse(otherObject, r2);

  return (
    thisObject.invertedMass +
    otherObject.invertedMass +
    Normal.dot(r1) +
    Normal.dot(r2)
  );
};

const getImpulse = () => {
  thisObject.update();
  otherObject.update();
  setRelativeVelocity();
  return getImpulse_Numerator() / getImpulse_Denominator();
};

//-----------------tangent impulse equation--------------
const setTangent = () => {
  v3.copy(Normal).multiplyScalar(relativeVelocity.dot(Normal));
  Tangent.copy(relativeVelocity).sub(v3);
  if (Tangent.lengthSq() > 1e-6) Tangent.normalize();
  else Tangent.set(0, 0, 0);
};

const getTangentialCollisionArm = (collisionArm: Vector3, target: Vector3) =>
  target.copy(collisionArm).cross(Tangent);

const getTangentialInertialComponent = (
  tangentialArm: Vector3,
  invInertia: Matrix3
) => {
  return tangentialArm.applyMatrix3(invInertia).dot(tangentialArm);
};

const getFrictionImpulse_Denominator = () => {
  getTangentialCollisionArm(thisObject.collisionArm, t1);
  getTangentialCollisionArm(otherObject.collisionArm, t2);
  return (
    thisObject.invertedMass +
    otherObject.invertedMass +
    getTangentialInertialComponent(t1, thisObject.invertedInerttia) +
    getTangentialInertialComponent(t2, otherObject.invertedInerttia)
  );
};

const getFrictionImpulse = () => {
  thisObject.update();
  otherObject.update();
  setRelativeVelocity();
  setTangent();
  return -relativeVelocity.dot(Tangent) / getFrictionImpulse_Denominator();
};

//-----------------impulse application--------------
const applyLinearVelocity = (obj: RigidBody, j: number) => {
  const object = obj === thisObject.parent ? thisObject : otherObject;
  const invertMass = object.invertedMass;
  v1.copy(Normal);
  object.parent.setVelocity((oldV) =>
    oldV.add(v1.multiplyScalar(j * invertMass))
  );
};

const applyAngularVelocity = (obj: RigidBody, j: number) => {
  const object = obj === thisObject.parent ? thisObject : otherObject;
  const invertInertia = object.invertedInerttia;
  const r = object.collisionArm;
  v1.copy(Normal);
  object.parent.setAngularVelocity((oldV) =>
    oldV.add(
      v2.crossVectors(r, v1.multiplyScalar(j)).applyMatrix3(invertInertia)
    )
  );
};

const applyFriction = (
  obj: RigidBody,
  friction: number,
  jT: number,
  j: number
) => {
  const object = obj === thisObject.parent ? thisObject : otherObject;
  const impulseMagnitude = Math.min(Math.max(jT, -friction * j), friction * j);
  v1.copy(Tangent);
  v1.multiplyScalar(impulseMagnitude);
  const invertMass = object.invertedMass;
  const invertInertia = object.invertedInerttia;
  const r = object.collisionArm;
  v2.copy(v1);
  object.parent.setVelocity((oldV) => oldV.add(v1.multiplyScalar(invertMass)));

  object.parent.setAngularVelocity((oldV) =>
    oldV.add(v3.crossVectors(r, v2).applyMatrix3(invertInertia))
  );
};

export {
  update,
  getImpulse,
  getFrictionImpulse,
  applyLinearVelocity,
  applyAngularVelocity,
  applyFriction,
};
