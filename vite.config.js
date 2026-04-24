import { defineConfig } from "vite";
import { resolve } from "path";





const base = "/aerocar-minigame.github.io/";

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        play: resolve(__dirname, "play/index.html"),
      },
    },
  },
});
