import {
  DirectionalLight,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let scene = new Scene();
let camera = new PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  10000
);
let renderer = new WebGLRenderer({
  antialias: true,
  alpha: true,
});
let controls = new OrbitControls(camera, renderer.domElement);
renderer.setSize(window.innerHeight, window.innerWidth);
document.body.appendChild(renderer.domElement);
const handleResize = () => {
  const { innerWidth, innerHeight } = window;
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
};
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;

//scene
const sunlight = new DirectionalLight(0xffffff, 3);
sunlight.castShadow = true;
sunlight.shadow.mapSize.width = 1024;
sunlight.shadow.mapSize.height = 1024;
sunlight.shadow.camera.far = 150;
sunlight.shadow.camera.near = -130;
sunlight.shadow.camera.right = 100;
sunlight.shadow.camera.left = -100;
sunlight.shadow.camera.top = 100;
sunlight.shadow.camera.bottom = -100;

sunlight.position.set(10, 10, 10);

scene.add(sunlight);

handleResize();
window.addEventListener("resize", handleResize);

export { scene, camera, renderer, controls };
