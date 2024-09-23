import { Box3, Matrix3, Mesh, Quaternion, Vector3 } from "three";
import Debug from "./Debug";
import * as collisionInfo from "./Collision";

const v = new Vector3();
const q = new Quaternion();

type RigidBodyProps = {
  mesh: Mesh;
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  angularVelocity: Vector3;
  invertedInertia: Matrix3;
  density: number;
  mass: number;
  restitution: number;
  isStatic: boolean;
  debug: Debug;
  friction: number;
  aabb: Box3;
};
abstract class RigidBody {
  mesh: Mesh;
  protected position: Vector3;
  protected velocity: Vector3;
  protected rotation: Quaternion;
  protected angularVelocity: Vector3;
  protected invertedInertia: Matrix3;
  density: number;
  mass: number;
  restitution: number;
  isStatic: boolean;
  debug: Debug;
  friction: number;
  aabb: Box3;

  constructor({
    mesh = new Mesh(),
    position = new Vector3(),
    rotation = new Quaternion(),
    velocity = new Vector3(),
    angularVelocity = new Vector3(),
    invertedInertia = new Matrix3(),
    density = 1,
    mass = 1,
    restitution = 0.5,
    isStatic = false,
    friction = 0.5,
  }: Partial<RigidBodyProps> = {}) {
    this.mesh = mesh;
    this.mesh.matrixAutoUpdate = false;
    this.position = position;
    this.rotation = rotation;
    this.velocity = velocity;
    this.angularVelocity = angularVelocity;
    this.invertedInertia = invertedInertia;
    this.mass = mass;
    this.isStatic = isStatic;
    if (density < 0) {
      console.warn("Density cannot be less than 0");
    }
    this.density = Math.max(0, density);
    if (restitution > 1 || restitution < 0) {
      console.warn("Restitution cannot be greater than 1 or less than 0");
    }
    this.restitution = Math.min(Math.max(restitution, 0), 1);
    if (friction > 1 || friction < 0) {
      console.warn("Friction cannot be greater than 1 or less than 0");
    }
    this.friction = Math.min(Math.max(friction, 0), 1);
    this.debug = new Debug(this);
    this.aabb = new Box3();
    this.updateAABB();
  }

  abstract intersects(object: RigidBody): boolean;
  abstract updateCollider(): void;
  abstract getCollision(object: RigidBody): {
    point: Vector3;
    normal: Vector3;
    depth: number;
  };

  updatePosition(dT: number) {
    this.position.add(this.velocity.clone().multiplyScalar(dT));
    this.mesh.position.copy(this.position);
  }

  updateRotation(dT: number) {
    let angle = this.angularVelocity.length() * dT;
    let axis = this.angularVelocity.clone().normalize();
    let q = new Quaternion();
    q.setFromAxisAngle(axis, angle);
    this.rotation.multiplyQuaternions(q, this.rotation);
    this.mesh.quaternion.copy(this.rotation);
  }

  updateAABB() {
    this.aabb.setFromObject(this.mesh, true);
  }

  getVelocity = (target: Vector3) => target.copy(this.velocity);

  setVelocity(fn: (vector: Vector3) => Vector3) {
    this.velocity.copy(fn(this.getVelocity(v)));
  }

  getAngularVelocity = (target: Vector3) => target.copy(this.angularVelocity);

  setAngularVelocity(fn: (vector: Vector3) => Vector3) {
    this.angularVelocity.copy(fn(this.getAngularVelocity(v)));
  }

  getPosition = (target: Vector3) => target.copy(this.position);

  setPosition(fn: (p: Vector3) => Vector3) {
    this.position.copy(fn(this.getPosition(v)));
  }

  getRotation = (target: Quaternion) => target.copy(this.rotation);

  setRotation(fn: (r: Quaternion) => Quaternion) {
    this.rotation.copy(fn(this.getRotation(q)));
  }

  getInvertedInertia = (target: Matrix3) => target.copy(this.invertedInertia);

  resolveIntersection(object: RigidBody, normal: Vector3, depth: number) {
    const thisState = this.isStatic ? 0 : 1;
    const objectState = object.isStatic ? 0 : 1;
    const thisOffset = (thisState / (thisState + objectState)) * depth;
    const objectOffset = (objectState / (thisState + objectState)) * depth;
    this.position.addScaledVector(normal, thisOffset);
    object.position.addScaledVector(normal, -objectOffset);
  }

  resolveCollision(object: RigidBody) {
    const data = this.getCollision(object);
    const { point, normal, depth } = data;

    // for some reason the collision data is not detected correctly sometimes
    if (
      Object.values(point).some((v: number) => isNaN(v)) ||
      Object.values(normal).some((v: number) => isNaN(v)) ||
      depth === Infinity ||
      isNaN(depth)
    )
      return;
    if (data.depth > 1e-10) {
      collisionInfo.update(this, object, point, normal);
      this.resolveIntersection(object, normal, depth);

      const j = collisionInfo.getImpulse();

      if (!this.isStatic) {
        collisionInfo.applyLinearVelocity(this, j);
        collisionInfo.applyAngularVelocity(this, j);
      }
      if (!object.isStatic) {
        collisionInfo.applyLinearVelocity(object, -j);
        collisionInfo.applyAngularVelocity(object, -j);
      }

      const jT = collisionInfo.getFrictionImpulse();
      const relativeFraction = (this.friction + object.friction) * 0.5;

      if (!this.isStatic)
        collisionInfo.applyFriction(this, relativeFraction, jT, j);
      if (!object.isStatic)
        collisionInfo.applyFriction(object, -relativeFraction, -jT, -j);
    }
  }
}

export default RigidBody;
export type { RigidBodyProps };
