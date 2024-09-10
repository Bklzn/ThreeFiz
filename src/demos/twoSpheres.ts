import * as THREE from "three";
import ThreeFiz from "../ThreeFiz/ThreeFiz";
import * as dat from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { camera, controls, renderer, scene } from "./init";
import { Vector3 } from "three";

camera.position.set(0, 20, 100);

//objects
const sphereGeo = new THREE.SphereGeometry(10);
const sphereMat = new THREE.MeshPhongMaterial({
  color: new THREE.Color("hsl(200, 100%, 80%)"),
});
const sphere1 = new THREE.Mesh(sphereGeo, sphereMat);
const sphereMat2 = new THREE.MeshPhongMaterial({
  color: new THREE.Color("hsl(0, 100%, 80%)"),
});
const sphere2 = new THREE.Mesh(sphereGeo, sphereMat2);

//threeFiz
const threeFiz = new ThreeFiz({ scene: scene, gravity: new Vector3(0, 0, 0) });
threeFiz.addSphere({
  mesh: sphere1,
  position: new THREE.Vector3(-15, 0, 0),
});
threeFiz.addSphere({
  mesh: sphere2,
  position: new THREE.Vector3(25, 15, 0),
  velocity: new Vector3(-10, 0, 0),
});

threeFiz.init();
//Debug
const stats = new Stats();
stats.dom.style.setProperty("position", "absolute");
stats.dom.style.setProperty("top", "0");

const buttons = {
  start: () => threeFiz.resume(),

  pause: () => threeFiz.pause(),
};
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
