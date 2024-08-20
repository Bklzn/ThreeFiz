import * as THREE from "three";
import ThreeFiz from "../ThreeFiz/ThreeFiz";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

//init
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.01,
  10000
);
let renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
let controls = new OrbitControls(camera, renderer.domElement);
renderer.setSize(window.innerHeight, window.innerWidth);
document.body.appendChild(renderer.domElement);

const handleResize = () => {
  const { innerWidth, innerHeight } = window;
  renderer.setSize(innerWidth, innerHeight - 100);
  camera.aspect = innerWidth / (innerHeight - 100);
  camera.updateProjectionMatrix();
};

//objects
let boxGeo = new THREE.BoxGeometry(20, 20, 20);
let boxGeo2 = new THREE.BoxGeometry(20, 20, 20);
let boxMat = new THREE.MeshPhongMaterial({ color: 0xff0000, wireframe: true });
let boxMat2 = new THREE.MeshPhongMaterial({ color: 0x0000ff, wireframe: true });

const light = new THREE.PointLight(0xffffff, 30, 0, 0.5);
const helplight = new THREE.PointLightHelper(light);

//Scene
const threeFizWorld = new ThreeFiz(scene);

threeFizWorld.addBox({ mesh: new THREE.Mesh(boxGeo, boxMat), mass: 100 });
threeFizWorld.addBox({
  mesh: new THREE.Mesh(boxGeo2, boxMat2),
  mass: 100,
  isStatic: true,
});
threeFizWorld.init();

scene.add(light, helplight);
camera.position.set(25, 20, 75);
light.position.set(50, 150, 50);

//Debug

const stats = new Stats();
stats.dom.style.position = "absolute";
stats.dom.style.top = "0px";
document.body.appendChild(stats.dom);

const gui = new dat.GUI();
const box1 = gui.addFolder("box1");
const box2 = gui.addFolder("box2");
// gui.add(threeFizWorld.spheres[0].collider.center,"y",0,500,.01).name('sphere y');
box1.add(threeFizWorld.boxes[0].position, "x", -50, 50, 0.001);
box1.add(threeFizWorld.boxes[0].position, "y", -50, 50, 0.001);
box1
  .add(threeFizWorld.boxes[0].mesh.rotation, "z", -Math.PI, Math.PI, 0.0001)
  .name("r z");

box2.add(threeFizWorld.boxes[1].velocity, "x", -500, 500, 0.01);
box2.add(threeFizWorld.boxes[1].velocity, "y", -500, 500, 0.01);
box2.add(threeFizWorld.boxes[1].velocity, "z", -500, 500, 0.01);
box2
  .add(threeFizWorld.boxes[1].rotation, "x", -Math.PI, Math.PI, 0.0001)
  .name("r x");
box2
  .add(threeFizWorld.boxes[1].rotation, "y", -Math.PI, Math.PI, 0.0001)
  .name("r y");
box2
  .add(threeFizWorld.boxes[1].rotation, "z", -Math.PI, Math.PI, 0.0001)
  .name("r z");
document.body.appendChild(document.createElement("p"));
document.body.appendChild(document.createElement("p"));

//scenario

threeFizWorld.boxes[0].rotation.z = 0;
threeFizWorld.boxes[0].rotation.y = 0.5;
threeFizWorld.boxes[0].rotation.x = 0;

threeFizWorld.boxes[0].position.set(0, 30, 0);
threeFizWorld.boxes[1].position.set(0, 0, 0);

threeFizWorld.boxes[0].velocity.set(0, 0, 0);
threeFizWorld.boxes[0].rotationVelocity.set(0, 0, 0);
threeFizWorld.boxes[0].velocity.set(0, -100, 0);
if (threeFizWorld.GRAVITY instanceof THREE.Vector3)
  threeFizWorld.GRAVITY.set(0, 0, 0);
function loopSimulation() {
  let box1 = threeFizWorld.boxes[0].position;
  let box2 = threeFizWorld.boxes[1].position;
  if (
    Math.abs(box1.x) > 200 ||
    Math.abs(box1.y) > 200 ||
    Math.abs(box1.z) > 200 ||
    Math.abs(box2.x) > 200 ||
    Math.abs(box2.x) > 200 ||
    Math.abs(box2.x) > 200
  ) {
    threeFizWorld.boxes[0].position.set(0, 45, 0);
    threeFizWorld.boxes[1].position.set(0, 0, 0);

    threeFizWorld.boxes[0].velocity.set(0, 0, 0);
    threeFizWorld.boxes[0].rotationVelocity.set(0, 0, 0);
    threeFizWorld.boxes[1].velocity.set(0, 0, 0);
    threeFizWorld.boxes[1].rotationVelocity.set(0, 0, 0);
  }
}

controls.update();
const loop = () => {
  threeFizWorld.update();
  document.getElementsByTagName("p")[0].innerHTML = `red: 
                x${threeFizWorld.boxes[0].collider.center.x.toFixed(2)} 
                y${threeFizWorld.boxes[0].collider.center.y.toFixed(2)} 
                z${threeFizWorld.boxes[0].collider.center.z.toFixed(2)}
                <br>V: (
                    x${threeFizWorld.boxes[0].velocity.x.toFixed(2)} 
                    y${threeFizWorld.boxes[0].velocity.y.toFixed(2)} 
                    z${threeFizWorld.boxes[0].velocity.z.toFixed(2)}
                )
                `;
  document.getElementsByTagName("p")[1].innerHTML = `green: 
                x${threeFizWorld.boxes[1].collider.center.x.toFixed(2)} 
                y${threeFizWorld.boxes[1].collider.center.y.toFixed(2)} 
                z${threeFizWorld.boxes[1].collider.center.z.toFixed(2)} 
                <br>V: (
                    x${threeFizWorld.boxes[1].velocity.x.toFixed(2)} 
                    y${threeFizWorld.boxes[1].velocity.y.toFixed(2)} 
                    z${threeFizWorld.boxes[1].velocity.z.toFixed(2)}
                )
                `;
  controls.update();
  stats.update();
  renderer.render(scene, camera);
  loopSimulation();
  requestAnimationFrame(loop);
};
handleResize();
loop();
window.addEventListener("resize", handleResize);
