import {
  ArrowHelper,
  BoxGeometry,
  Color,
  Matrix4,
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
import RigidBody from "./RigidBody";
class OBBs extends OBB {
  vertices: {
    initialValues: Vector3[];
    values: Vector3[];
  };
  edges: {
    initialValues: ReturnType<OBBs["getEdges"]>;
    values: ReturnType<OBBs["getEdges"]>;
  };
  faces: {
    initialValues: Plane[];
    values: Plane[];
  };
  parent: RigidBody;
  debug:
    | {
        obb: Mesh<BoxGeometry>;
        collision: {
          point: Mesh;
          normal: ArrowHelper;
          depth: Mesh;
        };
      }
    | any;
  collision: {
    point: Vector3;
    normal: Vector3;
    depth: number;
  };
  constructor(parent: RigidBody, halfSize: Vector3) {
    super();
    this.parent = parent;
    this.halfSize = halfSize;
    const vertices = this.getVertices();
    this.vertices = {
      initialValues: vertices.map((v) => v.clone()),
      values: vertices,
    };
    const edges = this.getEdges();
    const faces = this.getFaces();
    this.edges = {
      initialValues: edges.map((e) => ({ ...e, ray: e.ray.clone() })),
      values: edges,
    };
    this.faces = {
      initialValues: faces.map((f) => f.clone()),
      values: faces,
    };
    this.debug = {};
    this.collision = {
      point: new Vector3(),
      normal: new Vector3(),
      depth: 0,
    };
  }

  updateMatrrix() {
    this.updateVertices();
    this.updateEdges();
    this.updateFaces();
  }
  getCollision(obb: OBBs) {
    this.updateMatrrix();
    obb.updateMatrrix();
    const collisionVertices1 = this.getVerticesInCollision(obb);
    const collisionVertices2 = obb.getVerticesInCollision(this);
    if (collisionVertices1.length + collisionVertices2.length > 0) {
      // TODO: case for intersection this.vertices and obb.edges
      this.collision = this.verticesCollision(
        obb,
        collisionVertices1,
        collisionVertices2
      );
    } else {
      this.collision = this.edgeCollision(obb);
    }
    return this.collision;
  }

  verticesCollision(obb: OBBs, vertices1: Vector3[], vertices2: Vector3[]) {
    let point: Vector3;
    let normal: Vector3;
    let depth: number;
    if (vertices1.length) {
      switch (vertices1.length) {
        case 1:
          point = vertices1[0];
          break;
        case 2:
          // point between the two points in half distance
          point = new Vector3()
            .addVectors(vertices1[0], vertices1[1])
            .multiplyScalar(0.5);
          break;
        default:
          point = this.collisionPoint_ThreePoints(vertices1);
          break;
      }
      normal = this.collisionNormal_closestFace(obb, point);
    } else {
      switch (vertices2.length) {
        case 1:
          point = vertices2[0];
          break;
        case 2:
          // point between the two points in half distance
          point = new Vector3()
            .addVectors(vertices2[0], vertices2[1])
            .multiplyScalar(0.5);
          break;
        default:
          point = this.collisionPoint_ThreePoints(vertices2);
          break;
      }
      normal = obb.collisionNormal_closestFace(this, point).negate();
    }
    depth = this.collisionDepth_projection(obb, normal);
    return { point, normal, depth };
  }

  edgeCollision(obb: OBBs) {
    let point: Vector3;
    let normal: Vector3;
    let depth: number;
    const edgePoints1 = this.getEdgesIntersections(obb);
    const edgePoints2 = obb.getEdgesIntersections(this);
    point =
      edgePoints1.length > edgePoints2.length
        ? this.collisionPoint_Edge(edgePoints2)
        : obb.collisionPoint_Edge(edgePoints1);
    normal = this.collisionNormal_Edge(
      obb,
      point,
      edgePoints1.length,
      edgePoints2.length
    );
    depth =
      edgePoints1.length > edgePoints2.length
        ? obb.collisionDepth_twoPointsDistance(
            this,
            point,
            normal.clone().negate()
          )
        : this.collisionDepth_twoPointsDistance(obb, point, normal);
    return { point, normal, depth };
  }

  collisionPoint_Edge(edgePoints: any[]) {
    const point = new Vector3();
    edgePoints.map((p) => {
      const tempPoint = new Vector3().copy(
        this.collisionPoint_Ray(p.edge, p.point)
      );
      point.add(tempPoint);
    });
    point.multiplyScalar(1 / edgePoints.length);
    return point;
  }

  collisionNormal_Edge(
    obb: OBBs,
    collisionPoint: Vector3,
    l1: Number,
    l2: Number
  ) {
    const vertex1 = this.getClosestVertexToPoint(collisionPoint);
    const vertex2 = obb.getClosestVertexToPoint(collisionPoint);
    switch (true) {
      case l1 == l2 && l1 == 1:
        return this.collisionNormal_ClosestPoints(
          collisionPoint,
          vertex1,
          vertex2
        );
      case l1 > l2:
        return this.collisionNormal_ClosestPoints(
          collisionPoint,
          vertex1,
          vertex2
        );
      case l1 < l2:
        return this.collisionNormal_ClosestPoints(
          collisionPoint,
          vertex1,
          vertex2
        );
      default:
        return this.collisionNormal_closestFace(obb, collisionPoint);
    }
  }

  collisionPoint_ThreePoints(vertices: Vector3[]) {
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

  collisionPoint_Ray(
    edge: ReturnType<OBBs["getEdges"]>[number],
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

  collisionNormal_ClosestPoints(
    collisionPoint: Vector3,
    vertex1: Vector3,
    vertex2: Vector3
  ) {
    const plane = new Plane().setFromCoplanarPoints(
      collisionPoint,
      vertex1,
      vertex2
    );
    const diretionToThis = new Vector3()
      .subVectors(this.center, collisionPoint)
      .normalize();
    const normal = plane.normal;
    if (diretionToThis.dot(plane.normal) < 0) normal.negate();
    return plane.normal;
  }

  collisionNormal_closestFace(obb: OBBs, collisionPoint: Vector3) {
    const result = new Vector3();
    let resultDistance = Infinity;
    obb.faces.values.forEach((face) => {
      const currDistance = Math.abs(face.distanceToPoint(collisionPoint));
      const directionToPoint = new Vector3()
        .subVectors(this.center, collisionPoint)
        .normalize();
      if (
        resultDistance > currDistance &&
        face.normal.dot(directionToPoint) > 0
      ) {
        resultDistance = currDistance;
        result.copy(face.normal);
      }
    });
    return result;
  }

  collisionDepth_projection(obb: OBBs, normal: Vector3) {
    const projection1 = this.getOBBProjection(normal);
    const projection2 = obb.getOBBProjection(normal);
    const overlap =
      Math.min(projection1.max, projection2.max) -
      Math.max(projection1.min, projection2.min);
    return overlap + 10 ** -10;
  }

  collisionDepth_twoPointsDistance(
    obb: OBBs,
    collisionPoint: Vector3,
    normal: Vector3
  ) {
    const thisCenterDinstance = this.center.distanceTo(collisionPoint);
    const thisOrigin = collisionPoint
      .clone()
      .addScaledVector(normal, thisCenterDinstance);
    const rayToObb = new Ray(thisOrigin, normal.clone().negate());
    const intersctionObbPoint = new Vector3();
    obb.intersectRay(rayToObb, intersctionObbPoint);
    return collisionPoint.distanceTo(intersctionObbPoint);
  }

  getOBBProjection(normal: Vector3) {
    const vertices = this.vertices.values;
    let min = Infinity;
    let max = -Infinity;
    vertices.forEach((vertex) => {
      const projection = vertex.dot(normal);
      min = Math.min(min, projection);
      max = Math.max(max, projection);
    });
    return { min, max };
  }
  getClosestVertexToPoint(point: Vector3) {
    return this.vertices.values.sort(
      (a, b) => a.distanceTo(point) - b.distanceTo(point)
    )[0];
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
    return vertices;
  }
  updateVertices() {
    const initial = this.vertices.initialValues;
    this.vertices.values.forEach((vertex, i) => {
      vertex
        .copy(initial[i].clone())
        .applyMatrix3(this.rotation)
        .add(this.center);
    });
  }

  getVerticesInCollision(obb: OBBs) {
    const list: Vector3[] = [];
    this.vertices.values.map((vertex) => {
      if (obb.containsPoint(vertex)) {
        list.push(vertex);
      }
    });
    return list;
  }

  getEdges(): { ray: Ray; length: number }[] {
    const v = this.vertices.values;
    // each group is set of source vertex and directions for rays to define edges
    // groups are determined by the order of the vertices in this.vertices.values
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

  updateEdges() {
    const initial = this.edges.initialValues;
    this.edges.values.forEach((edge, i) => {
      edge.ray.copy(initial[i].ray);
      edge.ray.origin.applyMatrix3(this.rotation).add(this.center);
      edge.ray.direction.applyMatrix3(this.rotation);
    });
  }

  getEdgesIntersections(obb: OBBs) {
    const list: {
      edge: ReturnType<OBBs["getEdges"]>[number];
      point: Vector3;
    }[] = [];
    this.edges.values.map((edge) => {
      let point = new Vector3();
      if (
        obb.intersectRay(edge.ray, point) &&
        edge.ray.origin.distanceTo(point) <= edge.length
      )
        list.push({ edge, point });
    });
    return list;
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

  updateFaces() {
    const initial = this.faces.initialValues;
    this.faces.values.forEach((face, i) => {
      face.normal.copy(initial[i].normal);
      face.normal.applyMatrix3(this.rotation);
      face.constant = -this.center
        .clone()
        .add(this.halfSize.clone().multiply(face.normal))
        .dot(face.normal);
    });
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
    const color = new Color(`hsl(${randInt(0, 360)}, 100%, 70%)`);
    const arrow = new ArrowHelper(direction, origin, 10, color);
    scene.add(arrow);
    return arrow;
  }

  getPointHelper(scene: Scene, point: Vector3) {
    const color = new Color(`hsl(${randInt(0, 360)}, 100%, 70%)`);
    const mesh = new Mesh(
      new OctahedronGeometry(0.5, 0),
      new MeshBasicMaterial({ color, wireframe: true })
    );
    scene.add(mesh);
    mesh.position.copy(point);
    return mesh;
  }

  showOBB(scene: Scene, color: Color = new Color("yellow")) {
    const geo = new BoxGeometry(
      this.halfSize.x * 2,
      this.halfSize.y * 2,
      this.halfSize.z * 2
    );
    const mat = new MeshBasicMaterial({ color: color, wireframe: true });
    const box = new Mesh(geo, mat);
    this.debug.obb = box;
    scene.add(box);
  }

  showCollision(scene: Scene) {
    if (!this.debug.collision) {
      const { point, normal, depth } = this.collision;
      this.debug.collision = {
        point: this.getPointHelper(scene, point!),
        normal: this.getArrowHelper(scene, normal!, point!),
        depth: this.getPointHelper(
          scene,
          point!.clone().addScaledVector(normal!, depth!)
        ),
      };
    } else {
      const {
        point,
        normal,
        depth,
      }: { point: Mesh; normal: ArrowHelper; depth: Mesh } =
        this.debug.collision;
      point.position.copy(this.collision.point!);
      normal.setDirection(this.collision.normal!);
      normal.position.copy(this.collision.point!);
      depth.position.copy(
        this.collision
          .point!.clone()
          .addScaledVector(this.collision.normal!, this.collision.depth!)
      );
    }
  }

  debugUpdate() {
    this.debug.obb.setFromRotationMatrix(
      new Matrix4().setFromMatrix3(this.rotation)
    );
    this.debug.obb.position.copy(this.center);
  }
}
export { OBBs };
