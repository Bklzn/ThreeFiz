import * as THREE from "three";
import ThreeFiz from "../ThreeFiz/ThreeFiz";
import Stats from "three/examples/jsm/libs/stats.module.js";
import * as dat from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
  camera,
  controls,
  renderer,
  scene,
  createCheckerboardTexture,
} from "./init";
import Cuboid from "../ThreeFiz/Cuboid";

camera.position.set(0, 100, 250);

const floorRestitution = 0.5;
const floorFriction = 0.5;
const objectsRestitution = 0.5;
const objectsFriction = 0.5;

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
const threeFiz = new ThreeFiz({ scene, spartialGridCellSize: 40 });
threeFiz.addBox({
  mesh: floor,
  isStatic: true,
  restitution: floorRestitution,
  friction: floorFriction,
});

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
    restitution: floorRestitution,
    friction: floorFriction,
  });
}

let boxCount = 0;
let sphereCount = 1;

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
    restitution: objectsRestitution,
    friction: objectsFriction,
  });
}
let prevY = 0;
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
    position: new THREE.Vector3(
      Math.random() + 20,
      10 + prevY + r,
      Math.random()
    ),
    // velocity: new THREE.Vector3(0, -1000, 0),
    restitution: objectsRestitution,
    friction: objectsFriction,
  });
  prevY = prevY + 2 * r + 5;
}

// threeFiz.objects.sort((a, b) => (a ? -1 : 1));

// threeFiz.objects.forEach((o) => {
//   o.debug.showAABB = { color: new THREE.Color("yellow") };
// });

threeFiz.init();

//Debug
const stats = new Stats();
stats.dom.style.setProperty("position", "absolute");
stats.dom.style.setProperty("top", "0");

// threeFiz.showGrid();

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
  }
};
onCollisionInit(buttons.pauseOnCollision);
const ground = threeFiz.objects[0] as Cuboid;
const gui = new dat.GUI();
gui.add(buttons, "pauseOnCollision").onChange(onCollisionInit);
gui.add(ground.position, "y", -100, 100, 1);
gui.add(buttons, "start");
gui.add(buttons, "pause");

let frames = 0,
  prevTime = performance.now();
const pauseOnLowFPS = (fps: number) => {
  if (fps < 10) {
    console.log(fps);
    threeFiz.pause();
  }
};

document.body.appendChild(stats.dom);
controls.update();
const loop = () => {
  frames++;
  const time = performance.now();
  if (time >= prevTime + 1000) {
    pauseOnLowFPS(frames);
    frames = 0;
    prevTime = time;
  }
  controls.update();
  stats.update();
  threeFiz.step();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
};
loop();
