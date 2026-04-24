import { defineConfig } from "vite";
import { resolve } from "path";

// Use a relative base so the built site works from GitHub Pages subpaths
// and when opening files locally. This ensures asset URLs in dist are
// relative (./assets/...) instead of absolute (/assets/...).
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        play: resolve(__dirname, "play/index.html"),
      },
    },
  },
});
