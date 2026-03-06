import { Game } from "./game.js";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const statusText = document.getElementById("status-text");

  const game = new Game(canvas, statusText);
  game.gameLoop();
});
