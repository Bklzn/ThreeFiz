import * as THREE from "three";
import * as dat from "three/examples/jsm/libs/lil-gui.module.min.js";
import ThreeFiz from "threefiz";
import Stats from "three/examples/jsm/libs/stats.module.js";
import {
  camera,
  controls,
  createCheckerboardTexture,
  renderer,
  scene,
} from "./init";

camera.position.set(0, 100, 200);

//threeFiz
const threeFiz = new ThreeFiz({ scene });

const floorHeight = 5;
//floor
const floorGeo = new THREE.BoxGeometry(200, floorHeight, 200);
const floorEdgeGeo = new THREE.BoxGeometry(200, 10, 5);
const floorMat = new THREE.MeshPhongMaterial({
  color: new THREE.Color("hsl(200, 100%, 80%)"),
});
const floor = new THREE.Mesh(floorGeo, floorMat);
const floorEdge = new THREE.Mesh(floorEdgeGeo, floorMat);

floor.receiveShadow = true;
floorEdge.castShadow = true;
floorEdge.receiveShadow = true;
threeFiz.addBox({ mesh: floor, isStatic: true });

const settings = {
  boxStructureSize: {
    w: 10,
    h: 10,
    d: 1,
  },
  boxSize: {
    w: 10,
    h: 5,
    d: 5,
  },
  randomColor: false,
};

const ballGeo = new THREE.SphereGeometry(3);
const ballMat = new THREE.MeshPhongMaterial({
  map: createCheckerboardTexture(8, 8, `hsl(0, 100%, 0%)`, `hsl(0, 0%, 20%)`),
});
const ballMesh = new THREE.Mesh(ballGeo, ballMat);
ballMesh.castShadow = true;
ballMesh.receiveShadow = true;
let mousePos = new THREE.Vector2();
let raycaster = new THREE.Raycaster();

window.addEventListener("click", (e) => {
  let rect = renderer.domElement.getBoundingClientRect();
  mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mousePos, camera);
  threeFiz.addSphere({
    mesh: ballMesh.clone(),
    position: new THREE.Vector3()
      .copy(camera.position)
      .addScaledVector(raycaster.ray.direction, 10),
    velocity: new THREE.Vector3().addScaledVector(raycaster.ray.direction, 100),
  });
});

const { boxStructureSize, boxSize, randomColor } = settings;
for (let i = 0; i < boxStructureSize.w; i++) {
  for (let j = 0; j < boxStructureSize.h; j++) {
    for (let k = 0; k < boxStructureSize.d; k++) {
      const { w, h, d } = boxSize;
      const boxGeo = new THREE.BoxGeometry(w, h, d);
      const boxMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(
          `hsl(${randomColor ? Math.random() * 360 : 0}, 100%, 80%)`
        ),
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.castShadow = true;
      box.receiveShadow = true;
      threeFiz.addBox({
        mesh: box,
        position: new THREE.Vector3(
          i * w - (boxStructureSize.w / 2) * w + w / 2,
          h / 2 + floorHeight / 2 + j * h,
          k * d - (boxStructureSize.d / 2) * d + d / 2
        ),
      });
    }
  }
}
threeFiz.init();

//Debug
const stats = new Stats();
stats.dom.style.setProperty("position", "absolute");
stats.dom.style.setProperty("top", "0");

const buttons = {
  pauseOnCollision: true,
  start: () => threeFiz.resume(),

  pause: () => threeFiz.pause(),
};
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
