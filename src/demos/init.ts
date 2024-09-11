import {
  Color,
  ColorRepresentation,
  DataTexture,
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

const createCheckerboardTexture = (
  width = 8,
  height = 8,
  c1_string: ColorRepresentation = "hsl(0, 100%, 0%)",
  c2_string: ColorRepresentation = "hsl(0, 100%, 100%)"
) => {
  const size = width * height;
  const data = new Uint8Array(4 * size);

  const c1 = new Color(c1_string);
  const c2 = new Color(c2_string);

  for (let i = 0; i < size; i++) {
    const stride = i * 4;
    const x = i % width;
    const y = Math.floor(i / width);
    const isColor1 = (x + y) % 2 == 0;

    const color = isColor1 ? c1 : c2;

    data[stride] = color.r * 255;
    data[stride + 1] = color.g * 255;
    data[stride + 2] = color.b * 255;
    data[stride + 3] = 255;
  }
  const texture = new DataTexture(data, width, height);
  texture.needsUpdate = true;
  return texture;
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

export { scene, camera, renderer, controls, createCheckerboardTexture };
