import {
  ACTION_KEYS,
  getInputRatios,
  MODE_BUTTON_X_MIN_RATIO,
  MODE_BUTTON_X_MAX_RATIO,
  MODE_BUTTON_Y_MIN_RATIO,
  PREVENT_DEFAULT_KEYS,
  STEER_DEADZONE_DEG,
  STEER_MAX_TILT_DEG,
  STEER_DEADZONE_MS2,
  STEER_MAX_TILT_MS2,
} from "../constants/index.js";
import {
  browserSupportsDeviceOrientation,
  browserSupportsDeviceMotion,
  requiresOrientationPermission,
  requiresMotionPermission,
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
function normalizeTiltMs2(raw) {
  const sign = Math.sign(raw);
  const abs = Math.abs(raw);
  if (abs < STEER_DEADZONE_MS2) return 0;
  return (
    sign *
    Math.min(
      1,
      (abs - STEER_DEADZONE_MS2) / (STEER_MAX_TILT_MS2 - STEER_DEADZONE_MS2),
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
    this._lastGyroSteer = null; // track last emitted value to avoid redundant zero-spam
    this._activePointers = new Map();
    this._iosPermissionRequested = false;
    this._orientationBound = false;
    this._motionBound = false;
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
    // Mode button only exists during an active race; ignore outside RACE to
    // avoid swallowing taps on menu footer buttons (CONFIG, TUTORIAL, etc.)
    if (!this.handlers.isRaceActive?.()) return false;
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
      const steerValue = normalizeTilt(raw);
      // Only emit if value changed, preventing repeated zero-events from the
      // deadzone from continuously resetting steerTarget mid-race.
      if (steerValue !== this._lastGyroSteer) {
        this._lastGyroSteer = steerValue;
        this.handlers.onSteerChange(steerValue);
      }
    });
  }
  _bindDeviceMotionEvent() {
    if (this._motionBound) return;
    this._motionBound = true;
    const probeTimer = setTimeout(() => {
      if (!this._gyroscopeActive) {
        this._motionBound = false;
      }
    }, ORIENTATION_PROBE_TIMEOUT);
    window.addEventListener("devicemotion", (e) => {
      if (!this._gyroscopeActive) {
        clearTimeout(probeTimer);
        this._gyroscopeActive = true;
      }
      const ag = e.accelerationIncludingGravity;
      if (!ag) return;
      const screenAngle =
        (screen.orientation && screen.orientation.angle) ||
        window.orientation ||
        0;
      let raw;
      if (screenAngle === 90) {
        raw = ag.y != null ? -ag.y : 0;
      } else if (screenAngle === -90 || screenAngle === 270) {
        raw = ag.y != null ? ag.y : 0;
      } else {
        raw = ag.x != null ? ag.x : 0;
      }
      const steerValue = normalizeTiltMs2(raw);
      // Only emit if value changed, preventing repeated zero-events from the
      // deadzone from continuously resetting steerTarget mid-race.
      if (steerValue !== this._lastGyroSteer) {
        this._lastGyroSteer = steerValue;
        this.handlers.onSteerChange(steerValue);
      }
    });
  }
  _requestIOSOrientationPermission() {
    if (this._iosPermissionRequested) return;
    this._iosPermissionRequested = true;
    if (requiresMotionPermission) {
      DeviceMotionEvent.requestPermission()
        .then((state) => {
          if (state === "granted") {
            this._bindDeviceMotionEvent();
            this.handlers.onGyroPermissionChange?.("granted");
          } else {
            this.handlers.onGyroPermissionChange?.("denied");
          }
        })
        .catch(() => {
          this.handlers.onGyroPermissionChange?.("denied");
        });
    } else if (requiresOrientationPermission) {
      DeviceOrientationEvent.requestPermission()
        .then((state) => {
          if (state === "granted") {
            this._bindDeviceOrientationEvent();
            this.handlers.onGyroPermissionChange?.("granted");
          } else {
            this.handlers.onGyroPermissionChange?.("denied");
          }
        })
        .catch(() => {
          this.handlers.onGyroPermissionChange?.("denied");
        });
    }
  }
  requestOrientationPermission() {
    this._requestIOSOrientationPermission();
  }
  resetInputState() {
    this._activePointers.clear();
    this.isKeyBraking = false;
    this.isKeyBoosting = false;
    this.handlers.onBrakeChange(false);
    this.handlers.onBoostChange(false);
    this.handlers.onSteerChange(0);
  }
  bindEvents() {
    const activePointers = this._activePointers;
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
        } catch (_) {}
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
      if (
        e.code === ACTION_KEYS.SPACE ||
        e.code === ACTION_KEYS.ENTER ||
        e.code === ACTION_KEYS.ARROW_UP
      ) {
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
      if (e.code === ACTION_KEYS.KEY_C && !e.repeat) {
        this.handlers.onTelemetryExportCSV?.();
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
      if (e.code === ACTION_KEYS.SPACE || e.code === ACTION_KEYS.ARROW_UP) {
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
    if (!requiresMotionPermission && !requiresOrientationPermission) {
      if (isIOSWithoutPermission) {
        this.handlers.onGyroscopeUnavailable?.();
      } else if (browserSupportsDeviceMotion) {
        this._bindDeviceMotionEvent();
      } else if (browserSupportsDeviceOrientation) {
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
