import {
  ArrowHelper,
  BoxGeometry,
  Color,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
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
  axes: {
    initialValues: Vector3[];
    values: Vector3[];
  };
  edges: {
    initialValues: ReturnType<OBBs["getEdges"]>;
    values: ReturnType<OBBs["getEdges"]>;
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
        points: Mesh[];
        arrows: ArrowHelper[];
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
      initialValues: vertices,
      values: vertices.map((v) => v.clone()),
    };
    const axes = this.getAxes();
    this.axes = {
      initialValues: axes,
      values: axes.map((a) => a.clone()),
    };
    const edges = this.getEdges();
    this.edges = {
      initialValues: edges,
      values: edges.map((e) => ({ ...e, ray: e.ray.clone() })),
    };
    this.debug = {};
    this.collision = {
      point: new Vector3(),
      normal: new Vector3(),
      depth: 0,
    };
  }

  updateValues() {
    this.updateVertices();
    this.updateAxes();
    this.updateEdges();
  }

  getCollision(obb: OBBs) {
    this.updateValues();
    obb.updateValues();
    let point = obb.center.clone();
    const { normal, depth } = this.getNormalAndDepth(obb);
    this.collision.normal = normal;
    this.collision.depth = depth;
    if (depth > 1e-10) {
      const collisionVertices1 = this.getIntersectedVertices(obb);
      const collisionVertices2 = obb.getIntersectedVertices(this);
      if (collisionVertices1.length + collisionVertices2.length > 0) {
        point.copy(
          this.collisionPoint_Vertices(
            obb,
            collisionVertices1,
            collisionVertices2
          )
        );
      } else {
        point.copy(this.collisionPoint_Edges(obb));
      }
      this.collision.point = point;
    }
    if (!this.isNormalHasGoodDirection()) this.collision.normal.negate();
    this.onCollision(this.collision);
    return this.collision;
  }

  getNormalAndDepth(obb: OBBs) {
    const thisAxes = this.axes.values.map((a) => a.clone());
    const obbAxes = obb.axes.values.map((a) => a.clone());
    const normal = new Vector3();
    let minDepth = Infinity;
    const AllAxes = [...thisAxes, ...obbAxes];
    for (let i = 0; i < thisAxes.length; i++) {
      for (let j = 0; j < obbAxes.length; j++) {
        const crossProduct = new Vector3().crossVectors(
          thisAxes[i],
          obbAxes[j]
        );
        if (crossProduct.lengthSq() > 1 / 1e8)
          AllAxes.push(crossProduct.normalize());
      }
    }
    AllAxes.map((axis) => {
      let depth = this.collisionDepth_projection(obb, axis.clone());
      if (depth < minDepth) {
        normal.copy(axis);
        minDepth = depth;
      }
    });
    return { normal, depth: minDepth };
  }

  isNormalHasGoodDirection() {
    const collisionPoint = this.collision.point;
    const directonToCenter = new Vector3()
      .subVectors(this.center, collisionPoint)
      .normalize();
    return directonToCenter.dot(this.collision.normal) > 0;
  }

  collisionPoint_Vertices(
    obb: OBBs,
    vertices1: Vector3[],
    vertices2: Vector3[]
  ) {
    let point: Vector3;
    if (vertices1.length) {
      point = this.getCenterPoint(vertices1);
    } else {
      point = obb.getCenterPoint(vertices2);
    }
    return point;
  }

  onCollision(_collision: typeof this.collision) {}

  collisionPoint_Edges(obb: OBBs) {
    const thisIntersectedEdges = this.getIntersectedEdges(
      obb,
      this.edges.values
    );
    const obbIntersectedEdges = obb.getIntersectedEdges(this, obb.edges.values);
    const { edges: finalIntersectedEdges, points: collisionPoints } =
      this.collisonEdges_pickBestIntersectionResult(
        thisIntersectedEdges,
        obbIntersectedEdges
      );
    const finalIntersectedEdges_reversed = finalIntersectedEdges.map((e) =>
      this.getReversedRay(e)
    );
    let collisionPointsfromReverseEdges: Vector3[] = [];
    if (finalIntersectedEdges === thisIntersectedEdges.edges)
      collisionPointsfromReverseEdges = this.getIntersectedEdges(
        obb,
        finalIntersectedEdges_reversed
      ).points;
    else
      collisionPointsfromReverseEdges = obb.getIntersectedEdges(
        this,
        finalIntersectedEdges_reversed
      ).points;
    const point = this.getCenterPoint([
      ...collisionPoints,
      ...collisionPointsfromReverseEdges,
    ]);
    return point;
  }

  getReversedRay(
    edge: ReturnType<OBBs["getEdges"]>[number]
  ): ReturnType<OBBs["getEdges"]>[number] {
    const { ray, length } = edge;
    const reversedRay = new Ray(
      ray.origin.clone().addScaledVector(ray.direction, length),
      ray.direction.clone().negate()
    );
    return { ray: reversedRay, length };
  }

  collisonEdges_pickBestIntersectionResult(
    inter_edges1: ReturnType<OBBs["getIntersectedEdges"]>,
    inter_edges2: ReturnType<OBBs["getIntersectedEdges"]>
  ) {
    const e1_l = inter_edges1.edges.length;
    const e2_l = inter_edges1.edges.length;
    if (e1_l > 0 && e2_l > 0) {
      if (e1_l > e2_l) return inter_edges2;
      return inter_edges1;
    }
    if (e1_l > 0) {
      return inter_edges1;
    }
    return inter_edges2;
  }

  getCenterPoint(vertices: Vector3[]) {
    const centerPoint = new Vector3();
    vertices.map((v) => centerPoint.add(v));
    centerPoint.multiplyScalar(1 / vertices.length);
    return centerPoint;
  }

  collisionDepth_projection(obb: OBBs, normal: Vector3) {
    const projection1 = this.getOBBProjection(normal);
    const projection2 = obb.getOBBProjection(normal);
    const overlap =
      Math.min(projection1.max, projection2.max) -
      Math.max(projection1.min, projection2.min);
    return overlap;
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

  getIntersectedVertices(obb: OBBs) {
    const list: Vector3[] = [];
    this.vertices.values.map((vertex) => {
      if (obb.containsPoint(vertex)) {
        list.push(vertex);
      }
    });
    return list;
  }

  getAxes() {
    return [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
  }

  updateAxes() {
    const initial = this.axes.initialValues;
    this.axes.values.forEach((axis, i) => {
      axis.copy(initial[i]);
      axis.applyMatrix3(this.rotation);
    });
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
      edge.ray.direction.applyMatrix3(this.rotation);
    });
  }

  getIntersectedEdges(
    obb: OBBs,
    edges: ReturnType<OBBs["getEdges"]>
  ): { edges: ReturnType<OBBs["getEdges"]>; points: Vector3[] } {
    const edgesArr: ReturnType<OBBs["getEdges"]> = [];
    const points: Vector3[] = [];
    edges.map((edge) => {
      let point = new Vector3();
      if (
        obb.intersectRay(edge.ray, point) &&
        edge.ray.origin.distanceTo(point) <= edge.length
      ) {
        edgesArr.push(edge);
        points.push(point);
      }
    });
    return { edges: edgesArr, points };
  }

  getArrowHelper(
    scene: Scene,
    direction: Vector3,
    origin: Vector3,
    id: number,
    color?: Color
  ) {
    const c = color || new Color(`hsl(${randInt(0, 360)}, 100%, 70%)`);
    const arrow = new ArrowHelper(direction, origin, 10, c);
    if (!this.debug.arrows) this.debug.arrows = [] as Mesh[];
    if (!this.debug.arrows[id]) {
      scene.add(arrow);
      this.debug.arrows[id] = arrow;
    }
    this.debug.arrows[id].position.copy(arrow.position);
    this.debug.arrows[id].setDirection(direction);
    return this.debug.arrows[id];
  }

  getPointHelper(scene: Scene, point: Vector3, id: number, color?: Color) {
    const c = color || new Color(`hsl(${randInt(0, 360)}, 100%, 70%)`);
    const mesh = new Mesh(
      new OctahedronGeometry(0.5, 0),
      new MeshBasicMaterial({ color: c, wireframe: true })
    );
    if (!this.debug.points) this.debug.points = [] as Mesh[];
    if (!this.debug.points[id]) {
      scene.add(mesh);
      this.debug.points[id] = mesh;
    }
    this.debug.points[id].position.copy(point);
    return this.debug.points[id];
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
        point: this.getPointHelper(scene, point!, this.parent.mesh.id + 100),
        normal: this.getArrowHelper(
          scene,
          normal!,
          point!,
          this.parent.mesh.id + 100
        ),
        depth: this.getPointHelper(
          scene,
          point!.clone().addScaledVector(normal!, depth!),
          this.parent.mesh.id + 101
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
