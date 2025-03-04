import { Sphere as SphereT, SphereGeometry, Vector3, Mesh } from "three";
import RigidBody, { RigidBodyProps } from "./RigidBody";
import Cuboid from "./Cuboid";

class Sphere extends RigidBody {
  readonly ShapeType = 0;
  readonly meshGeometry: SphereGeometry;
  collider: SphereT;
  helper: Mesh | null;
  constructor(params: Partial<RigidBodyProps>) {
    super(params);
    this.meshGeometry = this.mesh.geometry as SphereGeometry;
    const { radius } = this.meshGeometry.parameters;
    this.collider = new SphereT(this.position.clone(), radius);
    this.helper = null;
    this.invertedInertia
      .set(
        0.4 * this.mass * radius ** 2,
        0,
        0,
        0,
        0.4 * this.mass * radius ** 2,
        0,
        0,
        0,
        0.4 * this.mass * radius ** 2
      )
      .invert();
  }

  intersects(object: RigidBody) {
    if (object instanceof Sphere) return this.intersectsSphere(object);
    if (object instanceof Cuboid) return object.sphereBoxIntersect(this);
    return false;
  }

  getCollision(object: Cuboid | Sphere): {
    point: Vector3;
    normal: Vector3;
    depth: number;
  } {
    if (object instanceof Cuboid) {
      const collision = object.getCollision(this);
      collision.normal.negate();
      return collision;
    }
    const point = new Vector3();
    this.collider.clampPoint(object.collider.center, point);
    const normal = this.collider.center.clone().sub(point).normalize();
    const distance = this.position.distanceTo(object.position);
    const depth = Math.abs(
      distance - object.collider.radius - this.collider.radius
    );
    return { point, normal, depth };
  }

  intersectsSphere(object: Sphere) {
    const distance = this.collider.center.distanceTo(object.collider.center);
    return distance < object.collider.radius + this.collider.radius;
  }

  updateAABB() {
    this.aabb.min.set(
      this.position.x - this.meshGeometry.parameters.radius,
      this.position.y - this.meshGeometry.parameters.radius,
      this.position.z - this.meshGeometry.parameters.radius
    );

    this.aabb.max.set(
      this.position.x + this.meshGeometry.parameters.radius,
      this.position.y + this.meshGeometry.parameters.radius,
      this.position.z + this.meshGeometry.parameters.radius
    );
  }

  updateCollider() {
    this.collider.applyMatrix4(this.mesh.matrixWorld);
    this.collider.center.copy(this.position);
  }
}
export default Sphere;
