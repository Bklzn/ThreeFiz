import * as THREE from "three";
import ThreeFiz from "./ThreeFiz/ThreeFiz";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Grabber from "./ThreeFiz/Grabber";
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
  antiailas: true,
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

// const loader = new GLTFLoader();
// const load = (path) =>{
//     var obj;
//     loader.load(path, function(gltf){
//         obj= gltf.scene;
//         obj.name=path;
//         obj.position.set(0,-100,100)
//         obj.scale.set(200,200,200)
//         threeFizWorld.setWorld(obj);
//         scene.add(obj)
//         console.log(obj);
//         console.log(threeFizWorld.world)
//         // threeFizWorld.octreeHelper({})
//     },function(error){
//         // if(error) console.error(error);
//     });
// }
//objects
let flGeo = new THREE.BoxGeometry(200, 1, 100);
let flMat = new THREE.MeshPhongMaterial({ color: 0xff0000, wireframe: true });
let boxGeo = new THREE.BoxGeometry(20, 20, 20);
let boxMat = new THREE.MeshPhongMaterial({ color: 0x0000ff, wireframe: false });

const light = new THREE.PointLight(0xffffff, 1);
const helplight = new THREE.PointLightHelper(light);

//Scene
const threeFizWorld = new ThreeFiz(scene);
threeFizWorld.addBox({
  mesh: new THREE.Mesh(flGeo, flMat),
  mass: 100,
  restitutuion: 0.2,
  isStatic: true,
});
// threeFizWorld.GRAVITY.set(0,-1,0)
let ilosc = 1;
for (let i = 0; i < ilosc; i++) {
  threeFizWorld.addBox({
    mesh: new THREE.Mesh(boxGeo.clone(), boxMat.clone()),
    mass: 10,
    restitutuion: 0.2,
  });
}
// load('./models/bowl.glb')
// load('./models/collision-world.glb')
// threeFizWorld.setWorld(threeFizWorld.boxes[1])
let world = threeFizWorld.boxes[0];
let grabber = new Grabber({
  renderer: renderer,
  scene: scene,
  camera: camera,
  cameraControls: controls,
  objectsToGrab: [
    threeFizWorld.boxes[1],
    // threeFizWorld.boxes[2],
  ],
});
threeFizWorld.init();

// world.rotation.z = .1
threeFizWorld.boxes.forEach((box, idx) => {
  box.position.set(Math.random() * 50 - 10, 150, Math.random() * 50 - 10);
});
world.position.set(0, 0, 0);
scene.add(
  // new THREE.BoxHelper(threeFizWorld.boxes[0].collider, 0xffff00),
  light,
  helplight
);
camera.position.set(0, 50, 300);
light.position.set(50, 150, 50);

//Debug

const stats = new Stats();
stats.domElement.style.position = "absolute";
stats.domElement.style.top = "0px";
document.body.appendChild(stats.domElement);

const gui = new dat.GUI();
gui.add(world.position, "y", -50, 50, 0.001).name("floor y");
gui.add(world.position, "x", -50, 50, 0.001).name("floor x");
gui.add(world.rotation, "z", -Math.PI, Math.PI, 0.0001).name("floor rotate z");
gui.add(world.rotation, "x", -Math.PI, Math.PI, 0.0001).name("floor rotate x");
document.body.appendChild(document.createElement("p"));
document.body.appendChild(document.createElement("p"));

//scenario
threeFizWorld.boxes[0].rotation.z = 0.5;
threeFizWorld.boxes[0].rotation.y = 0.5;
// threeFizWorld.boxes[1].rotation.x = .1
// threeFizWorld.boxes[0].rotation.y = -.9

function loopBox() {
  threeFizWorld.boxes.forEach((box, idx) => {
    if (box.position.y < -1000) {
      box.position.set(0, 150, 0);
      box.velocity.set(0, 0, 0);
      box.rotationVelocity.set(0, 0, 0);
    }
  });
}

controls.update();
const loop = () => {
  document.getElementsByTagName("p")[0].innerHTML = `blue: 
            x${threeFizWorld.boxes[0].collider.center.x.toFixed(2)} 
            y${threeFizWorld.boxes[0].collider.center.y.toFixed(2)} 
            z${threeFizWorld.boxes[0].collider.center.z.toFixed(2)}
            <br>V: (
                x${threeFizWorld.boxes[0].velocity.x.toFixed(2)} 
                y${threeFizWorld.boxes[0].velocity.y.toFixed(2)} 
                z${threeFizWorld.boxes[0].velocity.z.toFixed(2)}
            )
            <br>R: (
                x${threeFizWorld.boxes[0].rotationVelocity.x.toFixed(2)} 
                y${threeFizWorld.boxes[0].rotationVelocity.y.toFixed(2)} 
                z${threeFizWorld.boxes[0].rotationVelocity.z.toFixed(2)}
            )
            `;
  document.getElementsByTagName("p")[1].innerHTML = `red: 
            x${threeFizWorld.boxes[1].collider.center.x.toFixed(2)} 
            y${threeFizWorld.boxes[1].collider.center.y.toFixed(2)} 
            z${threeFizWorld.boxes[1].collider.center.z.toFixed(2)} 
            <br>V: (
                x${threeFizWorld.boxes[1].velocity.x.toFixed(2)} 
                y${threeFizWorld.boxes[1].velocity.y.toFixed(2)} 
                z${threeFizWorld.boxes[1].velocity.z.toFixed(2)}
            )
            `;
  grabber.update();
  threeFizWorld.update();
  controls.update();
  stats.update();
  renderer.render(scene, camera);
  loopBox();
  requestAnimationFrame(loop);
};
handleResize();
loop();
window.addEventListener("mousemove", grabber.controls.bind(grabber));
window.addEventListener("mousedown", grabber.controls.bind(grabber));
window.addEventListener("mouseup", grabber.controls.bind(grabber));
window.addEventListener("resize", handleResize);
