import * as THREE from "three";
import ThreeFiz from "../ThreeFiz/ThreeFiz";
import * as dat from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { camera, controls, handleResize, renderer, scene } from "./init";
import { Vector3 } from "three";

camera.position.set(0, 20, 50);

//objects
const boxGeo = new THREE.BoxGeometry(20, 20, 20);
const boxMat = new THREE.MeshPhongMaterial({
  color: new THREE.Color("hsl(200, 100%, 80%)"),
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide,
});
const box1 = new THREE.Mesh(boxGeo, boxMat);
const boxMat2 = new THREE.MeshPhongMaterial({
  color: new THREE.Color("hsl(0, 100%, 80%)"),
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide,
});
const box2 = new THREE.Mesh(boxGeo, boxMat2);

//threeFiz
const threeFiz = new ThreeFiz({ scene: scene, gravity: new Vector3(0, 0, 0) });
threeFiz.addBox({
  mesh: box1,
  position: new THREE.Vector3(15, 0, 0),
  velocity: new THREE.Vector3(-30, 0, 0),
  restitution: 1,
});
threeFiz.addBox({
  mesh: box2,
  position: new THREE.Vector3(-15, 0, 0),
  // rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 1.1, 0.5)),
  restitution: 1,
});
threeFiz.init();

box1.castShadow = true;
// box1.receiveShadow = true;
box2.castShadow = true;
// box2.receiveShadow = true;

//Debug
const stats = new Stats();
stats.dom.style.setProperty("position", "absolute");
stats.dom.style.setProperty("top", "0");

const buttons = {
  start: () => threeFiz.resume(),

  pause: () => (threeFiz.STOP = true),
};
const box1F = threeFiz.objects[0];
const gui = new dat.GUI();
const gui_rotation = gui.addFolder("Angular velocity");
const gui_position = gui.addFolder("Velocity");
gui_rotation.add(box1F.angularVelocity, "x", -5, 5).step(0.001);
gui_rotation.add(box1F.angularVelocity, "y", -5, 5).step(0.001);
gui_rotation.add(box1F.angularVelocity, "z", -5, 5).step(0.001);
gui_position.add(box1F.velocity, "x", -10, 10).step(0.001);
gui_position.add(box1F.velocity, "y", -10, 10).step(0.001);
gui_position.add(box1F.velocity, "z", -10, 10).step(0.001);
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
