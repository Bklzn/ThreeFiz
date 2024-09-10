import { Sphere as SphereT, SphereGeometry, Vector3, Mesh } from "three";
import RigidBody, { RigidBodyProps } from "./RigidBody";
import Collision from "./Collision";

class Sphere extends RigidBody {
  readonly ShapeType = 0;
  collider: SphereT;
  helper: Mesh | null;
  constructor(params: Partial<RigidBodyProps>) {
    super(params);
    const meshGeometry = this.mesh.geometry as SphereGeometry;
    const { radius } = meshGeometry.parameters;
    this.collider = new SphereT(this.position.clone(), radius);
    this.helper = null;
    this.inertiaTensor.set(
      0.4 * this.mass * radius ** 2,
      0,
      0,
      0,
      0.4 * this.mass * radius ** 2,
      0,
      0,
      0,
      0.4 * this.mass * radius ** 2
    );
  }
  intersects(object: Sphere) {
    this.updateCollider();
    return this.intersectsSphere(object);
  }
  getCollision(object: Sphere): {
    point: Vector3;
    normal: Vector3;
    depth: number;
  } {
    const point = new Vector3();
    this.collider.clampPoint(object.collider.center, point);
    const normal = object.collider.center.clone().sub(point).normalize();
    const distance = this.position.distanceTo(object.position);
    const depth = Math.abs(
      distance - object.collider.radius - this.collider.radius
    );
    console.log(depth);
    return { point, normal, depth };
  }
  intersectsSphere(object: Sphere) {
    const distance = this.collider.center.distanceTo(object.collider.center);
    return distance < object.collider.radius + this.collider.radius;
  }
  resolveCollision(object: Sphere) {
    const c = this.getCollision(object);
    if (c.depth > 1e-10)
      this.oldResolveFunc(
        object,
        new Collision(this, object, c.point, c.normal, c.depth)
      );
  }
  oldResolveFunc(object: Sphere, collision: Collision) {
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
    this.collider.applyMatrix4(this.mesh.matrixWorld);
    this.collider.center.copy(this.position);
  }
}
export default Sphere;
