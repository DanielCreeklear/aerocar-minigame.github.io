import {
  ACTION_KEYS,
  LEFT_INPUT_RATIO,
  PREVENT_DEFAULT_KEYS,
  RIGHT_INPUT_RATIO,
  SCREENS,
  SCREEN_HALF_RATIO,
} from "./constants/index.js";

class InputController {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.isLeftKeyPressed = false;
    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener("touchstart", (e) => {
      for (let i = 0; i < e.touches.length; i++)
        this.game.handleInput(e.touches[i].clientX, true);
    });

    this.canvas.addEventListener("touchend", (e) => {
      let rightSideTouched = Array.from(e.touches).some(
        (t) => t.clientX >= this.canvas.width * SCREEN_HALF_RATIO,
      );
      if (!rightSideTouched) this.game.setBoost(false);
    });

    this.canvas.addEventListener("mousedown", (e) =>
      this.game.handleInput(e.clientX, true),
    );
    this.canvas.addEventListener("mouseup", (e) =>
      this.game.handleInput(e.clientX, false),
    );

    window.addEventListener("keydown", (e) => {
      if (PREVENT_DEFAULT_KEYS.includes(e.code))
        e.preventDefault();
      if (e.code === ACTION_KEYS.SPACE || e.code === ACTION_KEYS.ENTER) {
        this.game.handleInput(this.canvas.width * SCREEN_HALF_RATIO, true);
        return;
      }
      if (this.game.gameState.currentScreen === SCREENS.RACE) {
        if (e.code === ACTION_KEYS.ARROW_LEFT || e.code === ACTION_KEYS.KEY_A) {
          if (!this.isLeftKeyPressed) {
            this.game.handleInput(this.canvas.width * LEFT_INPUT_RATIO, true);
            this.isLeftKeyPressed = true;
          }
        }
        if (e.code === ACTION_KEYS.ARROW_RIGHT || e.code === ACTION_KEYS.KEY_D)
          this.game.handleInput(this.canvas.width * RIGHT_INPUT_RATIO, true);
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === ACTION_KEYS.ARROW_LEFT || e.code === ACTION_KEYS.KEY_A)
        this.isLeftKeyPressed = false;
      if (e.code === ACTION_KEYS.ARROW_RIGHT || e.code === ACTION_KEYS.KEY_D) {
        this.game.handleInput(this.canvas.width * RIGHT_INPUT_RATIO, false);
        this.game.setBoost(false);
      }
    });
  }
}

export { InputController };
