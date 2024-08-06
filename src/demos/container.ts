import * as THREE from "three";
import ThreeFiz from "../ThreeFiz/ThreeFiz";
import Grabber from "../ThreeFiz/Grabber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

//init
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.01,
  10000
);
let renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
let controls = new OrbitControls(camera, renderer.domElement);
renderer.setSize(window.innerHeight, window.innerWidth);
document.body.appendChild(renderer.domElement);

const handleResize = () => {
  const { innerWidth, innerHeight } = window;
  renderer.setSize(innerWidth, innerHeight - 100);
  camera.aspect = innerWidth / (innerHeight - 100);
  camera.updateProjectionMatrix();
};

//objects
let flGeo = new THREE.BoxGeometry(350, 1, 350);
let wallGeo = new THREE.BoxGeometry(15, 50, 1);
let flMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
let sphereGeo = new THREE.SphereGeometry(10);
let sphereMat = new THREE.MeshPhongMaterial({ color: 0x0000ff });
let boxGeo = new THREE.BoxGeometry(20, 20, 20);
let boxMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });

const light = new THREE.PointLight(0xffffff, 30, 0, 0.5);

//Scene
const threeFizWorld = new ThreeFiz(scene);
let obj = 100;
let sciany = 85;
for (let i = 0; i < obj; i++) {
  let randomRadius = Math.random() * (15 - 5) + 5;
  threeFizWorld.addSphere({
    mesh: new THREE.Mesh(new THREE.SphereGeometry(randomRadius), sphereMat),
  });
}
for (let i = 0; i < sciany; i++) {
  threeFizWorld.addBox({
    mesh: new THREE.Mesh(wallGeo, flMat),
    isStatic: true,
  });
}
threeFizWorld.spheres.forEach((sphere, idx) => {
  sphere.position.set(
    Math.random() * 50 - 10,
    11 * idx + 100,
    Math.random() * 50 - 10
  );
});
threeFizWorld.boxes.forEach((box, idx) => {
  if (!box.isStatic) {
    box.position.set(
      Math.random() * 50 - 10,
      11 * idx + 100,
      Math.random() * 50 - 10
    );
  }
});
let grabber = new Grabber({
  renderer: renderer,
  scene: scene,
  camera: camera,
  cameraControls: controls,
  objectsToGrab: threeFizWorld.spheres,
});

//scenario
let radius = 200;
const tiltAngleIncrement = 90 / sciany;
threeFizWorld.boxes.forEach((box, idx) => {
  if (box.isStatic) {
    const angle = (idx / sciany) * Math.PI * 2;
    const x = 0 + Math.cos(angle) * radius;
    const z = 0 + Math.sin(angle) * radius;
    box.position.set(x, 25, z);
    const wallDirection = new THREE.Vector3().subVectors(
      new THREE.Vector3(0, 50, 0),
      box.position
    );
    box.rotation.y = Math.atan2(wallDirection.x, wallDirection.z);
  }
});

threeFizWorld.addBox({
  mesh: new THREE.Mesh(flGeo, flMat),
  mass: 10,
  restitution: 0.2,
  isStatic: true,
});

threeFizWorld.init();
scene.add(light);
camera.position.set(0, 150, 500);
light.position.set(50, 2050, 50);

function loopObj() {
  threeFizWorld.spheres.forEach((sphere, idx) => {
    if (sphere.position.y < -1000) {
      sphere.position.set(
        Math.random() * 50 - 10,
        11 * idx + 100,
        Math.random() * 50 - 10
      );
      sphere.velocity.set(0, 0, 0);
    }
  });
  threeFizWorld.boxes.forEach((box, idx) => {
    if (box.position.y < -1000) {
      box.position.set(
        Math.random() * 50 - 10,
        11 * idx + 100,
        Math.random() * 50 - 10
      );
      box.velocity.set(0, 0, 0);
      box.rotation.set(0, 0, 0);
    }
  });
}

//Debug

const stats = new Stats();
stats.dom.style.position = "absolute";
stats.dom.style.top = "0px";
document.body.appendChild(stats.dom);

controls.update();
const loop = () => {
  threeFizWorld.update();
  controls.update();
  grabber.update();
  stats.update();
  renderer.render(scene, camera);
  loopObj();
  requestAnimationFrame(loop);
};
handleResize();
loop();
window.addEventListener("resize", handleResize);
