import { Vector3,Matrix4,Ray } from 'three';
import { OBB } from '../threejs/three/examples/jsm/math/OBB.js';

class OBBs extends OBB {
    collisionPoint( obb ) {
        const vertices1 = this.getVertices()
        const vertices2 = obb.getVertices()
        let containsPoints1 = []
        let containsPoints2 = []
        let diff
        for(let i = 0; i < vertices1.length; i++){
            if(obb.containsPoint(vertices1[i])) containsPoints1.push(vertices1[i])
            if(this.containsPoint(vertices2[i])) containsPoints2.push(vertices2[i])
        }
        let l1 = containsPoints1.length
        let l2 = containsPoints2.length
        let v1,v2,distance, point, helppoint = new Vector3(), depth, depthFinder, normal
        switch (true) {
            case l1 == 0 && l2 == 0:
                const boxNormal = this.center.clone().sub(obb.center).normalize()
                let boxclampFinder1 = new Ray(this.center, boxNormal.clone().negate())
                let boxclampFinder2 = new Ray(obb.center, boxNormal.clone())
                let i1 = new Vector3()
                let i2 = new Vector3()
                this.intersectRay(boxclampFinder1, i1)
                this.intersectRay(boxclampFinder2, i2)
                diff = i2.clone().sub(i1).divideScalar(2)
                point = i1.clone().add(diff)
                depth = i1.clone().sub(i2).length()
                break;
            case l1 == 1 && l2 == 1:
                diff = containsPoints2[0].clone().sub(containsPoints1[0]).divideScalar(2)
                point = containsPoints1[0].clone().add(diff)
                normal = this.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(this.center, normal.clone())
                obb.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                break;
            case l1 == 1 && l2 == 0:
                point = containsPoints1[0]
                normal = this.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(this.center, normal.clone())
                obb.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                break;
            case l1 == 2 && l2 == 0:
                diff = containsPoints1[1].clone().sub(containsPoints1[0]).divideScalar(2)
                point = containsPoints1[0].clone().add(diff)
                normal = this.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(this.center, normal.clone())
                obb.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                break;
            case l1 > 2:
                distance=0
                for(let i = 0; i<containsPoints1.length;i++){
                    for(let j = i + 1; j<containsPoints1.length; j++){
                        if(containsPoints1[i].distanceTo(containsPoints1[j]) > distance){
                            v1 = containsPoints1[i]
                            v2 = containsPoints1[j]
                            distance = v1.distanceTo(v2)
                        }
                    }
                }
                diff = v2.clone().sub(v1).divideScalar(2)
                point = v1.clone().add(diff)
                normal = this.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(this.center, normal.clone())
                obb.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                break;

            case l1 == 0 && l2 == 1:
                point = containsPoints2[0]
                normal = obb.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(obb.center, normal.clone())
                this.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                break;
            case l1 == 0 && l2 == 2:
                diff = containsPoints2[1].clone().sub(containsPoints2[0]).divideScalar(2)
                point = containsPoints2[0].clone().add(diff)
                normal = obb.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(obb.center, normal.clone())
                this.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                break;
            case l2 > 2:
                distance=0
                for(let i = 0; i<containsPoints2.length;i++){
                    for(let j = i + 1; j<containsPoints2.length; j++){
                        if(containsPoints2[i].distanceTo(containsPoints2[j]) > distance){
                            v1 = containsPoints2[i]
                            v2 = containsPoints2[j]
                            distance = v1.distanceTo(v2)
                        }
                    }
                }
                diff = v2.clone().sub(v1).divideScalar(2)
                point = v1.clone().add(diff)
                normal = obb.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(obb.center, normal.clone())
                this.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                break;
        }
        return {point, depth}
    } 
    getVertices() {
        const rotationMatrix = this.getRotationMatrix()
        const vertices = [
          new Vector3(-this.halfSize.x, -this.halfSize.y, -this.halfSize.z),
          new Vector3(-this.halfSize.x,  this.halfSize.y, -this.halfSize.z),
          new Vector3( this.halfSize.x,  this.halfSize.y, -this.halfSize.z),
          new Vector3( this.halfSize.x, -this.halfSize.y, -this.halfSize.z),
          new Vector3(-this.halfSize.x, -this.halfSize.y,  this.halfSize.z),
          new Vector3(-this.halfSize.x,  this.halfSize.y,  this.halfSize.z),
          new Vector3( this.halfSize.x,  this.halfSize.y,  this.halfSize.z),
          new Vector3( this.halfSize.x, -this.halfSize.y,  this.halfSize.z),
        ]
        for (let i = 0; i < vertices.length; i++) {
            vertices[i].applyMatrix4( rotationMatrix ).add(this.center)
        }
        return vertices;
    }
    getFaces() {
        const vertices = this.getVertices();
        const faces = [
          [vertices[0], vertices[1], vertices[2]], // ??ciana 1
          [vertices[0], vertices[2], vertices[3]], // ??ciana 2
          [vertices[4], vertices[5], vertices[6]], // ??ciana 3
          [vertices[4], vertices[6], vertices[7]], // ??ciana 4
          [vertices[0], vertices[4], vertices[5]], // ??ciana 5
          [vertices[0], vertices[5], vertices[1]], // ??ciana 6
          [vertices[1], vertices[5], vertices[6]], // ??ciana 7
          [vertices[1], vertices[6], vertices[2]], // ??ciana 8
          [vertices[2], vertices[6], vertices[7]], // ??ciana 9
          [vertices[2], vertices[7], vertices[3]], // ??ciana 10
          [vertices[3], vertices[7], vertices[4]], // ??ciana 11
          [vertices[3], vertices[4], vertices[0]], // ??ciana 12
        ]
        return faces
      }

    getRotationMatrix() {
        const matrix = new Matrix4();
        matrix.setFromMatrix3(this.rotation)
        return matrix;
    }

    getAxes() {
    
        const vertices = this.getVertices();
        const axes = [
            vertices[1].clone().sub(vertices[0]),
            vertices[2].clone().sub(vertices[1]),
            vertices[3].clone().sub(vertices[2]),
            vertices[0].clone().sub(vertices[3]),
        ];
        return axes;
    }
}

export { OBBs };
