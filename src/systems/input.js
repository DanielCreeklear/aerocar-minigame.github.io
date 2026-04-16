import {
  ACTION_KEYS,
  getInputRatios,
  MODE_BUTTON_X_MIN_RATIO,
  MODE_BUTTON_X_MAX_RATIO,
  MODE_BUTTON_Y_MIN_RATIO,
  PREVENT_DEFAULT_KEYS,
  STEER_DEADZONE_DEG,
  STEER_MAX_TILT_DEG,
} from "../constants/index.js";
import {
  browserSupportsDeviceOrientation,
  requiresOrientationPermission,
  isIOSWithoutPermission,
} from "../utils/platform.js";

function normalizeTilt(raw) {
  const sign = Math.sign(raw);
  const abs = Math.abs(raw);
  if (abs < STEER_DEADZONE_DEG) return 0;
  return (
    sign *
    Math.min(
      1,
      (abs - STEER_DEADZONE_DEG) / (STEER_MAX_TILT_DEG - STEER_DEADZONE_DEG),
    )
  );
}


const ORIENTATION_PROBE_TIMEOUT = 2000;

class InputController {
  constructor(canvas, handlers) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.isKeyBraking = false;
    this.isKeyBoosting = false;
    this._iosPermissionRequested = false;
    this._orientationBound = false;
    this._gyroscopeActive = false;
    this.bindEvents();
  }

  getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width ? this.canvas.width / rect.width : 1;
    const scaleY = rect.height ? this.canvas.height / rect.height : 1;
    return {
      x: Math.max(
        0,
        Math.min(this.canvas.width, (clientX - rect.left) * scaleX),
      ),
      y: Math.max(
        0,
        Math.min(this.canvas.height, (clientY - rect.top) * scaleY),
      ),
    };
  }

  isInModeButton(x, y) {
    return (
      x >= this.canvas.width * MODE_BUTTON_X_MIN_RATIO &&
      x <= this.canvas.width * MODE_BUTTON_X_MAX_RATIO &&
      y >= this.canvas.height * MODE_BUTTON_Y_MIN_RATIO
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

  _bindDeviceOrientationEvent() {
    if (this._orientationBound) return;
    this._orientationBound = true;


    const probeTimer = setTimeout(() => {
      if (!this._gyroscopeActive) {
        this._orientationBound = false;
      }
    }, ORIENTATION_PROBE_TIMEOUT);

    window.addEventListener("deviceorientation", (e) => {
      if (!this._gyroscopeActive) {
        clearTimeout(probeTimer);
        this._gyroscopeActive = true;
      }

      const screenAngle =
        (screen.orientation && screen.orientation.angle) ||
        window.orientation ||
        0;

      let raw;
      if (screenAngle === 90) {
        raw = -e.beta;
      } else if (screenAngle === -90 || screenAngle === 270) {
        raw = e.beta;
      } else {
        raw = e.gamma;
      }

      if (raw === null || raw === undefined) return;
      this.handlers.onSteerChange(normalizeTilt(raw));
    });
  }

  _requestIOSOrientationPermission() {
    if (this._iosPermissionRequested) return;
    this._iosPermissionRequested = true;

    if (requiresOrientationPermission) {
      DeviceOrientationEvent.requestPermission()
        .then((state) => {
          if (state === "granted") {
            this._bindDeviceOrientationEvent();
          }
        })
        .catch(() => {});
    }
  }

  bindEvents() {

    
    
    const activePointers = new Map();

    const evaluatePointerStates = () => {
      let hasBrake = false;
      let hasBoost = false;
      for (const { x, y } of activePointers.values()) {
        if (this.isInModeButton(x, y)) continue;
        if (this.isInBoostZone(x)) hasBoost = true;
        else if (this.isInBrakeZone(x)) hasBrake = true;
      }
      this.handlers.onBrakeChange(hasBrake);
      this.handlers.onBoostChange(hasBoost);
    };

    this.canvas.addEventListener(
      "pointerdown",
      (e) => {
        e.preventDefault();
        this._requestIOSOrientationPermission();


        try {
          this.canvas.setPointerCapture(e.pointerId);
        } catch (_) {
          
        }

        const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
        activePointers.set(e.pointerId, { x, y });

        if (this.isInModeButton(x, y)) {
          this.handlers.onModeToggle();
        } else if (
          !this.handlers.isRaceActive?.() ||
          (!this.isInBoostZone(x) && !this.isInBrakeZone(x))
        ) {
          
          this.handlers.onScreenTap(x, y);
          this.handlers.onPointerDown?.(x, y);
        }

        evaluatePointerStates();
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "pointermove",
      (e) => {
        if (!activePointers.has(e.pointerId)) return;
        e.preventDefault();
        const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
        activePointers.set(e.pointerId, { x, y });
        this.handlers.onPointerMove?.(x, y);
        evaluatePointerStates();
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "pointerup",
      (e) => {
        e.preventDefault();
        const prev = activePointers.get(e.pointerId);
        activePointers.delete(e.pointerId);
        if (prev) this.handlers.onPointerUp?.(prev.x, prev.y);
        evaluatePointerStates();
      },
      { passive: false },
    );

    this.canvas.addEventListener("pointercancel", (e) => {
      const prev = activePointers.get(e.pointerId);
      activePointers.delete(e.pointerId);
      if (prev) this.handlers.onPointerUp?.(prev.x, prev.y);
      evaluatePointerStates();
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

      if (e.code === ACTION_KEYS.ARROW_DOWN || e.code === ACTION_KEYS.KEY_S) {
        if (!this.isKeyBraking) {
          this.isKeyBraking = true;
          this.handlers.onBrakeChange(true);
        }
        return;
      }

      if (e.code === ACTION_KEYS.ARROW_LEFT || e.code === ACTION_KEYS.KEY_A) {
        this.handlers.onSteerChange(-1);
        return;
      }

      if (e.code === ACTION_KEYS.ARROW_RIGHT || e.code === ACTION_KEYS.KEY_D) {
        this.handlers.onSteerChange(1);
      }

      if (e.code === ACTION_KEYS.KEY_T && !e.repeat) {
        this.handlers.onTelemetryExport?.();
      }

      if (e.code === ACTION_KEYS.KEY_H && !e.repeat) {
        this.handlers.onTelemetryHudToggle?.();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === ACTION_KEYS.ARROW_DOWN || e.code === ACTION_KEYS.KEY_S) {
        this.isKeyBraking = false;
        this.handlers.onBrakeChange(false);
      }

      if (e.code === ACTION_KEYS.SPACE) {
        this.isKeyBoosting = false;
        this.handlers.onBoostChange(false);
      }

      if (
        e.code === ACTION_KEYS.ARROW_LEFT ||
        e.code === ACTION_KEYS.KEY_A ||
        e.code === ACTION_KEYS.ARROW_RIGHT ||
        e.code === ACTION_KEYS.KEY_D
      ) {
        this.handlers.onSteerChange(0);
      }
    });



    if (browserSupportsDeviceOrientation && !requiresOrientationPermission) {
      if (isIOSWithoutPermission) {
        this.handlers.onGyroscopeUnavailable?.();
      } else {
        this._bindDeviceOrientationEvent();
      }
    }


    
    if (typeof history !== "undefined" && history.pushState) {
      history.pushState({ gameActive: true }, "");
      window.addEventListener("popstate", () => {
        history.pushState({ gameActive: true }, "");
      });
    }
  }
}

export { InputController };
