import {
  ACTION_KEYS,
  getInputRatios,
  PREVENT_DEFAULT_KEYS,
  SCREENS,
} from "./constants/index.js";

class InputController {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.isLeftKeyPressed = false;
    this.bindEvents();
  }

  bindEvents() {
    const getRatios = () => getInputRatios(this.canvas.width, this.canvas.height);

    this.canvas.addEventListener("touchstart", (e) => {
      for (let i = 0; i < e.touches.length; i++)
        this.game.handleInput(e.touches[i].clientX, true);
    });

    this.canvas.addEventListener("touchend", (e) => {
      const ratios = getRatios();
      let rightSideTouched = Array.from(e.touches).some(
        (t) => t.clientX >= this.canvas.width * ratios.screenHalf,
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
      const ratios = getRatios();
      if (PREVENT_DEFAULT_KEYS.includes(e.code))
        e.preventDefault();
      if (e.code === ACTION_KEYS.SPACE || e.code === ACTION_KEYS.ENTER) {
        this.game.handleInput(this.canvas.width * ratios.screenHalf, true);
        return;
      }
      if (this.game.gameState.currentScreen === SCREENS.RACE) {
        if (e.code === ACTION_KEYS.ARROW_LEFT || e.code === ACTION_KEYS.KEY_A) {
          if (!this.isLeftKeyPressed) {
            this.game.handleInput(this.canvas.width * ratios.left, true);
            this.isLeftKeyPressed = true;
          }
        }
        if (e.code === ACTION_KEYS.ARROW_RIGHT || e.code === ACTION_KEYS.KEY_D)
          this.game.handleInput(this.canvas.width * ratios.right, true);
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === ACTION_KEYS.ARROW_LEFT || e.code === ACTION_KEYS.KEY_A)
        this.isLeftKeyPressed = false;
      if (e.code === ACTION_KEYS.ARROW_RIGHT || e.code === ACTION_KEYS.KEY_D) {
        const ratios = getRatios();
        this.game.handleInput(this.canvas.width * ratios.right, false);
        this.game.setBoost(false);
      }
    });
  }
}

export { InputController };
