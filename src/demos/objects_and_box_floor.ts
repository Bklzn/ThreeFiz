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
let flMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
let sphereGeo = new THREE.SphereGeometry(10);
let sphereMat = new THREE.MeshPhongMaterial({ color: 0x0000ff });
let boxGeo = new THREE.BoxGeometry(20, 20, 20);
let boxMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });

const light = new THREE.PointLight(0xffffff, 30, 0, 0.5);

//Scene
const threeFizWorld = new ThreeFiz(scene);
let ilosc = 100;
for (let i = 0; i < ilosc / 2; i++) {
  threeFizWorld.addSphere({ mesh: new THREE.Mesh(sphereGeo, sphereMat) });
  threeFizWorld.addBox({ mesh: new THREE.Mesh(boxGeo, boxMat) });
}
threeFizWorld.spheres.forEach((sphere, idx) => {
  sphere.position.set(
    Math.random() * 50 - 10,
    Math.random() * 50 - 10 + 100,
    Math.random() * 50 - 10
  );
});
threeFizWorld.boxes.forEach((box, idx) => {
  box.position.set(
    Math.random() * 50 - 10,
    Math.random() * 50 - 10 + 100,
    Math.random() * 50 - 10
  );
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
light.position.set(50, 150, 50);

//Debug

const stats = new Stats();
stats.dom.style.position = "absolute";
stats.dom.style.top = "0px";
document.body.appendChild(stats.dom);

const gui = new dat.GUI();
gui.add(threeFizWorld.boxes[0].position, "y", -50, 50, 0.001).name("floor y");
gui.add(threeFizWorld.boxes[0].position, "x", -50, 50, 0.001).name("floor x");
gui
  .add(threeFizWorld.boxes[0].rotation, "z", -Math.PI, Math.PI, 0.0001)
  .name("floor rotate");

//scenario

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

controls.update();
const loop = () => {
  threeFizWorld.update();
  controls.update();
  stats.update();
  renderer.render(scene, camera);
  loopObj();
  requestAnimationFrame(loop);
};
handleResize();
loop();
window.addEventListener("resize", handleResize);
