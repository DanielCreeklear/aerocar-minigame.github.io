import { Game } from "./core/game.js";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");

  if (!canvas || !canvas.getContext("2d")) {
    document.body.textContent = "Canvas not supported in this browser.";
    return;
  }

  const game = new Game(canvas);
  game.start();
});
