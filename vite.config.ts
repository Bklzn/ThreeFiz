import { defineConfig } from "vite";

export default defineConfig({
  base: "/ThreeFiz",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        cannon: "demos/cannon.html",
        objectsFloor: "demos/objects&floor.html",
        frictionTest: "demos/fricitionTest.html",
      },
      output: {
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
