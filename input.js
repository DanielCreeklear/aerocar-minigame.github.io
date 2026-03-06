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
    this.lastTouchTimestamp = 0;
    this.virtualBoostHoldCount = 0;
    this.bindEvents();
  }

  getCanvasX(clientX) {
    const rect = this.canvas.getBoundingClientRect();

    if (!rect.width) {
      return clientX;
    }

    const normalizedX =
      ((clientX - rect.left) / rect.width) * this.canvas.width;
    return Math.max(0, Math.min(this.canvas.width, normalizedX));
  }

  isLikelySyntheticMouse() {
    return Date.now() - this.lastTouchTimestamp < 700;
  }

  bindEvents() {
    const getRatios = () =>
      getInputRatios(this.canvas.width, this.canvas.height);
    const updateBoostFromActiveTouches = (touchList) => {
      const ratios = getRatios();
      const rightBoundary = this.canvas.width * ratios.right;
      const hasRightTouch = Array.from(touchList).some(
        (touch) => this.getCanvasX(touch.clientX) >= rightBoundary,
      );

      this.game.setBoost(hasRightTouch);
    };

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        this.lastTouchTimestamp = Date.now();
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i += 1) {
          const touchX = this.getCanvasX(e.changedTouches[i].clientX);
          this.game.handleInput(touchX, true);
        }

        updateBoostFromActiveTouches(e.touches);
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        this.lastTouchTimestamp = Date.now();
        e.preventDefault();
        updateBoostFromActiveTouches(e.touches);
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "touchend",
      (e) => {
        this.lastTouchTimestamp = Date.now();
        e.preventDefault();
        updateBoostFromActiveTouches(e.touches);
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "touchcancel",
      (e) => {
        this.lastTouchTimestamp = Date.now();
        e.preventDefault();
        updateBoostFromActiveTouches(e.touches);
      },
      { passive: false },
    );

    this.canvas.addEventListener("mousedown", (e) => {
      if (this.isLikelySyntheticMouse()) {
        return;
      }
      this.game.handleInput(this.getCanvasX(e.clientX), true);
    });

    this.canvas.addEventListener("mouseup", (e) => {
      if (this.isLikelySyntheticMouse()) {
        return;
      }
      this.game.handleInput(this.getCanvasX(e.clientX), false);
    });

    window.addEventListener("keydown", (e) => {
      const ratios = getRatios();
      if (PREVENT_DEFAULT_KEYS.includes(e.code)) e.preventDefault();
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

    this.bindVirtualControls(getRatios);
  }

  bindVirtualControls(getRatios) {
    const leftBtn = document.getElementById("control-left");
    const rightBtn = document.getElementById("control-right");
    const boostBtn = document.getElementById("control-boost");

    if (!leftBtn || !rightBtn || !boostBtn) {
      return;
    }

    const leftX = () => this.canvas.width * getRatios().left;
    const rightX = () => this.canvas.width * getRatios().right;
    const isRaceScreen = () =>
      this.game.gameState.currentScreen === SCREENS.RACE;

    const blockEvent = (event) => {
      this.lastTouchTimestamp = Date.now();
      event.preventDefault();
      event.stopPropagation();
    };

    const bindPressButton = (button, onPress) => {
      button.addEventListener("pointerdown", (event) => {
        blockEvent(event);
        button.classList.add("active");
        onPress();
      });

      const release = (event) => {
        blockEvent(event);
        button.classList.remove("active");
      };

      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    };

    const bindHoldButton = (button, onDown, onUp) => {
      button.addEventListener("pointerdown", (event) => {
        blockEvent(event);
        button.classList.add("active");
        onDown();
      });

      const release = (event) => {
        blockEvent(event);
        button.classList.remove("active");
        onUp();
      };

      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    };

    bindPressButton(leftBtn, () => {
      this.game.handleInput(leftX(), true);
    });

    const holdBoostStart = () => {
      if (!isRaceScreen()) {
        this.game.handleInput(rightX(), true);
        return;
      }

      this.virtualBoostHoldCount += 1;
      this.game.setBoost(true);
    };

    const holdBoostEnd = () => {
      if (!isRaceScreen()) {
        return;
      }

      this.virtualBoostHoldCount = Math.max(0, this.virtualBoostHoldCount - 1);
      if (this.virtualBoostHoldCount === 0) {
        this.game.setBoost(false);
      }
    };

    bindHoldButton(rightBtn, holdBoostStart, holdBoostEnd);
    bindHoldButton(boostBtn, holdBoostStart, holdBoostEnd);
  }
}

export { InputController };
