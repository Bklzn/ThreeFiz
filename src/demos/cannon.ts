import * as THREE from "three";
import ThreeFiz from "../ThreeFiz/ThreeFiz";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "three/examples/jsm/libs/lil-gui.module.min.js";
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
let flGeo = new THREE.BoxGeometry(1000, 1, 1000);
let flMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
let sphereGeo = new THREE.SphereGeometry(10);
let sphereMat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
let boxGeo = new THREE.BoxGeometry(20, 20, 20);
let boxMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

const light = new THREE.PointLight(0xffffff, 30, 0, 0.5);

//Scene
const threeFizWorld = new ThreeFiz(scene);
let wallH = 10;
let wallW = 10;
for (let i = 0; i < wallH * wallW; i++) {
  threeFizWorld.addBox({ mesh: new THREE.Mesh(boxGeo, boxMat) });
}
for (let i = 0; i < wallH; i++) {
  threeFizWorld.addSphere({ mesh: new THREE.Mesh(sphereGeo, sphereMat) });
}
threeFizWorld.boxes.forEach((box, idx) => {
  if (!box.isStatic) {
    box.position.set(idx * 30, -10000, idx * 30);
  }
});
threeFizWorld.spheres.forEach((sphere, idx) => {
  sphere.position.set(idx * 30, -10000, idx * 30);
});

threeFizWorld.addBox({
  mesh: new THREE.Mesh(flGeo, flMat),
  mass: 10,
  restitution: 0.2,
  isStatic: true,
});
if (threeFizWorld.GRAVITY instanceof THREE.Vector3)
  threeFizWorld.GRAVITY.set(0, -1, 0);
threeFizWorld.init();
scene.add(light);
camera.position.set(0, 150, 500);
light.position.set(50, 300, 50);

//Scenario
let options = {
  wallW: 4,
  wallH: 5,
  power: 7000,
  set: () => {
    threeFizWorld.boxes.forEach((box, idx) => {
      if (!box.isStatic) {
        box.position.set(idx * 30, -10000, idx * 30);
      }
    });
    let i = 0,
      j = 0;
    threeFizWorld.boxes.every((box, idx) => {
      if (idx == options.wallH * options.wallW) {
        return false;
      }
      if (!box.isStatic) {
        box.velocity.set(0, 0, 0);
        box.rotation.set(0, 0, 0);
        box.rotationVelocity.set(0, 0, 0);
        box.position.set(20 * j - (options.wallW / 2) * 20, 20 * i + 10, -20);
        j++;
        if (j >= options.wallW) {
          j = 0;
          i++;
        }
      }
      return true;
    });
  },
};
let sphereCount = 0;
document.addEventListener("click", (e) => {
  let x = e.clientX;
  let y = e.clientY;
  let rect = renderer.domElement.getBoundingClientRect();
  let mousePos = new THREE.Vector2();
  let raycaster = new THREE.Raycaster();
  mousePos.x = ((x - rect.left) / rect.width) * 2 - 1;
  mousePos.y = -((y - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mousePos, camera);
  threeFizWorld.spheres[sphereCount].position
    .copy(camera.position)
    .addScaledVector(raycaster.ray.direction, 100);
  threeFizWorld.spheres[sphereCount].velocity
    .set(0, 0, 0)
    .addScaledVector(raycaster.ray.direction, options.power);
  sphereCount++;
  if (sphereCount >= 10) sphereCount = 0;
});
options.set();

//Debug
const stats = new Stats();
stats.dom.style.position = "absolute";
stats.dom.style.top = "0px";
document.body.appendChild(stats.dom);

const gui = new dat.GUI();
gui.add(options, "wallH", 1, 10, 1).name("wall height");
gui.add(options, "wallW", 1, 10, 1).name("wall width");
gui.add(options, "power", 1000, 40000, 500).name("ball power");
gui.add(options, "set");

controls.update();
const loop = () => {
  threeFizWorld.update();
  controls.update();
  stats.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
};
handleResize();
loop();
window.addEventListener("resize", handleResize);
