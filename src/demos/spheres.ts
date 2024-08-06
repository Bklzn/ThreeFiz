import * as THREE from "three";
import ThreeFiz from "../ThreeFiz/ThreeFiz";
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
let sphereGeo = new THREE.SphereGeometry(10);
let sphereGeo2 = new THREE.SphereGeometry(10);
let sphereMat = new THREE.MeshPhongMaterial({ color: 0x0000ff });
let sphereMat2 = new THREE.MeshPhongMaterial({ color: 0x00ff00 });

const light = new THREE.PointLight(0xffffff, 1);
const helplight = new THREE.PointLightHelper(light);

//Scene
const threeFizWorld = new ThreeFiz(scene);
threeFizWorld.addSphere({
  mesh: new THREE.Mesh(sphereGeo, sphereMat),
  mass: 20,
  restitution: 0.2,
  isStatic: false,
});
threeFizWorld.addSphere({
  mesh: new THREE.Mesh(sphereGeo2, sphereMat2),
  mass: 10,
  restitution: 0.2,
  isStatic: false,
});
threeFizWorld.spheres[0].position.set(-80, 5, 0);
threeFizWorld.spheres[1].position.set(80, 0, 0);
if (threeFizWorld.GRAVITY instanceof THREE.Vector3)
  threeFizWorld.GRAVITY.set(0, 0, 0);
threeFizWorld.init();
threeFizWorld.spheres[0].velocity.set(800, 0, 0);
threeFizWorld.spheres[1].velocity.set(-800, 0, 0);

scene.add(light, helplight);
camera.position.set(0, 50, 300);
light.position.set(50, 150, 50);

//Debug

const stats = new Stats();
stats.dom.style.position = "absolute";
stats.dom.style.top = "0px";
document.body.appendChild(stats.dom);

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
  threeFizWorld.update();
  controls.update();
  stats.update();
  renderer.render(scene, camera);
  loopBall();
  requestAnimationFrame(loop);
};
handleResize();
loop();
window.addEventListener("resize", handleResize);
