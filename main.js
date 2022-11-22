import * as THREE from 'three';
import ThreeFiz from './ThreeFiz/ThreeFiz.js'
import { GLTFLoader } from './threejs/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './threejs/three/examples/jsm/controls/OrbitControls.js';
import * as dat from './threejs/three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from './threejs/three/examples/jsm/libs/stats.module.js';

//init
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(40,window.innerWidth/window.innerHeight,0.01,10000);
let renderer = new THREE.WebGLRenderer({
    antiailas: true,
    alpha: true
});
let controls = new OrbitControls( camera, renderer.domElement );
renderer.setSize(window.innerHeight, window.innerWidth);
document.body.appendChild( renderer.domElement);

const handleResize = () =>{
    const {innerWidth, innerHeight} = window;
    renderer.setSize(innerWidth,innerHeight-100);
    camera.aspect = innerWidth / (innerHeight-100);
    camera.updateProjectionMatrix();
};

const loader = new GLTFLoader();
const load = (path) =>{
    var obj;
    loader.load(path, function(gltf){
        obj= gltf.scene;
        obj.name=path;
        obj.position.set(0,-100,100)
        obj.scale.set(200,200,200)
        threeFizWorld.setWorld(obj);
        scene.add(obj)
        console.log(obj);
    },function(error){
        // if(error) console.error(error);
    });
}
//objects
let flGeo= new THREE.BoxGeometry(100,1,100);
let flMat= new THREE.MeshPhongMaterial({color: 0xFF0000});
let sphereGeo= new THREE.SphereGeometry(10);
let sphereMat= new THREE.MeshPhongMaterial({color: 0x0000FF});
let sphereMat2= new THREE.MeshPhongMaterial({color: 0x00FF00});

const light= new THREE.PointLight(0xFFFFFF,1);
const helplight= new THREE.PointLightHelper(light);

//Scene
const threeFizWorld = new ThreeFiz(scene)
let ilosc = 75
for(let i = 0; i< ilosc/2; i++){
    threeFizWorld.addSphere(new THREE.Mesh(sphereGeo,sphereMat), 10, 20)
    threeFizWorld.addSphere(new THREE.Mesh(sphereGeo,sphereMat2), 10, 20)
}
load('./models/bowl.glb')
// load('./models/collision-world.glb')
// threeFizWorld.setWorld(new THREE.Mesh(flGeo,flMat))
threeFizWorld.init()
threeFizWorld.spheres.forEach((sphere, idx) => {
    sphere.collider.center.set(
        Math.random() * 50 - 10,
        11 * idx,
        Math.random() * 50 - 10
    )
    })
scene.add(
    // new THREE.Mesh(flGeo,flMat),
    light,
    helplight,
);
camera.position.set(0,50,300);
light.position.set(50,150,50);

//Debug

const stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
document.body.appendChild( stats.domElement );

const gui = new dat.GUI();
gui.add(threeFizWorld.spheres[0].collider.center,"y",0,500,.01).name('sphere y');
// gui.add(threeFizWorld.world.mesh.position,"y",-50,50,.001).name('floor y');
// gui.add(threeFizWorld.world.mesh.position,"x",-50,50,.001).name('floor x');
// gui.add(threeFizWorld.world.mesh.rotation,'z',-Math.PI,Math.PI,.0001).name('floor rotate');
document.body.appendChild(document.createElement("p"))
document.body.appendChild(document.createElement("p"))


//scenario

function loopBall(){
    threeFizWorld.spheres.forEach((sphere, idx) => {
        if(sphere.collider.center.y < -1000) {
            sphere.collider.center.set(
                Math.random() * 50 - 10,
                11 * idx,
                Math.random() * 50 - 10
            )
            sphere.velocity.set(0,0,0)
        }
    })
}

controls.update();
const loop = () =>{
    threeFizWorld.update()
    document.getElementsByTagName("p")[0].innerHTML = `blue: 
    x${threeFizWorld.spheres[0].collider.center.x.toFixed(2)} 
    y${threeFizWorld.spheres[0].collider.center.y.toFixed(2)} 
    z${threeFizWorld.spheres[0].collider.center.z.toFixed(2)}
    <br>V: (
        x${threeFizWorld.spheres[0].velocity.x.toFixed(2)} 
        y${threeFizWorld.spheres[0].velocity.y.toFixed(2)} 
        z${threeFizWorld.spheres[0].velocity.z.toFixed(2)}
    )
    `
    document.getElementsByTagName("p")[1].innerHTML = `green: 
    x${threeFizWorld.spheres[1].collider.center.x.toFixed(2)} 
    y${threeFizWorld.spheres[1].collider.center.y.toFixed(2)} 
    z${threeFizWorld.spheres[1].collider.center.z.toFixed(2)} 
    <br>V: (
        x${threeFizWorld.spheres[1].velocity.x.toFixed(2)} 
        y${threeFizWorld.spheres[1].velocity.y.toFixed(2)} 
        z${threeFizWorld.spheres[1].velocity.z.toFixed(2)}
    )
    `
    controls.update();
    stats.update();
    renderer.render(scene,camera);
    loopBall()
    requestAnimationFrame(loop)
};
handleResize();
loop();
window.addEventListener('resize',handleResize);
