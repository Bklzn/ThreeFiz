import * as THREE from "three";
import ThreeFiz from "../ThreeFiz/ThreeFiz";
import Grabber from "../ThreeFiz/Grabber";
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
let sphereGeo = new THREE.SphereGeometry(30);
let sphereGeo2 = new THREE.SphereGeometry(10);
let sphereMat = new THREE.MeshPhongMaterial({ color: 0x0000ff });
let sphereMat2 = new THREE.MeshPhongMaterial({ color: 0x00ff00 });

const light = new THREE.PointLight(0xffffff, 30, 0, 0.5);
const helplight = new THREE.PointLightHelper(light);

//Scene
const threeFizWorld = new ThreeFiz(scene);
let ilosc = 5;
threeFizWorld.addSphere({
  mesh: new THREE.Mesh(sphereGeo, sphereMat),
  mass: 10,
  restitution: 0.2,
  isStatic: true,
});
let staticObj = threeFizWorld.spheres[0];
for (let i = 0; i < ilosc; i++) {
  threeFizWorld.addSphere({
    mesh: new THREE.Mesh(sphereGeo2, sphereMat2),
    mass: 10,
    restitution: 0.9,
  });
  threeFizWorld.spheres[i + 1].position.set(
    Math.random() * 100 - 20,
    Math.random() * 100 - 20,
    Math.random() * 100 - 20
  );
}

threeFizWorld.GRAVITY = {
  radial: threeFizWorld.spheres[0].position,
  force: 10,
};
let grabber = new Grabber({
  renderer: renderer,
  scene: scene,
  camera: camera,
  cameraControls: controls,
  objectsToGrab: [
    threeFizWorld.spheres[0],
    threeFizWorld.spheres[1],
    threeFizWorld.spheres[2],
    threeFizWorld.spheres[3],
    threeFizWorld.spheres[4],
    threeFizWorld.spheres[5],
  ],
});
threeFizWorld.init();

scene.add(light, helplight);
camera.position.set(0, 50, 300);
light.position.set(50, 150, 50);

//Debug

const stats = new Stats();
stats.dom.style.position = "absolute";
stats.dom.style.top = "0px";
document.body.appendChild(stats.dom);

const gui = new dat.GUI();
let gravity = { force: threeFizWorld.GRAVITY.force };
gui.add(gravity, "force", 0, 50, 0.001).name("gravity");
// gui.add(threeFizWorld.boxes[0].position,"x",-50,50,.001).name('floor x');
// gui.add(threeFizWorld.boxes[0].rotation,'z',-Math.PI,Math.PI,.0001).name('floor rotate');

//scenario

function loopBall() {
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
}

controls.update();
const loop = () => {
  grabber.update();
  threeFizWorld.update();
  threeFizWorld.GRAVITY = {
    radial: staticObj.position,
    force: gravity.force,
  };
  controls.update();
  stats.update();
  renderer.render(scene, camera);
  loopBall();
  requestAnimationFrame(loop);
};
handleResize();
loop();
window.addEventListener("resize", handleResize);
