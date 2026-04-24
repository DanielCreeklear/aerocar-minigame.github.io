import { defineConfig } from "vite";
import { resolve } from "path";





const base =
  process.env.NODE_ENV === "production" ? "/f1-2026-minigame/" : "/";

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
