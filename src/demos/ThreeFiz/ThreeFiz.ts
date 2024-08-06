import * as THREE from "three";
import { OBBs } from "./OBB.js";
import { Vector3 } from "three";
import { Octree } from "three/addons/math/Octree.js";

class ThreeFiz {
  dT: number;
  lastUpdate: number;
  accumulator: number;
  TIME_STEP: number;
  spheres: {
    mesh: THREE.Mesh;
    collider: THREE.Sphere;
    velocity: THREE.Vector3;
    position: THREE.Vector3;
    force: THREE.Vector3;
    mass?: number;
    restitution?: number;
    isStatic?: boolean;
  }[];
  boxes: {
    collider: OBBs;
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    position: THREE.Vector3;
    rotation: THREE.Vector3;
    rotationVelocity: THREE.Vector3;
    force: THREE.Vector3;
    mass?: number;
    InertiaTensor: THREE.Matrix3;
    restitution: number;
    isStatic: boolean;
  }[];
  SCENE: THREE.Scene;
  GRAVITY: THREE.Vector3 | { force: number; radial: THREE.Vector3 };
  world?: { mesh: THREE.Mesh; collider: Octree };
  constructor(scene: THREE.Scene, TIME_STEP = 0.1) {
    this.dT = 0.0;
    this.lastUpdate = Date.now();
    this.accumulator = 0.0;
    this.TIME_STEP = TIME_STEP;
    this.spheres = [];
    this.boxes = [];
    this.SCENE = scene;
    this.GRAVITY = new THREE.Vector3(0, -10, 0);
  }
  init() {
    this.spheres.forEach((sphere) => {
      this.SCENE.add(sphere.mesh);
    });
    this.boxes.forEach((box) => {
      this.SCENE.add(box.mesh);
      box.collider = new OBBs();
    });
    this.boxes.sort((a, b) => {
      if (a.isStatic === b.isStatic) return 0;
      else if (a.isStatic === true) return 1;
      else return -1;
    });
    this.spheres.sort((a, b) => {
      if (a.isStatic === b.isStatic) return 0;
      else if (a.isStatic === true) return 1;
      else return -1;
    });
  }
  addSphere({
    mesh,
    mass = 1,
    restitution = 0.2,
    isStatic = false,
  }: {
    mesh: THREE.Mesh<THREE.SphereGeometry, any>;
    mass?: number;
    restitution?: number;
    isStatic?: boolean;
  }) {
    let sphere = {
      mesh: mesh,
      collider: new THREE.Sphere(new THREE.Vector3(0, 0, 0), 0),
      velocity: new THREE.Vector3(),
      position: new THREE.Vector3(0, 0, 0),
      force: new THREE.Vector3(),
      mass: mass,
      restitution: restitution,
      isStatic: isStatic,
    };
    console.log(typeof mesh);
    console.log(mesh);
    sphere.collider.radius = sphere.mesh.geometry.parameters.radius;
    this.spheres.push(sphere);
  }
  addBox({
    mesh,
    mass = 1,
    restitution = 0.2,
    isStatic = false,
  }: {
    mesh: THREE.Mesh<THREE.BoxGeometry, any>;
    mass?: number;
    restitution?: number;
    isStatic?: boolean;
  }) {
    let boxparams = mesh.geometry.parameters;
    let InertiaTensor = new THREE.Matrix3().set(
      (mass / 12) * (boxparams.height ** 2 + boxparams.depth ** 2),
      0,
      0,
      0,
      (mass / 12) * (boxparams.width ** 2 + boxparams.height ** 2),
      0,
      0,
      0,
      (mass / 12) * (boxparams.width ** 2 + boxparams.depth ** 2)
    );
    let box = {
      mesh: mesh,
      collider: new OBBs(),
      velocity: new THREE.Vector3(),
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Vector3(0, 0, 0),
      rotationVelocity: new THREE.Vector3(0, 0, 0),
      force: new THREE.Vector3(),
      mass: mass,
      InertiaTensor: InertiaTensor,
      restitution: restitution,
      isStatic: isStatic,
    };
    box.mesh.userData.obb = new OBBs();
    box.mesh.userData.obb.halfSize
      .copy(
        new THREE.Vector3(
          mesh.geometry.parameters.width,
          mesh.geometry.parameters.height,
          mesh.geometry.parameters.depth
        )
      )
      .multiplyScalar(0.5);
    box.mesh.matrixAutoUpdate = false;
    this.boxes.push(box);
  }
  setWorld(mesh: any) {
    let world = {
      mesh: mesh,
      collider: new Octree(),
    };
    world.collider.fromGraphNode(world.mesh);
    this.world = world;
  }
  gravity(obj: {
    mesh?: THREE.Mesh<
      THREE.BufferGeometry<THREE.NormalBufferAttributes>,
      THREE.Material | THREE.Material[],
      THREE.Object3DEventMap
    >;
    mass?: number | undefined;
    restitution?: number | undefined;
    isStatic?: boolean | undefined;
    position?: any;
  }) {
    let g = this.GRAVITY;
    if ("radial" in g && "force" in g) {
      if (g.radial instanceof THREE.Vector3)
        return new THREE.Vector3()
          .copy(g.radial)
          .sub(obj.position)
          .normalize()
          .multiplyScalar(g.force);
    }
    if (g instanceof THREE.Vector3) return g.clone();
    return new THREE.Vector3(0, 0, 0);
  }
  updateObjects(time: number) {
    this.spheres.forEach((sphere) => {
      if (!sphere.isStatic) {
        sphere.velocity.add(this.gravity(sphere));
        sphere.position.addScaledVector(sphere.velocity.clone(), time);
      }
      sphere.collider.center.copy(sphere.position);
      sphere.mesh.position.copy(sphere.collider.center);
    });
    this.boxes.forEach((box) => {
      if (!box.isStatic) {
        box.velocity.add(this.gravity(box));
        box.position.addScaledVector(box.velocity, time);
        box.rotation.addScaledVector(box.rotationVelocity, time);
      }
      box.mesh.position.copy(box.position);
      box.mesh.rotation.set(box.rotation.x, box.rotation.y, box.rotation.z);
      box.mesh.updateMatrix();
      box.mesh.updateMatrixWorld();
      box.collider.copy(box.mesh.userData.obb);
      box.collider.applyMatrix4(box.mesh.matrixWorld);
    });
    this.sphereBoxCollisions();
    this.spheresCollisions();
    this.boxesCollisions(time / 10000);
    // if (this.world) this.worldCollisions(time) // może do update lepiej
  }
  checkCollisions(obj: {
    mesh: any;
    collider: any;
    velocity?: THREE.Vector3;
    position?: THREE.Vector3;
    force?: THREE.Vector3;
    mass?: number | undefined;
    restitution?: number | undefined;
    isStatic?: boolean | undefined;
  }) {
    obj.mesh.position.copy(obj.collider.center);
    if (this.world && this.world.collider) {
      this.world.collider.subTrees = [];
      if (this.world.mesh) {
        this.world.collider.fromGraphNode(this.world.mesh);
      }
      return this.world.collider.sphereIntersect(obj.collider);
    }
    return null;
  }
  worldCollisions(time: number) {
    this.boxes.forEach((box) => {
      if (box.isStatic) {
      }
    });
    this.spheres.forEach((sphere) => {
      let collision = this.checkCollisions(sphere);
      if (collision) {
        let relativeVelocity = sphere.velocity.clone(); //.sub(floor.velocity)
        let dot = relativeVelocity.dot(collision.normal);
        // sphere.hit = true;
        sphere.collider.center.add(
          collision.normal.clone().multiplyScalar(collision.depth)
        );
        sphere.velocity.addScaledVector(collision.normal, -dot * 1.5); // 1.5 to sprężystość, 2 = 100% odbitej energii + damping
        const damping = Math.exp((-1.1 * time) / 500);
        sphere.velocity.multiplyScalar(damping);
      }
    });
  }

