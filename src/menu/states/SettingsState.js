import { GameState } from "../GameState.js";
import { Button } from "../Button.js";
import {
  drawSettingsScreen,
  getSettingsGyroButtonRect,
  getSettingsDiffButtonRects,
  getSettingsSliderRect,
} from "../../rendering/screen-renderer.js";

export class SettingsState extends GameState {
  constructor(deps) {
    super();
    this._deps = deps;
    this._backBtn = new Button();
    this._gyroBtn = new Button();
    this._diffBtns = [new Button(), new Button(), new Button()];
    // Slider drag state
    this._sliderDragging = false;
    this._sliderRect = null;
  }

  render(ctx, w, h) {
    drawSettingsScreen(ctx, w, h, this._deps.getGameState());

    // Overlay press feedback: gyro button
    const gyroRect = getSettingsGyroButtonRect(w, h);
    if (gyroRect) {
      this._gyroBtn.setRect(gyroRect.x, gyroRect.y, gyroRect.w, gyroRect.h);
      this._gyroBtn.renderPressOverlay(ctx);
    }

    // Overlay press feedback: difficulty buttons
    const diffRects = getSettingsDiffButtonRects(w, h);
    diffRects.forEach((r, i) => {
      this._diffBtns[i].setRect(r.x, r.y, r.w, r.h);
      this._diffBtns[i].renderPressOverlay(ctx);
    });

    // Cache slider rect for drag calculations
    this._sliderRect = getSettingsSliderRect(w, h);

    // Back button covers lower strip of screen (below all settings)
    const thumbY = h * 0.88;
    this._backBtn.setRect(0, thumbY, w, h - thumbY);
    this._backBtn.renderPressOverlay(ctx);
  }

  onPointerDown(x, y) {
    // Difficulty selector
    for (let i = 0; i < this._diffBtns.length; i++) {
      if (this._diffBtns[i].isHit(x, y)) {
        this._diffBtns[i].pressed = true;
        requestAnimationFrame(() => this._deps.callbacks.setDifficulty?.(i));
        return;
      }
    }

    // Gyro sensor button
    if (this._gyroBtn.isHit(x, y)) {
      this._gyroBtn.pressed = true;
      requestAnimationFrame(() => {
        this._deps.callbacks.requestGyroPermission?.();
        this._deps.callbacks.onGyroActivated?.();
      });
      return;
    }

    // Slider
    if (this._sliderRect && this._hitSlider(x, y)) {
      this._sliderDragging = true;
      this._updateSliderFromX(x);
      return;
    }

    // Back
    if (this._backBtn.isHit(x, y)) {
      this._backBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.backToMenu());
    }
  }

  onPointerMove(x, _y) {
    if (this._sliderDragging) {
      this._updateSliderFromX(x);
    }
  }

  onPointerUp(_x, _y) {
    this._backBtn.pressed = false;
    this._gyroBtn.pressed = false;
    this._diffBtns.forEach((b) => (b.pressed = false));
    this._sliderDragging = false;
  }

  _hitSlider(x, y) {
    const r = this._sliderRect;
    if (!r) return false;
    const pad = 0;
    return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - 20 && y <= r.y + r.h + 20;
  }

  _updateSliderFromX(x) {
    const r = this._sliderRect;
    if (!r) return;
    const thumbR = Math.max(8, Math.round(r.h * 0.38));
    const trackLeft = r.x + thumbR;
    const trackRight = r.x + r.w - thumbR;
    const t = Math.max(0, Math.min(1, (x - trackLeft) / (trackRight - trackLeft)));
    const minVal = 8;
    const maxVal = 28;
    const value = Math.round(minVal + t * (maxVal - minVal));
    this._deps.callbacks.setGyroSensitivity?.(value);
  }
}
