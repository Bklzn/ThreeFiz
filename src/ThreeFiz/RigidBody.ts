import { Box3, Matrix3, Mesh, Quaternion, Vector3 } from "three";
import Debug from "./Debug";
import CollisionInfo from "./Collision";

type RigidBodyProps = {
  mesh: Mesh;
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  angularVelocity: Vector3;
  inertiaTensor: Matrix3;
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
  protected inertiaTensor: Matrix3;
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
    inertiaTensor = new Matrix3(),
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
    this.inertiaTensor = inertiaTensor;
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

  getVelocity = () => this.velocity.clone();

  setVelocity(fn: (v: Vector3) => Vector3) {
    this.velocity = fn(this.getVelocity());
  }

  getAngularVelocity = () => this.angularVelocity.clone();

  setAngularVelocity(fn: (v: Vector3) => Vector3) {
    this.angularVelocity = fn(this.getAngularVelocity());
  }

  getPosition = () => this.position.clone();

  setPosition(fn: (p: Vector3) => Vector3) {
    this.position = fn(this.getPosition());
  }

  getRotation = () => this.rotation.clone();

  setRotation(fn: (r: Quaternion) => Quaternion) {
    this.rotation = fn(this.getRotation());
  }

  getInertiaTensor = () => this.inertiaTensor.clone();

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
      const collision = new CollisionInfo(
        this,
        object,
        data.point,
        data.normal,
        data.depth
      );
      this.resolveIntersection(
        object,
        collision.getNormal(),
        collision.getDepth()
      );

      const j = collision.getImpulse();
      const jT = collision.getFrictionImpulse();

      const relativeFraction = this.friction * object.friction * 0.5;
      if (!this.isStatic) {
        collision.applyLinearVelocity(this, j);
        collision.applyAngularVelocity(this, j);
        collision.applyFriction(this, relativeFraction, jT, j);
      }
      if (!object.isStatic) {
        collision.applyLinearVelocity(object, -j);
        collision.applyAngularVelocity(object, -j);
        collision.applyFriction(object, -relativeFraction, -jT, -j);
      }
    }
  }
}

export default RigidBody;
export type { RigidBodyProps };