  spheresCollisions() {
    this.spheres.forEach((sphere1, idx1) => {
      this.spheres.forEach((sphere2, idx2) => {
        if (sphere1 !== sphere2 && idx2 > idx1) {
          if (sphere1.collider.intersectsSphere(sphere2.collider)) {
            const normal = sphere1.collider.center
              .clone()
              .sub(sphere2.collider.center)
              .normalize();
            const relativeVelocity = sphere1.velocity
              .clone()
              .sub(sphere2.velocity.clone());
            const dot = relativeVelocity.dot(normal);
            const depth = sphere1.collider.center
              .clone()
              .sub(sphere2.collider.center.clone())
              .length();
            const radii = sphere1.collider.radius + sphere2.collider.radius;
            const d = (radii - depth) / 2;
            const M = (sphere1.mass ?? 1) + (sphere2.mass ?? 1);
            const F1 = (2 * (sphere1.mass ?? 1)) / M;
            const F2 = (2 * (sphere2.mass ?? 1)) / M;
            const restitution =
              ((sphere1.restitution ?? 1) + (sphere2.restitution ?? 1)) / 2;
            if (!sphere1.isStatic) {
              sphere1.position.addScaledVector(normal.clone(), d);
              sphere1.velocity.addScaledVector(normal, -dot * restitution * F1);
            }
            if (!sphere2.isStatic) {
              sphere2.position.addScaledVector(normal.clone(), -d);
              sphere2.velocity.addScaledVector(normal, dot * restitution * F2);
            }
          }
        }
      });
    });
  }

