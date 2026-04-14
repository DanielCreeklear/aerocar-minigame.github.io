import { Game } from "./core/game.js";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");

  const game = new Game(canvas);
  game.start();
});
