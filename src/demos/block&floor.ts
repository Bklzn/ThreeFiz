import * as THREE from "three";
import ThreeFiz from "threefiz";
import * as dat from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { camera, controls, renderer, scene } from "./init";

camera.position.set(0, 100, 200);

//objects
const boxGeo = new THREE.BoxGeometry(10, 10, 10);
const boxMat = new THREE.MeshPhongMaterial({
  color: new THREE.Color("hsl(200, 100%, 80%)"),
});
const box = new THREE.Mesh(boxGeo, boxMat);
const floorGeo = new THREE.BoxGeometry(200, 10, 200);
const floorMat = new THREE.MeshPhongMaterial({
  color: new THREE.Color("hsl(0, 100%, 80%)"),
});
const floor = new THREE.Mesh(floorGeo, floorMat);

box.castShadow = true;
box.receiveShadow = true;
floor.receiveShadow = true;

//threeFiz
const threeFiz = new ThreeFiz({ scene });
for (let i = 0; i < 10; i++) {
  const rP = new THREE.Vector3().random().multiplyScalar(50);
  const r = new THREE.Vector3().random();
  threeFiz.addBox({
    mesh: box.clone(),
    position: new THREE.Vector3(rP.x, 10 + rP.y, rP.z),
    velocity: new THREE.Vector3(0, 0, 0),
    angularVelocity: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Quaternion().setFromEuler(
      new THREE.Euler().setFromVector3(r)
    ),
    restitution: 0.5,
  });
}
threeFiz.addBox({
  mesh: floor,
  restitution: 0.5,
  isStatic: true,
});
threeFiz.init();

//Debug
const stats = new Stats();
stats.dom.style.setProperty("position", "absolute");
stats.dom.style.setProperty("top", "0");

const buttons = {
  pauseOnCollision: false,
  start: () => {
    threeFiz.resume();
  },
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
