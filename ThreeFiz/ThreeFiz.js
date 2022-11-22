import * as THREE from 'three';
import { Octree } from '../threejs/three/examples/jsm/math/Octree.js';

class ThreeFiz{
    constructor(SCENE, world = null,TIME_STEP = .03){
        this.dT = 0.0
        this.lastUpdate = Date.now()
        this.accumulator = 0.0
        this.TIME_STEP = TIME_STEP
        this.spheres = []
        this.cubes = []
        this.world = world
        this.SCENE = SCENE
        this.GRAVITY = new THREE.Vector3(0,-10,0)
    }
    init(){
         if(this.world) { // DO POPRAWY
            this.SCENE.add(this.world.mesh)
         }
        this.spheres.forEach((sphere) => {
            this.SCENE.add(sphere.mesh)
        })
        this.cubes.forEach((cube) => {
            this.SCENE.add(cube.mesh)
        })
    }
    addSphere(mesh, radius, mass){
        let sphere = {
            mesh: mesh,
            collider: new THREE.Sphere(new THREE.Vector3(0,0,0), radius),
            velocity: new THREE.Vector3(),
            force: new THREE.Vector3(),
            mass: mass,
            hit: false
        }
        this.spheres.push(sphere)
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
        this.cubes.forEach((cube) => {
            // in future
        })
        this.spheresCollisions()
        if (this.world) this.worldCollisions(time) // może do update lepiej
    }
    checkCollisions(obj){
        obj.mesh.position.copy(obj.collider.center)
        // this.world.collider.subTrees = []
        // this.world.collider.fromGraphNode(this.world.mesh)
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
                // console.log(damping)
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