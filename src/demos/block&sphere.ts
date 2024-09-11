import * as THREE from "three";
import ThreeFiz from "../ThreeFiz/ThreeFiz";
import * as dat from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import {
  camera,
  controls,
  renderer,
  scene,
  createCheckerboardTexture,
} from "./init";
import { Vector3 } from "three";

camera.position.set(0, 20, 100);

//objects
const sphereGeo = new THREE.SphereGeometry(10);
const sphereMat = new THREE.MeshPhongMaterial({
  map: createCheckerboardTexture(8, 5, "hsl(0, 50%, 60%)", "hsl(0, 50%, 80%)"),
  transparent: true,
  opacity: 0.5,
});
const sphere1 = new THREE.Mesh(sphereGeo, sphereMat);

const boxGeo = new THREE.BoxGeometry(15, 15, 15);
const boxMat = new THREE.MeshPhongMaterial({
  color: new THREE.Color("hsl(240, 50%, 80%)"),
  transparent: true,
  opacity: 0.5,
});
const box = new THREE.Mesh(boxGeo, boxMat);

//threeFiz
const threeFiz = new ThreeFiz({ scene: scene, gravity: new Vector3(0, 0, 0) });
threeFiz.addSphere({
  mesh: sphere1,
  position: new THREE.Vector3(-15, 0, 0),
});

threeFiz.addBox({
  mesh: box,
  position: new THREE.Vector3(15, 10, 5),
  velocity: new Vector3(-5, 0, 0),
});

threeFiz.init();

//Debug
const stats = new Stats();
stats.dom.style.setProperty("position", "absolute");
stats.dom.style.setProperty("top", "0");

const buttons = {
  pauseOnCollision: false,
  start: () => threeFiz.resume(),

  pause: () => threeFiz.pause(),
};
const onCollisionInit = (value: boolean) => {
  if (value) {
    threeFiz.onCollision = () => {
      threeFiz.pause();
    };
    threeFiz.pause();
  } else {
    threeFiz.onCollision = () => {
      threeFiz.resume();
    };
    threeFiz.resume();
  }
};
onCollisionInit(buttons.pauseOnCollision);
const gui = new dat.GUI();
gui.add(buttons, "pauseOnCollision").onChange(onCollisionInit);
gui.add(buttons, "start");
gui.add(buttons, "pause");

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