  sphereBoxCollisions() {
    this.boxes.forEach((box) => {
      this.spheres.forEach((sphere) => {
        if (box.collider.intersectsSphere(sphere.collider)) {
          const closestPoint = new THREE.Vector3();
          box.collider.clampPoint(sphere.collider.center, closestPoint);
          const collision = {
            normal: sphere.collider.center
              .clone()
              .sub(closestPoint)
              .normalize(),
            depth:
              sphere.collider.radius -
              sphere.collider.center.clone().sub(closestPoint).length(),
            point: closestPoint,
          };
          let r = collision.point.clone().sub(box.position.clone());
          let relBox = new THREE.Vector3(),
            relSphere = new Vector3(),
            jBox = new Vector3(),
            boxM = 0,
            sphereM = 0;
          if (!box.isStatic) {
            relBox.copy(
              box.velocity.clone().add(box.rotationVelocity.clone().cross(r))
            );
            jBox.copy(
              r
                .clone()
                .cross(collision.normal)
                .applyMatrix3(box.InertiaTensor.clone().invert())
                .cross(r)
            );
            boxM = 1 / (box.mass ?? 1);
          }
          if (!sphere.isStatic) {
            relSphere.copy(sphere.velocity.clone());
            sphereM = 1 / (sphere.mass ?? 1);
            relSphere = sphere.velocity.clone();
          }
          let relV = relSphere.sub(relBox);
          const dot = relV.dot(collision.normal);
          const restitution = (box.restitution + (sphere.restitution ?? 1)) / 2;
          const jN = -(1 + restitution) * dot;
          const jD = boxM + sphereM + jBox.dot(collision.normal);
          const j = jN / jD;
          const boxvel = collision.normal
            .clone()
            .multiplyScalar(j / (box.mass ?? 1));
          const boxrot = r
            .clone()
            .cross(collision.normal.clone().multiplyScalar(j))
            .applyMatrix3(box.InertiaTensor.clone().invert());

          if (!box.isStatic) {
            box.position.add(
              collision.normal.clone().multiplyScalar(-collision.depth)
            );
            box.rotationVelocity.addScaledVector(boxrot, -1);
            box.velocity.addScaledVector(boxvel, -1);
          }
          if (!sphere.isStatic) {
            sphere.position.add(
              collision.normal.clone().multiplyScalar(collision.depth)
            );
            sphere.velocity.addScaledVector(
              collision.normal,
              -dot * (1 + restitution)
            );
          }
        }
      });
    });
  }

  clampRotation(
    rotation: THREE.Vector3,
    min: THREE.Vector3,
    max: THREE.Vector3
  ) {
    const x = rotation.x * (Math.PI / 180);
    const y = rotation.y * (Math.PI / 180);
    const z = rotation.z * (Math.PI / 180);

    const clampedX = Math.max(Math.min(x, max.x), min.x);
    const clampedY = Math.max(Math.min(y, max.y), min.y);
    const clampedZ = Math.max(Math.min(z, max.z), min.z);

    rotation.set(
      clampedX * (180 / Math.PI),
      clampedY * (180 / Math.PI),
      clampedZ * (180 / Math.PI)
    );
  }

