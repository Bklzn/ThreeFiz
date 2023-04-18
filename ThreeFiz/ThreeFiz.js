import * as THREE from 'three';
import { Octree } from '../threejs/three/examples/jsm/math/Octree.js';
import { OBBs } from '../ThreeFiz/OBB.js';
import { Ray, Vector3 } from 'three';

class ThreeFiz{
    constructor(SCENE, CAMERA, CANVAS, TIME_STEP = .1){
        this.dT = 0.0
        this.lastUpdate = Date.now()
        this.accumulator = 0.0
        this.TIME_STEP = TIME_STEP
        this.spheres = []
        this.boxes = []
        this.SCENE = SCENE
        this.GRAVITY = new THREE.Vector3(0,-10,0)
    }
    init(){
        this.spheres.forEach((sphere) => {
            this.SCENE.add(sphere.mesh)
        })
        this.boxes.forEach((box) => {
            this.SCENE.add(box.mesh)
            box.collider = new OBBs()
        })
        this.boxes.sort((a,b) => {
            if (a.isStatic === b.isStatic) return 0;
              else if (a.isStatic === true) return 1
              else return -1
        })
        this.spheres.sort((a,b) => {
            if (a.isStatic === b.isStatic) return 0;
              else if (a.isStatic === true) return 1
              else return -1
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
    addSphere({mesh, mass = 1, restitution = .2, isStatic = false}){
        let sphere = {
            mesh: mesh,
            collider: new THREE.Sphere(new THREE.Vector3(0,0,0), 0),
            velocity: new THREE.Vector3(),
            position: new THREE.Vector3(0,0,0),
            force: new THREE.Vector3(),
            mass: mass,
            restitution: restitution,
            isStatic: isStatic
        }
        sphere.collider.radius = sphere.mesh.geometry.parameters.radius
        console.log(sphere)
        this.spheres.push(sphere)
    }
    addBox({mesh, mass = 1, restitution = .2, isStatic = false}) {
        let boxparams = mesh.geometry.parameters
        let InertiaTensor = new THREE.Matrix3().set(
            (mass/12) * (boxparams.height**2 + boxparams.depth**2), 0, 0,
            0, (mass/12) * (boxparams.width**2 + boxparams.height**2), 0,
            0, 0, (mass/12) * (boxparams.width**2 + boxparams.depth**2))
        let box = {
            mesh: mesh,
            collider: new OBBs(),
            velocity: new THREE.Vector3(),
            position: new THREE.Vector3(0,0,0),
            rotation: new THREE.Vector3(0,0,0),
            rotationVelocity: new THREE.Vector3(0,0,0),
            force: new THREE.Vector3(),
            mass: mass,
            InertiaTensor: InertiaTensor,
            restitution: restitution,
            isStatic: isStatic
        }
        box.mesh.userData.obb = new OBBs()
        box.mesh.userData.obb.halfSize.copy(new THREE.Vector3(
            mesh.geometry.parameters.width,
            mesh.geometry.parameters.height,
            mesh.geometry.parameters.depth,
            )).multiplyScalar( .5 );
        box.mesh.matrixAutoUpdate = false;
        this.boxes.push(box)
    }
    // setWorld(mesh){
    //     let world = {
    //         mesh: mesh,
    //         collider: new Octree(),
    //     }
    //     world.collider.fromGraphNode(world.mesh)
    //     this.world = world
    // }
    gravity(obj){
        let g = this.GRAVITY
        if(g.radial && g.force){
            if(g.radial.isVector3)  return new Vector3().copy(g.radial).sub(obj.position).normalize().multiplyScalar(g.force)
        }
        if(g.isVector3) return g.clone()
        return new Vector3(0, 0, 0)
    }
    updateObjects(time){
        this.spheres.forEach((sphere) => {
            if (!sphere.isStatic){
                sphere.velocity.add(this.gravity(sphere))
                sphere.position.addScaledVector(sphere.velocity.clone(), time)
            }
            sphere.collider.center.copy(sphere.position)
            sphere.mesh.position.copy(sphere.collider.center)
        })
        this.boxes.forEach((box) => {
            if (!box.isStatic){
                box.velocity.add(this.GRAVITY.clone())
                box.position.addScaledVector(box.velocity, time);
                box.rotation.addScaledVector(box.rotationVelocity, time)
            }
            box.mesh.position.copy(box.position)
            box.mesh.rotation.set(box.rotation.x, box.rotation.y, box.rotation.z)
            box.mesh.updateMatrix();
            box.mesh.updateMatrixWorld();
            box.collider.copy(box.mesh.userData.obb)
            box.collider.applyMatrix4( box.mesh.matrixWorld );
        })
        this.sphereBoxCollisions(time/10000)
        this.spheresCollisions()
        this.boxesCollisions(time/10000)
        // if (this.world) this.worldCollisions(time) // może do update lepiej
    }
    checkCollisions(obj){
        obj.mesh.position.copy(obj.collider.center)
        this.world.collider.subTrees = []
        this.world.collider.fromGraphNode(this.world.mesh)
        return this.world.collider.sphereIntersect(obj.collider)
    }
    worldCollisions(time){
        this.boxes.forEach((box) => {
            if(box.static){

            }
        })
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
                        if(!sphere1.isStatic){
                            sphere1.position.addScaledVector( normal.clone(), d )
                            sphere1.velocity.addScaledVector(normal, -dot * 0.5 )
                        }
                        if(!sphere2.isStatic){
                            sphere2.position.addScaledVector( normal.clone(), -d )
                            sphere2.velocity.addScaledVector(normal, dot * 0.5 )
                        }
                   }
                }
            })
        })
    }
    sphereBoxCollisions(dT){
        this.boxes.forEach((box) => {
            this.spheres.forEach((sphere) => {
                if(box.collider.intersectsSphere(sphere.collider)){
                    const closestPoint = new THREE.Vector3()
                    const damping = Math.exp(- 1.1 * dT)
                    box.collider.clampPoint(sphere.collider.center, closestPoint)
                    const collision = {
                        normal: sphere.collider.center.clone().sub(closestPoint).normalize(),
                        depth: sphere.collider.radius - sphere.collider.center.clone().sub(closestPoint).length(),
                        point: closestPoint
                    }
                    let r = collision.point.clone().sub(box.position.clone()) 
                    let relBox = new Vector3(), relSphere = new Vector3(), jBox = new Vector3(), boxM = 0, sphereM = 0               
                    if(!box.isStatic){
                        relBox.copy(box.velocity.clone().add(box.rotationVelocity.clone().cross(r)))
                        jBox.copy(((r.clone().cross(collision.normal)).applyMatrix3(box.InertiaTensor.clone().invert())).cross(r))
                        boxM = 1/box.mass
                    }
                    if(!sphere.isStatic){
                        relSphere.copy(sphere.velocity.clone())
                        sphereM = sphere.mass
                        relSphere = sphere.velocity.clone()
                    }
                    let relV = relSphere.sub(relBox)
                    const dot = relV.dot(collision.normal)

                    const jN = -(1 + ((box.restitution + sphere.restitution)/2))*(dot)
                    const jD = boxM + sphereM + (jBox).dot(collision.normal)
                    const j = (jN/jD)
                    const boxvel = collision.normal.clone().multiplyScalar(j/box.mass)
                    const boxrot = (r.clone().cross(collision.normal.clone().multiplyScalar(j)).applyMatrix3(box.InertiaTensor.clone().invert()))
                    
                    if(!box.isStatic){
                        box.position.add( collision.normal.clone().multiplyScalar( collision.depth ))
                        box.rotationVelocity.addScaledVector(boxrot, 1 * damping)
                        box.velocity.addScaledVector(boxvel, 1 * damping)
                    }
                    if(!sphere.isStatic){
                        sphere.position.add( collision.normal.clone().multiplyScalar( collision.depth ))
                        sphere.velocity.addScaledVector(collision.normal, -dot * (1 + sphere.restitution)) // 1.5 to sprężystość, 2 = 100% odbitej energii + damping
                    }
                }
            })
        })
    }
    boxesCollisions(dT){
        this.boxes.forEach((box1, idx1) => {
            this.boxes.forEach((box2, idx2) => {
                if(box1 !== box2 && idx2 > idx1){
                    if(box1.collider.intersectsOBB(box2.collider)){
                        const damping = Math.exp(- 1 * dT)
                        // if(Math.random() > .3){
                        //     box1.rotationVelocity.multiplyScalar(.99 + (box1.restitution + box2.restitution)/1000)
                        //     box2.rotationVelocity.multiplyScalar(.99 + (box1.restitution + box2.restitution)/1000)
                        // }
                        const collisionPoint = box1.collider.collisionPoint(box2.collider)
                        let friction = .5
                        let m1 = new THREE.Matrix4().setFromMatrix3(box1.collider.rotation).invert()
                        let m2 = new THREE.Matrix4().setFromMatrix3(box2.collider.rotation).invert()
                        let r1 = collisionPoint.point.clone().sub(box1.position.clone())//.applyMatrix4(m1)
                        let r2 = collisionPoint.point.clone().sub(box2.position.clone())//.applyMatrix4(m2)
                        let relBox1 = new Vector3(), relBox2 = new Vector3(), jBox1 = new Vector3(), jBox2 = new Vector3(), box1M = 0, box2M = 0
                        if(!box1.isStatic){
                            relBox1.copy(box1.velocity.clone().add(box1.rotationVelocity.clone().cross(r1)))
                            jBox1.copy(((r1.clone().cross(collisionPoint.normal)).applyMatrix3(box1.InertiaTensor.clone().invert())).cross(r1))
                            box1M = 1/box1.mass
                        }
                        if(!box2.isStatic){
                            relBox2.copy(box2.velocity.clone().add(box2.rotationVelocity.clone().cross(r2)))
                            jBox2.copy(((r2.clone().cross(collisionPoint.normal)).applyMatrix3(box2.InertiaTensor.clone().invert())).cross(r2))
                            box2M = 1/box2.mass
                        }
                        let relV = (relBox1.sub(relBox2)).dot(collisionPoint.normal)
                        const jN = -(1 + ((box1.restitution + box2.restitution)/2))*(relV)
                        const jD = box1M + box2M + (jBox1.add(jBox2)).dot(collisionPoint.normal)
                        const j = (jN/jD)
                        const box1vel = collisionPoint.normal.clone().multiplyScalar(j/box1.mass)
                        const box2vel = collisionPoint.normal.clone().multiplyScalar(j/box2.mass)
                        const box1rot = (r1.clone().cross(collisionPoint.normal.clone().multiplyScalar(j)).applyMatrix3(box1.InertiaTensor.clone().invert()))
                        const box2rot = (r2.clone().cross(collisionPoint.normal.clone().multiplyScalar(j)).applyMatrix3(box2.InertiaTensor.clone().invert()))
                        
                        if(!box1.isStatic){
                            box1.position.add( collisionPoint.normal.clone().multiplyScalar( collisionPoint.depth ))
                            box1.rotationVelocity.addScaledVector(box1rot, damping)
                            box1.velocity.addScaledVector(box1vel, damping)
                        }
                        if(!box2.isStatic){
                            box2.position.add( collisionPoint.normal.clone().multiplyScalar( -collisionPoint.depth ))
                            box2.rotationVelocity.addScaledVector(box2rot, -damping)
                            box2.velocity.addScaledVector(box2vel, -damping)
                        }

                        // this.arrow.position.copy(collisionPoint.point)
                        // this.arrow.setDirection(collisionPoint.normal)
                        // this.red.position.copy(collisionPoint.point)


                        // let t1 = r1.clone().normalize()
                        // let t1 = box1.velocity.clone().sub(this.GRAVITY).addScaledVector(box2rot, box1.restitution).normalize().negate()
                        // const jT = (box1.velocity.clone().negate().dot(t1) * friction)/(1/box1.mass + (r1.clone().cross(t1).cross(r1).applyMatrix3(box1.InertiaTensor.clone().invert())).dot(t1))
                        // box1vel.addScaledVector(t1.clone().normalize(), 1)
                     
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
            this.updateObjects(this.dT/100000);
            this.accumulator -= this.TIME_STEP
        }
        if(true) return false
    }
}
export default ThreeFiz