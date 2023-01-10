import { Vector3,Matrix4,Ray, Plane } from 'three';
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
        let v1,v2,distance, point, helppoint = new Vector3(), depth, depthFinder, normal, collisionNormal = new Vector3()
        switch (true) {
            default:
                let edgePoints1 = []
                let edgePoints2 = []
                let collidingPoints = []
                let pointFinder = new Ray()
                let pointChecker = new Ray()
                for(let i=0; i<vertices1.length; i++){
                    let neighbors = this.getVerticesNeighbors()[i]
                    for(let j=0; j<neighbors.length; j++){
                        let p = new Vector3()
                        normal = vertices1[i].clone().sub(neighbors[j].clone()).normalize()
                        pointFinder.set(vertices1[i], normal.negate())
                        obb.intersectRay(pointFinder, p)
                        if(p.x != 0){
                            let pC = new Vector3()
                            pointChecker.set(neighbors[j], normal.negate())
                            obb.intersectRay(pointChecker, pC)
                            if(pC.x != 0){
                                edgePoints1.push({pC,r:[vertices1[i],neighbors[j]]})
                            }
                        }
                    }
                }
                for(let i=0; i<vertices2.length; i++){
                    let neighbors = obb.getVerticesNeighbors()[i]
                    for(let j=0; j<neighbors.length; j++){
                        let p = new Vector3()
                        normal = vertices2[i].clone().sub(neighbors[j].clone()).normalize()
                        pointFinder.set(vertices2[i], normal.negate())
                        this.intersectRay(pointFinder, p)
                        if(p.x != 0){
                            let pC = new Vector3()
                            pointChecker.set(neighbors[j], normal.negate())
                            this.intersectRay(pointChecker, pC)
                            if(pC.x != 0){
                                edgePoints2.push({pC,r:[vertices2[i],neighbors[j]]})
                            }
                        }
                    }
                }
                collidingPoints = edgePoints1
                if(edgePoints2.length < edgePoints1.length){
                    collidingPoints = edgePoints2
                }
                switch(collidingPoints.length){
                    case 2:
                        diff = collidingPoints[0].pC.clone().sub(collidingPoints[1].pC).divideScalar(2)
                        point = collidingPoints[1].pC.clone().add(diff)
                        normal = this.center.clone().sub(point).normalize().negate()
                        depthFinder = new Ray(this.center, normal.clone())
                        obb.intersectRay(depthFinder, helppoint)
                        depth = helppoint.distanceTo(point)
                        collisionNormal = this.calcNormalByVertices(edgePoints1[0].r, edgePoints2[0].r, point)
                        break;
                    case 4:
                        distance=0
                        for(let i = 0; i<collidingPoints.length;i++){
                            for(let j = i + 1; j<collidingPoints.length; j++){
                                if(collidingPoints[i].pC.distanceTo(collidingPoints[j].pC) > distance){
                                    v1 = collidingPoints[i].pC
                                    v2 = collidingPoints[j].pC
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
                        // collisionNormal.copy(this.calcNormal(obb, point))
                        break;
                }
                break;
            case l1 == 1 && l2 == 1:
                diff = containsPoints2[0].clone().sub(containsPoints1[0]).divideScalar(2)
                point = containsPoints1[0].clone().add(diff)
                normal = this.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(this.center, normal.clone())
                obb.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                collisionNormal = this.center.clone().sub(obb.center).normalize().negate()
                break;
            case l1 == 1 && l2 == 0:
                point = containsPoints1[0]
                normal = this.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(this.center, normal.clone())
                obb.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                collisionNormal = this.calcNormalByPoint(obb.getFaces(), point)
                break;
            case l1 == 2 && l2 == 0:
                diff = containsPoints1[1].clone().sub(containsPoints1[0]).divideScalar(2)
                point = containsPoints1[0].clone().add(diff)
                normal = this.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(this.center, normal.clone())
                obb.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                collisionNormal = this.calcNormalByPoint(obb.getFaces(), point)
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
                collisionNormal = this.calcNormalByPoint(obb.getFaces(), point)
                break;

            case l1 == 0 && l2 == 1:
                point = containsPoints2[0]
                normal = obb.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(obb.center, normal.clone())
                this.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                collisionNormal = this.calcNormalByPoint(this.getFaces(), point)
                break;
            case l1 == 0 && l2 == 2:
                diff = containsPoints2[1].clone().sub(containsPoints2[0]).divideScalar(2)
                point = containsPoints2[0].clone().add(diff)
                normal = obb.center.clone().sub(point).normalize().negate()
                depthFinder = new Ray(obb.center, normal.clone())
                this.intersectRay(depthFinder, helppoint)
                depth = helppoint.distanceTo(point)
                collisionNormal = this.calcNormalByPoint(this.getFaces(), point)
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
                collisionNormal = this.calcNormalByPoint(this.getFaces(), point)
                break;
        }
        return {point, depth, collisionNormal}
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
          [vertices[0], vertices[1], vertices[2]], // ściana 1
          [vertices[0], vertices[2], vertices[3]], // ściana 2
          [vertices[4], vertices[5], vertices[6]], // ściana 3
          [vertices[4], vertices[6], vertices[7]], // ściana 4
          [vertices[0], vertices[4], vertices[5]], // ściana 5
          [vertices[0], vertices[5], vertices[1]], // ściana 6
          [vertices[1], vertices[5], vertices[6]], // ściana 7
          [vertices[1], vertices[6], vertices[2]], // ściana 8
          [vertices[2], vertices[6], vertices[7]], // ściana 9
          [vertices[2], vertices[7], vertices[3]], // ściana 10
          [vertices[3], vertices[7], vertices[4]], // ściana 11
          [vertices[3], vertices[4], vertices[0]], // ściana 12
        ]
        return faces
      }
    getVerticesNeighbors() {
        const vertices = this.getVertices();
        const neighbors = [
          [vertices[1], vertices[3], vertices[4]], // vertex 0
          [vertices[0], vertices[2], vertices[5]], // vertex 1
          [vertices[1], vertices[3], vertices[6]], // vertex 2
          [vertices[0], vertices[2], vertices[7]], // vertex 3
          [vertices[0], vertices[5], vertices[7]], // vertex 4
          [vertices[1], vertices[4], vertices[6]], // vertex 5
          [vertices[2], vertices[5], vertices[7]], // vertex 6
          [vertices[3], vertices[4], vertices[6]], // vertex 7
        ]
        return neighbors
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

    calcNormalByPoint(facesToSearch, collisionPoint){
        // liczy normalną z punktu umiesczonego na ścianie
        let minDist = Infinity;
        let closestFace;
        let finalPlane = new Plane
        for (let i = 0; i < facesToSearch.length; i++) {
            let plane = new Plane()
            plane.setFromCoplanarPoints(facesToSearch[i][0], facesToSearch[i][1], facesToSearch[i][2])
            let dist = Math.abs(plane.distanceToPoint(collisionPoint))
            if (dist < minDist) {
                minDist = dist
                closestFace = facesToSearch[i];
            }
        }
        finalPlane.setFromCoplanarPoints(closestFace[0], closestFace[1], closestFace[2])
        return finalPlane.normal
    }
    calcNormalByVertices(r1, r2, collisionPoint){
        // liczy normalną z punktu umiesczonego na krawędzi
        let plane = new Plane()
        plane.setFromCoplanarPoints(r1[0], r1[1], r2[0])
        return plane.normal.negate()
        }
}

export { OBBs };
