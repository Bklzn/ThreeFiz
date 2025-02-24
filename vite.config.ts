import { defineConfig } from "vite";

export default defineConfig({
  base: "/ThreeFiz",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        twoSpheres: "demos/twoSpheres.html",
        twoBlocks: "demos/twoBlocks.html",
        blockSphere: "demos/block&sphere.html",
        blockFloor: "demos/block&floor.html",
        objectsFloor: "demos/objects&floor.html",
        frictionTest: "demos/fricitionTest.html",
      },
    },
  },
});
