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
  scene: Scene;
  constructor() {
    super();
    this.scene = new Scene();
  }
  getCollisionPoint(obb: OBBs, scene: Scene) {
    this.scene = scene;
    obb.scene = scene;
    const collisionVertices1: Vector3[] = [];
    const collisionVertices2: Vector3[] = [];
    this.getVertices().map((vertex) => {
      if (obb.containsPoint(vertex)) {
        collisionVertices1.push(vertex);
      }
    });
    obb.getVertices().map((vertex) => {
      if (this.containsPoint(vertex)) {
        collisionVertices2.push(vertex);
      }
    });
    let point: Vector3;
    let normal: Vector3;
    let depth: number;
    if (collisionVertices1.length) {
      switch (collisionVertices1.length) {
        case 1:
          point = collisionVertices1[0];
          break;
        case 2:
          // point between the two points in half distance
          point = new Vector3()
            .addVectors(collisionVertices1[0], collisionVertices1[1])
            .multiplyScalar(0.5);
          break;
        default:
          point = this.collisionPointFromThreePoints(collisionVertices1);
          break;
      }
      normal = this.computeCollisionNormal(obb, point);
      depth = this.computeCollisionDepth(obb, point, normal);
    } else if (collisionVertices2.length) {
      switch (collisionVertices2.length) {
        case 1:
          point = collisionVertices2[0];
          break;
        case 2:
          // point between the two points in half distance
          point = new Vector3()
            .addVectors(collisionVertices2[0], collisionVertices2[1])
            .multiplyScalar(0.5);
          break;
        default:
          point = this.collisionPointFromThreePoints(collisionVertices2);
          break;
      }
      normal = this.computeCollisionNormal(this, point).negate();
      depth = this.computeCollisionDepth(this, point, normal);
    } else {
      console.log("collision edges");
      const edgePoints1: {
        edge: { ray: Ray; length: number };
        point: Vector3;
      }[] = [];
      const edgePoints2: typeof edgePoints1 = [];
      this.getEdges().map((edge) => {
        let point = new Vector3();
        if (
          obb.intersectRay(edge.ray, point) &&
          edge.ray.origin.distanceTo(point) <= edge.length
        )
          edgePoints1.push({ edge, point });
      }),
        obb.getEdges().map((edge) => {
          let point = new Vector3();
          if (
            this.intersectRay(edge.ray, point) &&
            edge.ray.origin.distanceTo(point) <= edge.length
          )
            edgePoints2.push({ edge, point });
        });
      console.log("p1", edgePoints1);
      console.log("p2", edgePoints2);
      if (edgePoints1.length < edgePoints2.length) {
        console.log(1);
        switch (edgePoints1.length) {
          case 1:
            point = new Vector3().copy(
              obb.computeEdgeCollisionPoint(
                edgePoints1[0].edge,
                edgePoints1[0].point
              )
            );
            break;
          default:
            point = new Vector3();
            edgePoints1.map((edgePoint) => {
              let tempPoint = new Vector3().copy(
                obb.computeEdgeCollisionPoint(edgePoint.edge, edgePoint.point)
              );
              point.add(tempPoint);
            });
            point.multiplyScalar(1 / edgePoints1.length);
            break;
        }
      } else {
        console.log(2);
        switch (edgePoints2.length) {
          case 1:
            point = new Vector3().copy(
              this.computeEdgeCollisionPoint(
                edgePoints2[0].edge,
                edgePoints2[0].point
              )
            );
            break;
          default:
            point = new Vector3();
            edgePoints2.map((edgePoint) => {
              let tempPoint = new Vector3().copy(
                this.computeEdgeCollisionPoint(edgePoint.edge, edgePoint.point)
              );
              point.add(tempPoint);
            });
            point.multiplyScalar(1 / edgePoints2.length);
            break;
        }
      }
      const e1 = edgePoints1.length,
        e2 = edgePoints2.length;
      switch (true) {
        case e1 == e2 && e1 == 1:
          normal = this.computeEdgeCollisionNormal(obb, point);
          break;
        case e1 > e2:
          normal = this.computeEdgeCollisionNormal(obb, point);
          break;
        case e1 < e2:
          normal = obb.computeEdgeCollisionNormal(this, point).negate();
          break;
        default:
          normal = this.computeCollisionNormal(obb, point);
          break;
      }
      depth = this.computeCollisionDepth(obb, point, normal);
    }
    return { point, normal, depth };
  }
  collisionPointFromThreePoints(vertices: Vector3[]) {
    const v1 = new Vector3();
    const v2 = new Vector3();
    const a = vertices[0];
    const b = vertices[1];
    const c = vertices[2];
    const l1 = vertices[0].distanceTo(vertices[1]);
    const l2 = vertices[0].distanceTo(vertices[2]);
    const l3 = vertices[1].distanceTo(vertices[2]);
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
    return new Vector3().addVectors(v1, v2).multiplyScalar(0.5);
  }
  computeEdgeCollisionPoint(
    edge: { ray: Ray; length: number },
    pointOnRay: Vector3
  ) {
    const oppositePoint = new Vector3();
    const reversedRay = new Ray(
      edge.ray.origin.clone().addScaledVector(edge.ray.direction, edge.length),
      edge.ray.direction.clone().negate()
    );
    this.intersectRay(reversedRay, oppositePoint);
    const point = new Vector3()
      .addVectors(pointOnRay, oppositePoint)
      .multiplyScalar(0.5);
    return point;
  }
  computeEdgeCollisionNormal(obb: OBBs, collisionPoint: Vector3) {
    const closestFaces = obb
      .getFaces()
      .sort(
        (a, b) =>
          b.distanceToPoint(collisionPoint) - a.distanceToPoint(collisionPoint)
      );
    const edgeNormal = new Vector3()
      .addVectors(closestFaces[0].normal, closestFaces[1].normal)
      .normalize();
    return edgeNormal;
  }
  computeCollisionNormal(obb: OBBs, collisionPoint: Vector3) {
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
    return result;
  }
  computeCollisionDepth(obb: OBBs, collisionPoint: Vector3, normal: Vector3) {
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
    return distance;
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
