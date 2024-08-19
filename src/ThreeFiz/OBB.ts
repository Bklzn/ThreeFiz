import {
  ArrowHelper,
  Color,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  Plane,
  Ray,
  Scene,
  Vector3,
} from "three";
import { OBB } from "three/addons/math/OBB.js";
import { randInt } from "three/src/math/MathUtils.js";
class OBBs extends OBB {
  collisonVertices: Vector3[];
  collision: {
    point: Vector3 | undefined;
    depth: number | undefined;
    normal: Vector3 | undefined;
  };
  scene: Scene;
  constructor() {
    super();
    this.collisonVertices = [];
    this.collision = {
      point: undefined,
      depth: undefined,
      normal: undefined,
    };
    this.scene = new Scene();
  }
  getCollisionPoint(obb: OBBs, scene: Scene) {
    this.scene = scene;
    this.collisonVertices = [] as Vector3[];
    obb.getVertices().map((vertex) => {
      if (this.containsPoint(vertex)) {
        obb.collisonVertices.push(vertex);
      }
    });
    this.getVertices().map((vertex) => {
      if (obb.containsPoint(vertex)) {
        this.collisonVertices.push(vertex);
      }
    });
    switch (this.collisonVertices.length) {
      case 1:
        this.collision.point = this.collisonVertices[0];
        this.computeCollisionNormal(obb);
        this.computeCollisionDepth(obb);
        break;
      case 2:
        // point between the two points in half distance
        this.collision.point = new Vector3()
          .addVectors(this.collisonVertices[0], this.collisonVertices[1])
          .multiplyScalar(0.5);
        this.computeCollisionNormal(obb);
        this.computeCollisionDepth(obb);
        break;
      case 3:
      case 4:
        const v1 = new Vector3();
        const v2 = new Vector3();
        const a = this.collisonVertices[0];
        const b = this.collisonVertices[1];
        const c = this.collisonVertices[2];
        const l1 = this.collisonVertices[0].distanceTo(
          this.collisonVertices[1]
        );
        const l2 = this.collisonVertices[0].distanceTo(
          this.collisonVertices[2]
        );
        const l3 = this.collisonVertices[1].distanceTo(
          this.collisonVertices[2]
        );
        if (Math.max(l1, l2, l3) === l1) {
          v1.copy(a);
          v2.copy(b);
        } else if (Math.max(l1, l2, l3) === l2) {
          v1.copy(a);
          v2.copy(c);
        } else {
          v1.copy(b);
          v2.copy(c);
        }
        this.collision.point = new Vector3()
          .addVectors(v1, v2)
          .multiplyScalar(0.5);
        this.computeCollisionNormal(obb);
        this.computeCollisionDepth(obb);
        break;
      default:
        console.log("simple calculations of collision");
        this.computeEdgeCollisionPoint(obb);
        this.computeEdgeCollisionNormal(obb);
        this.computeCollisionDepth(obb);
        break;
    }
    return this.collision;
  }
  computeEdgeCollisionPoint(obb: OBBs) {
    const firstPoint = new Vector3();
    const secondPoint = new Vector3();
    obb.getEdges().map((edge) => {
      if (
        this.intersectRay(edge.ray, firstPoint) &&
        edge.ray.origin.distanceTo(firstPoint) <= edge.length
      ) {
        const reversedRay = new Ray(
          edge.ray.origin
            .clone()
            .addScaledVector(edge.ray.direction, edge.length),
          edge.ray.direction.clone().negate()
        );
        this.intersectRay(reversedRay, secondPoint);
        const point = new Vector3()
          .addVectors(firstPoint, secondPoint)
          .multiplyScalar(0.5);
        this.collision.point = point;
      }
    });
  }
  computeEdgeCollisionNormal(obb: OBBs) {
    const collsionPoint = this.collision.point!;
    const closestFaces = obb
      .getFaces()
      .sort(
        (a, b) =>
          b.distanceToPoint(collsionPoint) - a.distanceToPoint(collsionPoint)
      );
    const edgeNormal = new Vector3()
      .addVectors(closestFaces[0].normal, closestFaces[1].normal)
      .normalize();
    this.collision.normal = edgeNormal;
  }
  computeCollisionNormal(obb: OBBs) {
    const collisionPoint = this.collision.point!;
    const result = new Vector3();
    const rayDir = new Vector3()
      .subVectors(collisionPoint, obb.center)
      .normalize();
    const ray = new Ray(obb.center, rayDir);
    let resultDistance = Infinity;
    obb.getFaces().forEach((face) => {
      const pointOnPlane = collisionPoint.clone();
      if (
        ray.intersectPlane(face, pointOnPlane) &&
        pointOnPlane.distanceTo(obb.center) < resultDistance
      ) {
        resultDistance = pointOnPlane.distanceTo(obb.center);
        result.copy(face.normal);
      }
    });
    if (this === obb) result.negate();
    this.collision.normal = new Vector3().copy(result);
  }
  computeCollisionDepth(obb: OBBs) {
    const collisionPoint = new Vector3().copy(this.collision.point!);
    const normal = new Vector3().copy(this.collision.normal!);
    const pointAboveCollision = new Vector3()
      .copy(collisionPoint)
      .add(
        normal.clone().multiplyScalar(collisionPoint.distanceTo(this.center))
      );
    const pointBelowCollision = new Vector3()
      .copy(collisionPoint)
      .add(
        normal
          .clone()
          .negate()
          .multiplyScalar(collisionPoint.distanceTo(this.center))
      );
    const rayToObb = new Ray(pointAboveCollision, normal.clone().negate());
    const rayToThis = new Ray(pointBelowCollision, normal.clone());
    const intersectPoint1 = collisionPoint.clone();
    const intersectPoint2 = collisionPoint.clone();
    obb.intersectRay(rayToObb, intersectPoint1);
    this.intersectRay(rayToThis, intersectPoint2);
    const distance = Math.abs(intersectPoint1.distanceTo(intersectPoint2));
    this.collision.depth = distance;
  }
  getVertices() {
    const vertices = [
      new Vector3(-this.halfSize.x, -this.halfSize.y, -this.halfSize.z),
      new Vector3(-this.halfSize.x, this.halfSize.y, -this.halfSize.z),
      new Vector3(this.halfSize.x, this.halfSize.y, -this.halfSize.z),
      new Vector3(this.halfSize.x, -this.halfSize.y, -this.halfSize.z),
      new Vector3(-this.halfSize.x, -this.halfSize.y, this.halfSize.z),
      new Vector3(-this.halfSize.x, this.halfSize.y, this.halfSize.z),
      new Vector3(this.halfSize.x, this.halfSize.y, this.halfSize.z),
      new Vector3(this.halfSize.x, -this.halfSize.y, this.halfSize.z),
    ];
    for (let i = 0; i < vertices.length; i++) {
      vertices[i].applyMatrix3(this.rotation).add(this.center);
    }
    return vertices;
  }
  getEdges(): { ray: Ray; length: number }[] {
    const v = this.getVertices();
    // each group is set of source vertex and directions for rays to define edges
    // groups are determined by the order of the vertices in getVertices()
    const vGroups = [
      { src: v[1], dir: [v[0], v[2], v[5]] },
      { src: v[3], dir: [v[0], v[2], v[7]] },
      { src: v[4], dir: [v[0], v[5], v[7]] },
      { src: v[6], dir: [v[2], v[5], v[7]] },
    ];
    const rays: { ray: Ray; length: number }[] = [];
    vGroups.forEach((group) => {
      group.dir.map((dir) => {
        rays.push({
          ray: new Ray(group.src, dir.clone().sub(group.src).normalize()),
          length: group.src.distanceTo(dir),
        });
      });
    });
    return rays;
  }
  getVerticesNeighbors() {
    const vertices = this.getVertices();
    const neighbors = [
      [vertices[1], vertices[3], vertices[4]], // vertex 0
      [vertices[0], vertices[2], vertices[5]], // vertex 1
      [vertices[1], vertices[3], vertices[6]], // vertex 2
      [vertices[0], vertices[2], vertices[7]], // vertex 3
      [vertices[0], vertices[5], vertices[7]], // vertex 4
      [vertices[1], vertices[4], vertices[6]], // vertex 5
      [vertices[2], vertices[5], vertices[7]], // vertex 6
      [vertices[3], vertices[4], vertices[6]], // vertex 7
    ];
    return neighbors;
  }
  getNormals() {
    const normals = [
      new Vector3(-1, 0, 0),
      new Vector3(1, 0, 0),
      new Vector3(0, -1, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 0, -1),
      new Vector3(0, 0, 1),
    ];
    normals.forEach((normal) => normal.applyMatrix3(this.rotation));
    return normals;
  }
  getFaces() {
    const normals = this.getNormals();
    return normals.map((normal) =>
      new Plane().setFromNormalAndCoplanarPoint(
        normal,
        this.center.clone().add(this.halfSize.clone().multiply(normal))
      )
    );
  }
  getNormalsHelper(scene: Scene) {
    const color = new Color(`hsl(${randInt(0, 360)}, 100%, 70%)`);
    const normals = this.getNormals();
    normals.forEach((normal) => {
      let normalHelper = new ArrowHelper(
        normal,
        new Vector3().add(
          this.halfSize.clone().multiply(normal || new Vector3())
        ),
        10,
        color
      );
      normalHelper.position.add(this.center);
      scene.add(normalHelper);
    });
  }
  getCollsionHelper(scene: Scene) {
    const color = new Color(`hsl(${randInt(0, 360)}, 100%, 90%)`);
    let normalHelper = new ArrowHelper(
      this.collision.normal,
      this.collision.point,
      10,
      color
    );
    const point = new Mesh(
      new OctahedronGeometry(0.5, 0),
      new MeshBasicMaterial({ color, wireframe: true })
    );
    point.position.add(this.collision.point!);
    scene.add(point, normalHelper);
  }
  getArrowHelper(scene: Scene, direction: Vector3, origin: Vector3) {
    {
      const color = new Color(`hsl(${randInt(0, 360)}, 100%, 70%)`);
      scene.add(new ArrowHelper(direction, origin, 10, color));
    }
  }
  getPointHelper(scene: Scene, point: Vector3) {
    {
      const color = new Color(`hsl(${randInt(0, 360)}, 100%, 70%)`);
      const mesh = new Mesh(
        new OctahedronGeometry(0.5, 0),
        new MeshBasicMaterial({ color, wireframe: true })
      );
      scene.add(mesh);
      mesh.position.copy(point);
    }
  }
}
export { OBBs };
