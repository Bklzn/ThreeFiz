import * as THREE from "three";
import ThreeFiz from "./ThreeFiz";
class Grabber {
  raycaster: THREE.Raycaster;
  SCENE: THREE.Scene;
  CAMERA: THREE.Camera;
  objects: ThreeFiz["boxes"] | ThreeFiz["spheres"];
  distance: number;
  prevPos: THREE.Vector3;
  vel: THREE.Vector3;
  time: number;
  renderer: THREE.WebGLRenderer;
  grabbed: null | { object: any; pos: THREE.Vector3 | null };
  cameraControls: any;
  constructor({
    renderer,
    scene,
    camera,
    cameraControls = null,
    objectsToGrab = [],
  }: {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.Camera;
    cameraControls?: any;
    objectsToGrab?: ThreeFiz["boxes"] | ThreeFiz["spheres"];
  }) {
    this.SCENE = scene;
    this.CAMERA = camera;
    this.raycaster = new THREE.Raycaster();
    // this.raycaster.layers.set(1);
    // this.raycaster.params.Line.threshold = 0.1;
    this.objects = objectsToGrab;
    this.distance = 0.0;
    this.prevPos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.time = 0.0;
    this.renderer = renderer;
    this.grabbed = null;
    this.cameraControls = cameraControls;
    window.addEventListener("mousemove", this.controls.bind(this));
    window.addEventListener("mousedown", this.controls.bind(this));
    window.addEventListener("mouseup", this.controls.bind(this));
  }
  controls(event: {
    preventDefault: () => void;
    type: string;
    clientX: any;
    clientY: any;
  }) {
    event.preventDefault();
    if (event.type == "mousedown") {
      this.start(event.clientX, event.clientY);
      if (this.grabbed) {
        this.cameraControls.enabled = false;
      }
    } else if (event.type == "mousemove" && this.grabbed) {
      this.move(event.clientX, event.clientY);
    } else if (event.type == "mouseup") {
      this.end();
      this.cameraControls.enabled = true;
    }
  }
  update() {
    this.time += 13;
    if (this.grabbed) {
      let pos = this.raycaster.ray.origin.clone();
      pos.addScaledVector(this.raycaster.ray.direction, this.distance);

      this.grabbed.object.position = pos;
      this.grabbed.object.velocity.set(0, 0, 0);
    }
  }
  updateRaycaster(x: number, y: number) {
    let rect = this.renderer.domElement.getBoundingClientRect();
    let mousePos = new THREE.Vector2();
    mousePos.x = ((x - rect.left) / rect.width) * 2 - 1;
    mousePos.y = -((y - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(mousePos, this.CAMERA);
  }
  start(x: number, y: number) {
    this.updateRaycaster(x, y);
    let intersects = this.raycaster.intersectObjects(this.SCENE.children);
    if (intersects.length > 0) {
      this.objects.forEach((el, _idx) => {
        if (el.mesh === intersects[0].object) {
          this.grabbed = {
            object: el,
            pos: null,
          };
          return;
        }
      });
      if (this.grabbed) {
        this.distance = intersects[0].distance;
        var pos = this.raycaster.ray.origin.clone();
        pos.addScaledVector(this.raycaster.ray.direction, this.distance);
        this.grabbed.object.position = pos;
        this.grabbed.object.velocity.set(0, 0, 0);
        this.prevPos.copy(pos);
        this.vel.set(0.0, 0.0, 0.0);
        this.time = 0.0;
      }
    }
  }
  move(x: number, y: number) {
    if (this.grabbed) {
      this.updateRaycaster(x, y);
      var pos = this.raycaster.ray.origin.clone();
      pos.addScaledVector(this.raycaster.ray.direction, this.distance);

      this.vel.copy(pos);
      this.vel.sub(this.prevPos);
      if (this.time > 0.0) this.vel.multiplyScalar(this.time * 100);
      else this.vel.set(0.0, 0.0, 0.0);
      this.prevPos.copy(pos);
      this.time = 0.0;

      this.grabbed.object.velocity.set(0, 0, 0);
      this.grabbed.object.position = pos;
    }
  }
  end() {
    if (this.grabbed) {
      this.grabbed.object.velocity.copy(this.vel);
      this.grabbed = null;
    }
  }
}
export default Grabber;
