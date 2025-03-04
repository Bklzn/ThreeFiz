import * as THREE from "three";
import ThreeFiz from "threefiz";
import Stats from "three/examples/jsm/libs/stats.module.js";
import {
  camera,
  controls,
  renderer,
  scene,
  createCheckerboardTexture,
} from "./init";

camera.position.set(-50, 50, 10);
controls.target.set(50, -11, 0);

//objects
const sphereGeo = new THREE.SphereGeometry(3);
const sphereMat = new THREE.MeshPhongMaterial({
  map: createCheckerboardTexture(8, 5, "hsl(0, 50%, 60%)", "hsl(0, 50%, 80%)"),
});

const boxGeo = new THREE.BoxGeometry(3, 3, 3);
const boxMat = new THREE.MeshPhongMaterial({ color: "hsl(240, 50%, 60%)" });

const floorGeo = new THREE.BoxGeometry(50, 1, 50);
const wallGeo = new THREE.BoxGeometry(50, 3, 1);
const floorMat = new THREE.MeshPhongMaterial({ color: "hsl(240, 50%, 80%)" });
//threeFiz
const threeFiz = new ThreeFiz({ scene });

threeFiz.addSphere({
  mesh: new THREE.Mesh(sphereGeo, sphereMat),
  position: new THREE.Vector3(0, 15, 15),
  friction: 1,
  mass: 1,
  restitution: 0,
});
threeFiz.addBox({
  mesh: new THREE.Mesh(boxGeo, boxMat),
  position: new THREE.Vector3(0, 15, -15),
  friction: 1,
  mass: 10,
  restitution: 0,
});

threeFiz.addBox({
  mesh: new THREE.Mesh(floorGeo, floorMat),
  rotation: new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, 0, Math.PI / -7)
  ),
  friction: 1,
  restitution: 0,
  isStatic: true,
});
threeFiz.addBox({
  mesh: new THREE.Mesh(floorGeo, floorMat),
  position: new THREE.Vector3(47, -11, 0),
  friction: 1,
  restitution: 0.1,
  isStatic: true,
});
threeFiz.addBox({
  mesh: new THREE.Mesh(wallGeo, floorMat),
  position: new THREE.Vector3(47, -9, 24.5),
  isStatic: true,
});
threeFiz.addBox({
  mesh: new THREE.Mesh(wallGeo, floorMat),
  position: new THREE.Vector3(47, -9, -24.5),
  isStatic: true,
});
threeFiz.addBox({
  mesh: new THREE.Mesh(wallGeo, floorMat),
  position: new THREE.Vector3(47 + 24.5, -9, 0),
  rotation: new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, Math.PI / 2, 0)
  ),
  isStatic: true,
});

threeFiz.init();

threeFiz.objects.forEach((obj) => {
  obj.mesh.castShadow = true;
  obj.mesh.receiveShadow = true;
});

//Debug
const stats = new Stats();
stats.dom.style.setProperty("position", "absolute");
stats.dom.style.setProperty("top", "0");

const sphere = threeFiz.objects[0];
const applyAngularVelocity = (
  x: number,
  y: number,
  z: number,
  force: number
) => {
  const e = new THREE.Vector3(x * force, y * force, z * force);
  console.log(e);
  sphere.setAngularVelocity((old) => {
    console.clear();
    console.log(old, "+", e, "=", old.clone().add(e));
    return old.add(e);
  });
};
window.addEventListener("keydown", (e: KeyboardEvent) => {
  const force = 1;
  if (e.code === "KeyW") {
    applyAngularVelocity(0, 0, -1, force);
  } else if (e.code === "KeyS") {
    applyAngularVelocity(0, 0, 1, force);
  } else if (e.code === "KeyA") {
    applyAngularVelocity(-1, 0, 0, force);
  } else if (e.code === "KeyD") {
    applyAngularVelocity(1, 0, 0, force);
  } else if (e.code === "KeyQ") {
    applyAngularVelocity(0, 1, 0, force);
  } else if (e.code === "KeyE") {
    applyAngularVelocity(0, -1, 0, force);
  } else if (e.code === "Space") {
    sphere.setAngularVelocity((old) => old.set(0, 0, 0));
  }
});

document.body.appendChild(stats.dom);
controls.update();
const loop = () => {
  controls.update();
  stats.update();
  threeFiz.step();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
};
loop();