  boxesCollisions(dT: number) {
    this.boxes.forEach((box1, idx1) => {
      this.boxes.forEach((box2, idx2) => {
        if (box1 !== box2 && idx2 > idx1) {
          if (box1.collider.intersectsOBB(box2.collider)) {
            const damping = Math.exp(-1 * dT);
            const collisionPoint = box1.collider.collisionPoint(box2.collider);
            if (collisionPoint && collisionPoint.point) {
              let friction = 0.5;
              let m1 = new THREE.Matrix4()
                .setFromMatrix3(box1.collider.rotation)
                .invert();
              let m2 = new THREE.Matrix4()
                .setFromMatrix3(box2.collider.rotation)
                .invert();
              let r1 = collisionPoint.point.clone().sub(box1.position);
              let r2 = collisionPoint.point.clone().sub(box2.position);
              let relBox1 = new THREE.Vector3(),
                relBox2 = new THREE.Vector3(),
                jBox1 = new THREE.Vector3(),
                jBox2 = new THREE.Vector3(),
                box1M = 0,
                box2M = 0;
              if (!box1.isStatic) {
                relBox1.copy(
                  box1.velocity
                    .clone()
                    .add(box1.rotationVelocity.clone().cross(r1))
                );
                jBox1.copy(
                  r1
                    .clone()
                    .cross(collisionPoint.normal)
                    .applyMatrix3(box1.InertiaTensor.clone().invert())
                    .cross(r1)
                );
                box1M = 1 / (box1.mass ?? 1);
              }
              if (!box2.isStatic) {
                relBox2.copy(
                  box2.velocity
                    .clone()
                    .add(box2.rotationVelocity.clone().cross(r2))
                );
                jBox2.copy(
                  r2
                    .clone()
                    .cross(collisionPoint.normal)
                    .applyMatrix3(box2.InertiaTensor.clone().invert())
                    .cross(r2)
                );
                box2M = 1 / (box2.mass ?? 1);
              }
              let relV = relBox1.sub(relBox2).dot(collisionPoint.normal);
              const jN =
                -(1 + (box1.restitution + box2.restitution) / 2) * relV;
              const jD =
                box1M + box2M + jBox1.add(jBox2).dot(collisionPoint.normal);
              const j = jN / jD;
              const box1vel = collisionPoint.normal
                .clone()
                .multiplyScalar(j / (box1.mass ?? 1));
              const box2vel = collisionPoint.normal
                .clone()
                .multiplyScalar(j / (box2.mass ?? 1));
              const box1rot = r1
                .clone()
                .cross(collisionPoint.normal.clone().multiplyScalar(j))
                .applyMatrix3(box1.InertiaTensor.clone().invert());
              const box2rot = r2
                .clone()
                .cross(collisionPoint.normal.clone().multiplyScalar(j))
                .applyMatrix3(box2.InertiaTensor.clone().invert());

              if (!box1.isStatic) {
                box1.position.add(
                  collisionPoint.normal
                    .clone()
                    .multiplyScalar(collisionPoint.depth)
                );
                box1.rotationVelocity.addScaledVector(box1rot, damping);
                box1.velocity.addScaledVector(box1vel, damping);
              }
              if (!box2.isStatic) {
                box2.position.add(
                  collisionPoint.normal
                    .clone()
                    .multiplyScalar(-collisionPoint.depth)
                );
                box2.rotationVelocity.addScaledVector(box2rot, -damping);
                box2.velocity.addScaledVector(box2vel, -damping);
              }
            }
          }
        }
      });
    });
  }
  boxHelper() {}
  update() {
    this.dT = Date.now() - this.lastUpdate;
    this.lastUpdate += this.dT;
    this.dT = Math.max(0, this.dT);
    this.accumulator += this.dT;
    this.accumulator = Math.min(Math.max(this.accumulator, 0), 1.0);
    while (this.accumulator >= this.TIME_STEP) {
      this.updateObjects(this.dT / 100000);
      this.accumulator -= this.TIME_STEP;
    }
    if (true) return false;
  }
}
export default ThreeFiz;
