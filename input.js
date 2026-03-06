import {
  ACTION_KEYS,
  getInputRatios,
  MODE_CORNER_X_RATIO,
  MODE_CORNER_Y_RATIO,
  PREVENT_DEFAULT_KEYS,
} from "./constants/index.js";

class InputController {
  constructor(canvas, handlers) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.lastTouchTimestamp = 0;
    this.isKeyBraking = false;
    this.isKeyBoosting = false;
    this.bindEvents();
  }

  getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width ? this.canvas.width / rect.width : 1;
    const scaleY = rect.height ? this.canvas.height / rect.height : 1;
    return {
      x: Math.max(0, Math.min(this.canvas.width, (clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(this.canvas.height, (clientY - rect.top) * scaleY)),
    };
  }

  isInModeCorner(x, y) {
    return (
      x >= this.canvas.width * MODE_CORNER_X_RATIO &&
      y <= this.canvas.height * MODE_CORNER_Y_RATIO
    );
  }

  isInBoostZone(x) {
    const ratios = getInputRatios(this.canvas.width, this.canvas.height);
    return x >= this.canvas.width * ratios.right;
  }

  isInBrakeZone(x) {
    const ratios = getInputRatios(this.canvas.width, this.canvas.height);
    return x <= this.canvas.width * ratios.left;
  }

  isLikelySyntheticMouse() {
    return Date.now() - this.lastTouchTimestamp < 700;
  }

  evaluateTouchStates(touchList) {
    let hasBrake = false;
    let hasBoost = false;

    Array.from(touchList).forEach((touch) => {
      const { x, y } = this.getCanvasCoords(touch.clientX, touch.clientY);
      // Mode-corner touches are handled as a one-shot toggle in touchstart;
      // they do not count as brake or boost holds.
      if (this.isInModeCorner(x, y)) return;
      if (this.isInBoostZone(x)) hasBoost = true;
      else if (this.isInBrakeZone(x)) hasBrake = true;
    });

    this.handlers.onBrakeChange(hasBrake);
    this.handlers.onBoostChange(hasBoost);
  }

  bindEvents() {
    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        this.lastTouchTimestamp = Date.now();
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i += 1) {
          const { x, y } = this.getCanvasCoords(
            e.changedTouches[i].clientX,
            e.changedTouches[i].clientY,
          );
          if (this.isInModeCorner(x, y)) {
            this.handlers.onModeToggle();
          } else if (!this.isInBoostZone(x) && !this.isInBrakeZone(x)) {
            this.handlers.onScreenTap(x, y);
          }
        }

        this.evaluateTouchStates(e.touches);
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        this.lastTouchTimestamp = Date.now();
        e.preventDefault();
        this.evaluateTouchStates(e.touches);
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "touchend",
      (e) => {
        this.lastTouchTimestamp = Date.now();
        e.preventDefault();
        this.evaluateTouchStates(e.touches);
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "touchcancel",
      (e) => {
        this.lastTouchTimestamp = Date.now();
        e.preventDefault();
        this.evaluateTouchStates(e.touches);
      },
      { passive: false },
    );

    this.canvas.addEventListener("mousedown", (e) => {
      if (this.isLikelySyntheticMouse()) return;
      const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
      if (this.isInModeCorner(x, y)) {
        this.handlers.onModeToggle();
      } else if (this.isInBoostZone(x)) {
        this.handlers.onBoostChange(true);
      } else if (this.isInBrakeZone(x)) {
        this.handlers.onBrakeChange(true);
      } else {
        this.handlers.onScreenTap(x, y);
      }
    });

    this.canvas.addEventListener("mouseup", (e) => {
      if (this.isLikelySyntheticMouse()) return;
      const { x } = this.getCanvasCoords(e.clientX, e.clientY);
      if (this.isInBoostZone(x)) this.handlers.onBoostChange(false);
      else if (this.isInBrakeZone(x)) this.handlers.onBrakeChange(false);
    });

    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    window.addEventListener("keydown", (e) => {
      if (PREVENT_DEFAULT_KEYS.includes(e.code)) e.preventDefault();

      if (e.code === ACTION_KEYS.SPACE || e.code === ACTION_KEYS.ENTER) {
        if (!this.isKeyBoosting) {
          this.isKeyBoosting = true;
          this.handlers.onBoostChange(true);
          this.handlers.onScreenTap(
            this.canvas.width * 0.5,
            this.canvas.height * 0.5,
          );
        }
        return;
      }

      if (
        (e.code === ACTION_KEYS.KEY_Z || e.code === ACTION_KEYS.KEY_X) &&
        !e.repeat
      ) {
        this.handlers.onModeToggle();
        return;
      }

      if (
        e.code === ACTION_KEYS.ARROW_DOWN ||
        e.code === ACTION_KEYS.KEY_S
      ) {
        if (!this.isKeyBraking) {
          this.isKeyBraking = true;
          this.handlers.onBrakeChange(true);
        }
        return;
      }

      if (
        e.code === ACTION_KEYS.ARROW_RIGHT ||
        e.code === ACTION_KEYS.KEY_D
      ) {
        if (!this.isKeyBoosting) {
          this.isKeyBoosting = true;
          this.handlers.onBoostChange(true);
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      if (
        e.code === ACTION_KEYS.ARROW_DOWN ||
        e.code === ACTION_KEYS.KEY_S
      ) {
        this.isKeyBraking = false;
        this.handlers.onBrakeChange(false);
      }

      if (
        e.code === ACTION_KEYS.SPACE ||
        e.code === ACTION_KEYS.ARROW_RIGHT ||
        e.code === ACTION_KEYS.KEY_D
      ) {
        this.isKeyBoosting = false;
        this.handlers.onBoostChange(false);
      }
    });
  }
}

export { InputController };

