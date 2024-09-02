import { Matrix3, Mesh, Quaternion, Vector3 } from "three";
import Debug from "./Debug";

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
};
class RigidBody {
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
    this.debug = new Debug(this);
  }

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
}
export default RigidBody;
export type { RigidBodyProps };
