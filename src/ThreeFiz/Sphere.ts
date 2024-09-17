import { Sphere as SphereT, SphereGeometry, Vector3, Mesh } from "three";
import RigidBody, { RigidBodyProps } from "./RigidBody";
import Cuboid from "./Cuboid";

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

  updateCollider() {
    this.collider.applyMatrix4(this.mesh.matrixWorld);
    this.collider.center.copy(this.position);
  }
}
export default Sphere;
