import * as THREE from 'three';
import { Octree } from '../threejs/three/examples/jsm/math/Octree.js';
import { OBBs } from '../ThreeFiz/OBB.js';
import { Ray, Vector3 } from 'three';

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
         if(this.world) {
            this.SCENE.add(this.world.mesh)
         }
        this.spheres.forEach((sphere) => {
            this.SCENE.add(sphere.mesh)
        })
        this.boxes.forEach((box) => {
            this.SCENE.add(box.mesh)
            box.collider = new OBBs()
        })
        this.arrow = new THREE.ArrowHelper(new Vector3(1,1,1),new Vector3(),20, 0xFFFF00  )
        this.red = new THREE.PointLight(0xFF0000,1);
        this.blue = new THREE.PointLight(0x0000FF,1);
        this.yellow = new THREE.PointLight(0xFFFF00,1);
        this.helplight = new THREE.PointLightHelper(this.red);
        this.helplight2 = new THREE.PointLightHelper(this.blue);
        this.helplight3 = new THREE.PointLightHelper(this.yellow);
        this.iterate = 0
        this.SCENE.add(
            this.red,
            this.blue,
            this.yellow,
            this.helplight,
            this.helplight2,
            this.helplight3,
            this.arrow
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
    setWorld(obj){
        this.world = obj
    }
    updateObjects(time){
        this.spheres.forEach((sphere) => {
            if (sphere != this.world){
                sphere.velocity.add(this.GRAVITY.clone())
                sphere.position.addScaledVector(sphere.velocity.clone(), time/10000)
            }
            sphere.collider.center.copy(sphere.position)
            sphere.mesh.position.copy(sphere.collider.center)
        })
        this.boxes.forEach((box) => {
            if (box != this.world){
                box.velocity.add(this.GRAVITY.clone())
                box.position.addScaledVector(box.velocity.clone(), time/10000);
                box.rotation.addScaledVector(box.rotationVelocity.clone(), time/1000)
            }
            box.mesh.position.copy(box.position)
            box.mesh.rotation.set(box.rotation.x, box.rotation.y, box.rotation.z)
            box.mesh.updateMatrix();
            box.mesh.updateMatrixWorld();
            box.collider.copy(box.mesh.userData.obb)
            box.collider.applyMatrix4( box.mesh.matrixWorld );
        })
        this.sphereBoxCollisions()
        this.spheresCollisions()
        this.boxesCollisions(time/1000)
        // if (this.world) this.worldCollisions(time) // może do update lepiej
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
    boxesCollisions(dT){
        this.boxes.forEach((box1, idx1) => {
            this.boxes.forEach((box2, idx2) => {
                if(box1 !== box2 && idx2 > idx1){
                    if(box1.collider.intersectsOBB(box2.collider)){
                        const collisionPoint = box1.collider.collisionPoint(box2.collider)
                        this.red.position.copy(collisionPoint.point)
                        const damping = Math.exp(- 1.1 * dT/500)
                        let restitution = .5
                        let friction = .5
                        let box1params = box1.mesh.geometry.parameters
                        let box2params = box1.mesh.geometry.parameters
                        let I1 = new THREE.Matrix3().set(
                            (box1.mass/12) * (box1params.height**2 + box1params.depth**2), 0, 0,
                            0, (box1.mass/12) * (box1params.width**2 + box1params.height**2), 0,
                            0, 0, (box1.mass/12) * (box1params.width**2 + box1params.depth**2)).invert()
                        let M1 = new THREE.Matrix3().set(
                                box1.mass, 0, 0,
                                0, box1.mass, 0,
                                0, 0, box1.mass,)
                        let I2 = new THREE.Matrix3().set(
                            (box2.mass * (box2params.height**2 + box2params.depth**2))/12, 0, 0,
                            0, (box2.mass * (box2params.width**2 + box2params.height**2))/12, 0,
                            0, 0, (box2.mass * (box2params.width**2 + box2params.depth**2))/12).invert()
                        let M2 = new THREE.Matrix3().set(
                            box2.mass, 0, 0,
                            0, box2.mass, 0,
                            0, 0, box2.mass,)
                        let m1 = new THREE.Matrix4().setFromMatrix3(box1.collider.rotation).invert()
                        let m2 = new THREE.Matrix4().setFromMatrix3(box2.collider.rotation).invert()
                        let r1 = collisionPoint.point.clone().sub(box1.position.clone()).applyMatrix4(m1)
                        let r2 = collisionPoint.point.clone().sub(box2.position.clone()).applyMatrix4(m1)
                        let relV = (box1.velocity.clone().add(box1.rotationVelocity.clone().cross(r1))).dot(collisionPoint.normal) // static
                        const jN = -(1 + restitution)*(relV)
                        const jD = 1/box1.mass + 0 + (((r1.clone().cross(collisionPoint.normal)).applyMatrix3(I1)).cross(r1)).dot(collisionPoint.normal) // static
                        const j = (jN/jD)
                        const newVel1 = collisionPoint.normal.clone().multiplyScalar(j/box1.mass)
                        const newRot1 = (r1.clone().cross(collisionPoint.normal.clone().multiplyScalar(j)).applyMatrix3(I1))
                        
                        const V = new THREE.Vector4().set(box1.velocity, box1.rotationVelocity, box2.velocity, box2.rotationVelocity)
                        // const V = new THREE.Vector4().set(box1.velocity, box1.rotationVelocity, box2.velocity, box2.rotationVelocity)
                        const m0 = new THREE.Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0)
                        const M = new THREE.Matrix4().set(
                            M1, m0 ,m0, m0,
                            m0, I1, m0, m0,
                            m0, m0, M2, m0,
                            m0, m0, m0, I2).invert()
                        const deltaV = M
                        const C = collisionPoint.point.clone().dot(collisionPoint.normal.clone())
                        box1.position.add( collisionPoint.normal.clone().multiplyScalar( collisionPoint.depth )) // 2x lub więce ze wzgledu na statyczny box2

                        // let t1 = r1.clone().normalize()
                        let t1 = box1.velocity.clone().sub(this.GRAVITY).addScaledVector(newRot1, restitution).normalize().negate()
                        const jT = (box1.velocity.clone().negate().dot(t1) * friction)/(1/box1.mass + (r1.clone().cross(t1).cross(r1).applyMatrix3(I1)).dot(t1))
                        newVel1.addScaledVector(t1.clone().normalize(), 1)
                        box1.rotationVelocity.addScaledVector(newRot1, 1)
                        box1.velocity.addScaledVector(newVel1, 1)
                        
                        this.arrow.position.copy(box1.position)
                        this.arrow.setDirection(box1.velocity.clone().sub(this.GRAVITY).normalize())
                        // box1.velocity.set(0,0,0)
                        // box1.rotationVelocity.set(0,0,0)
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