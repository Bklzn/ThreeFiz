import { Matrix3, Matrix4, Mesh, Quaternion, Vector3 } from "three";
class RigidBody {
  mesh: Mesh;
  position: Vector3;
  velocity: Vector3;
  rotation: Quaternion;
  angularVelocity: Vector3;
  inertiaTensor: Matrix3;
  density: number;
  mass: number;
  restitution: number;
  isStatic: boolean;
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
  }: Partial<RigidBody> = {}) {
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
}
export default RigidBody;
