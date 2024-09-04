import * as THREE from "three";
import ThreeFiz from "../ThreeFiz/ThreeFiz";
import * as dat from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { camera, controls, handleResize, renderer, scene } from "./init";

camera.position.set(0, 50, 100);

//objects
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const boxMat = new THREE.MeshPhongMaterial({
  color: new THREE.Color("hsl(200, 100%, 80%)"),
  transparent: true,
  opacity: 0.5,
});
const box = new THREE.Mesh(boxGeo, boxMat);
const floorGeo = new THREE.BoxGeometry(500, 5, 500);
const floorMat = new THREE.MeshPhongMaterial({
  color: new THREE.Color("hsl(0, 100%, 80%)"),
  transparent: true,
  opacity: 0.5,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
//threeFiz
const threeFiz = new ThreeFiz({ scene });
for (let i = 0; i < 10; i++) {
  const random = Math.random() * 100 - 50;
  threeFiz.addBox({
    mesh: box.clone(),
    position: new THREE.Vector3(random - 1, random + 100, random - 3),
    velocity: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),
    restitution: 0.5,
  });
}
threeFiz.addBox({
  mesh: floor,
  restitution: 0.5,
  isStatic: true,
});
threeFiz.init();

box.castShadow = true;
box.receiveShadow = true;
floor.receiveShadow = true;

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
  } else {
    threeFiz.onCollision = () => {
      threeFiz.resume();
    };
    threeFiz.resume();
  }
};
onCollisionInit(buttons.pauseOnCollision);
const box1F = threeFiz.objects[0];
const gui = new dat.GUI();
const gui_rotation = gui.addFolder("Angular velocity");
const gui_position = gui.addFolder("Velocity");
gui_rotation.add(box1F.getAngularVelocity(), "x", -5, 5).step(0.001);
gui_rotation.add(box1F.getAngularVelocity(), "y", -5, 5).step(0.001);
gui_rotation.add(box1F.getAngularVelocity(), "z", -5, 5).step(0.001);
gui_position.add(box1F.getVelocity(), "x", -10, 10).step(0.001);
gui_position.add(box1F.getVelocity(), "y", -10, 10).step(0.001);
gui_position.add(box1F.getVelocity(), "z", -10, 10).step(0.001);
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
handleResize();
loop();
window.addEventListener("resize", handleResize);
