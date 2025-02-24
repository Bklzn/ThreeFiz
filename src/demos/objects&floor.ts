import * as THREE from "three";
import * as dat from "three/examples/jsm/libs/lil-gui.module.min.js";
import ThreeFiz from "../ThreeFiz/ThreeFiz";
import Stats from "three/examples/jsm/libs/stats.module.js";
import {
  camera,
  controls,
  renderer,
  scene,
  createCheckerboardTexture,
} from "./init";

camera.position.set(0, 100, 200);

//floor
const floorGeo = new THREE.BoxGeometry(200, 5, 200);
const floorEdgeGeo = new THREE.BoxGeometry(200, 10, 5);
const floorMat = new THREE.MeshPhongMaterial({
  color: new THREE.Color("hsl(200, 100%, 80%)"),
});
const floor = new THREE.Mesh(floorGeo, floorMat);
const floorEdge = new THREE.Mesh(floorEdgeGeo, floorMat);

floor.receiveShadow = true;
floorEdge.castShadow = true;
floorEdge.receiveShadow = true;

//threeFiz
const threeFiz = new ThreeFiz({ scene });
threeFiz.addBox({ mesh: floor, isStatic: true });

for (let i = 0; i < 4; i++) {
  const pos = 100 - 5 / 2;
  const x = Math.sin((Math.PI * i) / 2);
  const z = Math.cos((Math.PI * i) / 2);
  threeFiz.addBox({
    mesh: floorEdge.clone(),
    position: new THREE.Vector3(pos * x, 7.5, -pos * z),
    rotation: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, (x * Math.PI) / 2, 0)
    ),
    isStatic: true,
  });
}

let boxCount = 100;
let sphereCount = 100;

for (let i = 0; i < boxCount; i++) {
  const w = Math.random() * 10 + 5;
  const h = Math.random() * 10 + 5;
  const d = Math.random() * 10 + 5;
  const boxGeo = new THREE.BoxGeometry(w, h, d);
  const boxMat = new THREE.MeshPhongMaterial({
    color: new THREE.Color(`hsl(${Math.random() * 360}, 100%, 80%)`),
  });
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.castShadow = true;
  box.receiveShadow = true;
  threeFiz.addBox({
    mesh: box,
    position: new THREE.Vector3(Math.random() + -20, 50 + h * i, Math.random()),
  });
}
for (let i = 0; i < sphereCount; i++) {
  const r = Math.random() * 5 + 3;
  const sphereGeo = new THREE.SphereGeometry(r);
  const sphereMat = new THREE.MeshPhongMaterial({
    map: createCheckerboardTexture(
      8,
      8,
      `hsl(${Math.random() * 360}, 100%, 80%)`,
      `hsl(${Math.random() * 360}, 100%, 70%)`
    ),
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  threeFiz.addSphere({
    mesh: sphere,
    position: new THREE.Vector3(Math.random(), 10 + r * i, Math.random()),
  });
}

// threeFiz.objects.forEach((obj) => {
//   obj.debug = new Debug(obj);
//   obj.debug.showAABB = { color: new THREE.Color("red") };
// });

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
