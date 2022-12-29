import * as THREE from 'three';
import { Octree } from '../threejs/three/examples/jsm/math/Octree.js';
import { OBBs } from '../ThreeFiz/OBB.js';
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
            box.collider = new OBBs()
        })
        this.red = new THREE.PointLight(0xFF0000,1);
        this.blue = new THREE.PointLight(0x0000FF,1);
        this.yellow = new THREE.PointLight(0xFFFF00,1);
        this.helplight = new THREE.PointLightHelper(this.red);
        this.helplight2 = new THREE.PointLightHelper(this.blue);
        this.helplight3 = new THREE.PointLightHelper(this.yellow);
        this.SCENE.add(
            this.red,
            this.blue,
            this.yellow,
            this.helplight,
            this.helplight2,
            this.helplight3,
        )
    }
    addSphere(mesh, mass){
        let sphere = {
            mesh: mesh,
            collider: new THREE.Sphere(new THREE.Vector3(0,0,0), 0),
            velocity: new THREE.Vector3(),
            position: new THREE.Vector3(0,0,0),
            force: new THREE.Vector3(),
            mass: mass,
            hit: false
        }
        sphere.collider.radius = sphere.mesh.geometry.parameters.radius
        this.spheres.push(sphere)
    }
    addBox(mesh, mass) {
        let box = {
            mesh: mesh,
            collider: new OBBs(),
            velocity: new THREE.Vector3(),
            position: new THREE.Vector3(0,0,0),
            rotation: new THREE.Vector3(0,0,0),
            rotationVelocity: new THREE.Vector3(0,0,0),
            force: new THREE.Vector3(),
            mass: mass,
        }
        box.mesh.userData.obb = new OBBs()
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
            sphere.velocity.add(this.GRAVITY.clone())
            sphere.position.addScaledVector(sphere.velocity.clone(), time/10000)
            sphere.collider.center.copy(sphere.position)
            sphere.mesh.position.copy(sphere.collider.center)
        })
        this.boxes.forEach((box) => {
            box.velocity.add(this.GRAVITY.clone())
            box.position.addScaledVector(box.velocity.clone(), time/10000);
            box.rotation.addScaledVector(box.rotationVelocity.clone(), time/1000)
            box.mesh.position.copy(box.position)
            box.mesh.rotation.set(box.rotation.x, box.rotation.y, box.rotation.z)
            box.mesh.updateMatrix();
            box.mesh.updateMatrixWorld();
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

                        sphere1.position.addScaledVector( normal.clone(), d )
                        sphere2.position.addScaledVector( normal.clone(), -d )

                        sphere1.velocity.addScaledVector(normal, -dot * 0.5 )
                        sphere2.velocity.addScaledVector(normal, dot * 0.5 )
                   }
                }
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
                    sphere.position.add( collision.normal.clone().multiplyScalar( collision.depth ))
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
                        const elasticity = 1.5
                        const box1cp = new THREE.Vector3()
                        const box2cp = new THREE.Vector3()
                        const boxNormal = box1.collider.center.clone().sub(box2.collider.center).normalize()
                        let box1clampFinder = new THREE.Ray(box1.collider.center, boxNormal.clone().negate())
                        let box2clampFinder = new THREE.Ray(box2.collider.center,boxNormal)

                        const collisionPoint = box1.collider.collisionPoint(box2.collider)
                        console.log(collisionPoint)
                        box1.collider.clampPoint(box2.collider.center, box1cp)
                        box2.collider.clampPoint(box1cp, box2cp)
                        box1.collider.clampPoint(box2cp, box1cp)
                        this.red.position.copy(collisionPoint)
                        this.blue.position.copy(box1cp)
                        this.yellow.position.copy(box2cp)
                        // console.log(this.red.position)
                        // console.log(this.blue.position)
                        // return asd
                        box1.velocity.set(0,0,0)
                        box2.velocity.set(0,0,0)
                        // return

                        box1.collider.intersectRay(box1clampFinder, box1cp)
                        box2.collider.intersectRay(box2clampFinder, box2cp)

                        const depth = box2cp.clone().sub(box1cp).length()

                        const relativeVelocity = box1.velocity.clone().sub(box2.velocity.clone())
                        const relativeVelocityRot = box1.rotationVelocity.clone().sub(box2.rotationVelocity.clone())
                        const dot = relativeVelocity.dot(boxNormal)
                        const r1 = box1.collider.center.clone().sub(collisionPoint).clone()
                        const r2 = box2.collider.center.clone().sub(collisionPoint).clone()
                        const J = boxNormal.clone().multiplyScalar(elasticity)
                        const velocityImpulse1 = J.clone().multiplyScalar(box1.mass)
                        const velocityImpulse2 = J.clone().multiplyScalar(box2.mass)
                        const velocityRotationImpulse1 = new THREE.Vector3().crossVectors(r1.clone(), J).multiplyScalar(999999999999999)
                        const velocityRotationImpulse2 = new THREE.Vector3().crossVectors(r2.clone(), J).multiplyScalar(999999999999999)
                        // const dotR = new THREE.Vector3().crossVectors(relativeVelocity, rotNorm)

                        // box1.position.addScaledVector(boxNormal.clone(), depth * 1.1)
                        // box2.position.addScaledVector(boxNormal.clone(), -depth * 1.1)

                        // box1.velocity.addScaledVector(velocityImpulse1, 1 )
                        // box2.velocity.addScaledVector(velocityImpulse2, -1 )

                        // box1.velocity.addScaledVector(boxNormal.clone(), -dot * 1 )
                        // box2.velocity.addScaledVector(boxNormal.clone(), dot * 1 )

                        // console.log(box1.rotationVelocity)

                        // box1.rotationVelocity.addScaledVector(velocityRotationImpulse1, 1)
                        // box2.rotationVelocity.addScaledVector(velocityRotationImpulse2, 1)

                        // console.log(asd)
                        // box1.rotationVelocity.add(dotR.clone().multiplyScalar( -1 ))
                        // box2.rotationVelocity.add(dotR.clone().multiplyScalar( 1 ))
    



                        // const box1cp = new THREE.Vector3()
                        // const box2cp = new THREE.Vector3()
                        // const boxNormal = box1.collider.center.clone().sub(box2.collider.center).normalize()
                        // let box1clampFinder = new THREE.Ray(box1.collider.center, boxNormal.clone().negate())
                        // let box2clampFinder = new THREE.Ray(box2.collider.center,boxNormal)
                        
                        // box1.collider.intersectRay(box1clampFinder, box1cp)
                        // box2.collider.intersectRay(box2clampFinder, box2cp)

                        // const depth = box2cp.clone().sub(box1cp).length()
                        // const relativeVelocity = box1.velocity.clone().sub(box2.velocity.clone())
                        // const relativeVelocityRot = box1.rotationVelocity.clone().sub(box2.rotationVelocity.clone())
                        // const dot = relativeVelocity.dot(boxNormal)
                        // const rotNorm = box1.collider.center.clone().sub(box1cp).clone().normalize()
                        // const dotR = new THREE.Vector3().crossVectors(relativeVelocity, rotNorm)

                        // console.log("rotNorm")
                        // console.log(boxNormal)
                        // console.log(rotNorm)
                        // console.log(dotR)
                        // console.log(dotR.clone().multiply(rotNorm.clone()))
                        // box1.position.addScaledVector(boxNormal.clone(), depth * 1.1)
                        // box2.position.addScaledVector(boxNormal.clone(), -depth * 1.1)

                        // box1.velocity.addScaledVector(boxNormal.clone(), -dot * 1 )
                        // box2.velocity.addScaledVector(boxNormal.clone(), dot * 1 )
                        // console.log("Rot")
                        // console.log(box1.rotationVelocity)
                        // box1.rotationVelocity.add(dotR.clone().multiplyScalar( -1 ))
                        // box2.rotationVelocity.add(dotR.clone().multiplyScalar( 1 ))
                        // console.log(box1.rotationVelocity)
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
    // ClosestPtPointOBB(point, OBB)
    //     {
    //     let d = new THREE.Vector3().copy(p).sub(OBB.center);
    //     // Start result at center of box; make steps from there
    //     result = OBB.center;
    //     // For each OBB axis...
    //     for (let i = 0; i < 3; i++) {
    //         // ...project d onto that axis to get the distance
    //         // along the axis of d from the box center
    //         let dist = d.dot(b.u[i]);
    //         // If distance farther than the box extents, clamp to the box
    //         if (dist > b.e[i]) dist = b.e[i];
    //         if (dist < -b.e[i]) dist = -b.e[i];
    //         // Step that distance along the axis to get world coordinate
    //         result += dist * b.u[i];
    //     }
    //     return result
    // }
}
export default ThreeFiz