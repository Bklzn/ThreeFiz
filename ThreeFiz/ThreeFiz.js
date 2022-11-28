import * as THREE from 'three';
import { Octree } from '../threejs/three/examples/jsm/math/Octree.js';
import { OBB } from '../threejs/three/examples/jsm/math/OBB.js';
import { Vector3 } from 'three';

class ThreeFiz{
    constructor(SCENE, world = null,TIME_STEP = .03){
        this.dT = 0.0
        this.lastUpdate = Date.now()
        this.accumulator = 0.0
        this.TIME_STEP = TIME_STEP
        this.spheres = []
        this.boxes = []
        this.world = world
        this.SCENE = SCENE
        this.GRAVITY = new THREE.Vector3(0,-10,0)
    }
    init(){
         if(this.world) { // DO POPRAWY // zamień na PIVOTA i wczytywaj OCTREE doń (możliwość sterowania całymi drzewami ?!?!?!?)
            this.SCENE.add(this.world.mesh)
         }
        this.spheres.forEach((sphere) => {
            this.SCENE.add(sphere.mesh)
        })
        this.boxes.forEach((box) => {
            this.SCENE.add(box.mesh)
            box.collider = new OBB()
        })
        this.light = new THREE.PointLight(0xFFFFFF,1);
        this.helplight = new THREE.PointLightHelper(this.light);
        this.SCENE.add(
            this.light,
            this.helplight,
        )
    }
    addSphere(mesh, mass){
        let sphere = {
            mesh: mesh,
            collider: new THREE.Sphere(new THREE.Vector3(0,0,0), 0),
            velocity: new THREE.Vector3(),
            force: new THREE.Vector3(),
            mass: mass,
            hit: false
        }
        sphere.collider.radius = sphere.mesh.geometry.parameters.radius
        this.spheres.push(sphere)
    }
    addBox(mesh, mass) { ////////////////////////
        let box = {
            mesh: mesh,
            collider: new OBB(),
            velocity: new THREE.Vector3(),
            force: new THREE.Vector3(),
            mass: mass,
            hit: false
        }
        box.mesh.userData.obb = new OBB()
        box.mesh.userData.obb.halfSize.copy(new THREE.Vector3(
            mesh.geometry.parameters.width,
            mesh.geometry.parameters.height,
            mesh.geometry.parameters.depth,
            )).multiplyScalar( 0.5 );
        box.mesh.matrixAutoUpdate = false;
        this.boxes.push(box)
    }
    setWorld(mesh){
        let world = {
            mesh: mesh,
            collider: new Octree(),
        }
        world.collider.fromGraphNode(world.mesh)
        this.world = world
    }
    updateObjects(time){
        this.spheres.forEach((sphere) => {
            sphere.mesh.position.copy(sphere.collider.center)
            sphere.velocity.add(this.GRAVITY.clone())
            sphere.collider.center.addScaledVector(sphere.velocity.clone(), time/10000);
            const damping = Math.exp( - 1.1 * time/10 ) - 1;
        })
        this.boxes.forEach((box) => {
            box.mesh.updateMatrix();
            box.mesh.updateMatrixWorld();
            box.velocity.add(this.GRAVITY.clone())
            box.mesh.position.addScaledVector(box.velocity.clone(), time/10000);
            box.collider.copy(box.mesh.userData.obb)
            box.collider.applyMatrix4( box.mesh.matrixWorld );
        })
        this.sphereBoxCollisions()
        this.spheresCollisions()
        this.boxesCollisions()
        if (this.world) this.worldCollisions(time) // może do update lepiej
    }
    checkCollisions(obj){
        obj.mesh.position.copy(obj.collider.center)
        this.world.collider.subTrees = []
        this.world.collider.fromGraphNode(this.world.mesh)
        return this.world.collider.sphereIntersect(obj.collider)
    }
    worldCollisions(time){
        this.spheres.forEach((sphere) => {
            let collision = this.checkCollisions(sphere)
            if(collision){
                let relativeVelocity = sphere.velocity.clone() //.sub(floor.velocity)
                let dot = relativeVelocity.dot(collision.normal)
                sphere.hit = true
                sphere.collider.center.add( collision.normal.clone().multiplyScalar( collision.depth ))
                sphere.velocity.addScaledVector(collision.normal, -dot * 1.5) // 1.5 to sprężystość, 2 = 100% odbitej energii + damping
                const damping = Math.exp( - 1.1 * time/500 )
                sphere.velocity.multiplyScalar(damping)
            }
        })
    }
    spheresCollisions(){
        this.spheres.forEach((sphere1, idx1) => {
            this.spheres.forEach((sphere2, idx2) => {
                if(sphere1 !== sphere2 && idx2 > idx1){
                   if(sphere1.collider.intersectsSphere(sphere2.collider)){
                        const normal = sphere1.collider.center.clone().sub(sphere2.collider.center).normalize();
                        const relativeVelocity = sphere1.velocity.clone().sub(sphere2.velocity.clone())
                        const dot = relativeVelocity.dot(normal)
                        const depth = sphere1.collider.center.clone().sub(sphere2.collider.center.clone()).length()
                        const radii = sphere1.collider.radius + sphere2.collider.radius
                        const d = ( radii - depth) / 2;

                        sphere1.collider.center.addScaledVector( normal.clone(), d )
                        sphere2.collider.center.addScaledVector( normal.clone(), -d )

                        sphere1.velocity.addScaledVector(normal, -dot * 0.5 )
                        sphere2.velocity.addScaledVector(normal, dot * 0.5 )
                   }
                }
                // let collision = this.checkCollisions(sphere)
                // if(collision){
                //     let relativeVelocity = sphere.velocity.clone() //.sub(floor.velocity)
                //     let dot = relativeVelocity.dot(collision.normal)
                //     sphere.hit = true
                //     sphere.collider.center.add( collision.normal.clone().multiplyScalar( collision.depth ))
                //     sphere.velocity.addScaledVector(collision.normal, -dot * 1.5) // 1.5 to sprężystość, 2 = 100% odbitej energii + damping
                // }
            })
        })
    }
    sphereBoxCollisions(){
        this.boxes.forEach((box) => {
            this.spheres.forEach((sphere) => {
                if(box.collider.intersectsSphere(sphere.collider)){
                    const closestPoint = new THREE.Vector3()
                    const relativeVelocity = sphere.velocity.clone() //.sub(floor.velocity)
                    box.collider.clampPoint(sphere.collider.center, closestPoint)
                    const collision = {
                        normal: sphere.collider.center.clone().sub(closestPoint).normalize(),
                        depth: sphere.collider.radius - sphere.collider.center.clone().sub(closestPoint).length(),
                    }
                    const dot = relativeVelocity.dot(collision.normal)
                    sphere.collider.center.add( collision.normal.clone().multiplyScalar( collision.depth ))
                    sphere.velocity.addScaledVector(collision.normal, -dot * 1.5) // 1.5 to sprężystość, 2 = 100% odbitej energii + damping
                }
            })
        })
    }
    boxesCollisions(){
        this.boxes.forEach((box1, idx1) => {
            this.boxes.forEach((box2, idx2) => {
                if(box1 !== box2 && idx2 > idx1){
                   if(box1.collider.intersectsOBB(box2.collider)){
                        const box1cp = new THREE.Vector3()
                        const box2cp = new THREE.Vector3()
                        box1.collider.clampPoint(box2.collider.center, box1cp)
                        box2.collider.clampPoint(box1.collider.center, box2cp)
                        const collision = {
                            normal: box1.collider.center.clone().sub(box1cp).normalize(),
                            depth: box1cp.clone().sub(box2cp).length(),
                        }
                        const relativeVelocity = box1.velocity.clone().sub(box2.velocity.clone())
                        const dot = relativeVelocity.dot(collision.normal)
                        console.log(relativeVelocity.normalize())
                        console.log(box1cp.clone().multiply(relativeVelocity.normalize()))
                        console.log(box2cp.clone().multiply(relativeVelocity.normalize()))
                        const dir = box1cp.clone().multiply(relativeVelocity.clone().normalize()).sub(box2cp.clone().multiply(relativeVelocity.normalize()))
                        console.log(dir)
                        const absDir = new THREE.Vector3()
                        const d = collision.depth / 2

                        box1.mesh.position.add(dir.clone().multiplyScalar(4))
                        box2.mesh.position.add(dir.clone().multiplyScalar(4).negate())

                        box1.velocity.addScaledVector(collision.normal.clone(), -dot * 1 )
                        box2.velocity.addScaledVector(collision.normal.clone(), dot * 1 )

                   }
                }
            })
        })
    }
    boxHelper(){
    }
    octreeHelper({ node = this.world.collider, depth = 5, color = 0xFF0000}){
        let octree = node
        if(depth == 0){
            let boxHelper = new THREE.Box3Helper(octree.box, color)
            this.SCENE.add(boxHelper)
            return
        }
        octree.subTrees.forEach((octreeNode) => {
            this.octreeHelper({node: octreeNode, depth: depth-1, color: color})
        })
    }
    update(){
        this.dT = Date.now() - this.lastUpdate
        this.lastUpdate += this.dT
        this.dT = Math.max(0, this.dT)
        this.accumulator += this.dT
        this.accumulator = Math.min(Math.max(this.accumulator, 0), 1.0)
        while(this.accumulator >= this.TIME_STEP)
        {
            this.updateObjects(this.dT/100);
            this.accumulator -= this.TIME_STEP
        }
        if(true) return false
    }
}
export default ThreeFiz