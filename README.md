# ThreeFiz
Implementation of a physics engine based on the [Three.js](https://github.com/mrdoob/three.js) library.

### [Demo](https://bklzn.github.io/ThreeFiz/)

### Installation
- Copy content of ***three*** folder to the **main folder** of Three.js library

### Features
- Rigid body dynamics
- Collision detecion of OBB's objects
- Library presents 3 collision relations for now
  - sphere - sphere
  - OBB - OBB
  - OBB - sphere 

### Example
This example creates a three.js environment and then adds a perpendicular and a sphere. The Grabber object is used to move the object with the mouse.
```js
import * as THREE from 'three';
import { OrbitControls } from './threejs/examples/jsm/controls/OrbitControls.js';

import ThreeFiz from './threejs/ThreeFiz/ThreeFiz.js'
import Grabber from './threejs/THreeFiz/Grabber.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

let controls = new OrbitControls( camera, renderer.domElement );

const light = new THREE.PointLight(0xFFFFFF,1);

const geometry = new THREE.SphereGeometry(1);
const material = new THREE.MeshPhongMaterial( { color: 0x0000FF } );
const sphere = new THREE.Mesh( geometry, material );

const floorGeometry = new THREE.BoxGeometry(1000,0.1,1000);
const floorMaterial = new THREE.MeshPhongMaterial( { color: 0xFF0000 } );
const floor = new THREE.Mesh( floorGeometry, floorMaterial );
const physic = new ThreeFiz(scene)
physic.addSphere({
  mesh: sphere,
  mass: 10,
  restitution: 0.2,
  isStatic: false,
  })
  
physic.addBox({
  mesh: floor,
  mass: 10,
  restitution: 0.2,
  isStatic: true,
  })

let grabber = new Grabber({
  renderer: renderer, 
  scene: scene, 
  camera: camera, 
  cameraControls: controls,
  objectsToGrab: [
    physic.spheres[0]
  ]
})
physic.init()

physic.boxes[0].position.y = -3

scene.add(
  light,
  );

camera.position.z = 10
light.position.set(5,5,5);

let animate = () => {
  grabber.update()
  controls.update();
  physic.update()
  renderer.render( scene, camera );
  requestAnimationFrame(animate)
}

animate()
```
