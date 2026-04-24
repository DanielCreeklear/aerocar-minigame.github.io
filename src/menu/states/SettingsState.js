import { GameState } from "../GameState.js";
import { Button } from "../Button.js";
import { drawSettingsScreen, getSettingsGyroButtonRect } from "../../rendering/screen-renderer.js";
export class SettingsState extends GameState {
  constructor(deps) {
    super();
    this._deps = deps;
    this._backBtn = new Button();
    this._gyroBtn = new Button();
  }
  render(ctx, w, h) {
    drawSettingsScreen(ctx, w, h, this._deps.getGameState());
    const gs = this._deps.getGameState();
    const gyroRect = getSettingsGyroButtonRect(w, h);
    if (gyroRect) {
      this._gyroBtn.setRect(gyroRect.x, gyroRect.y, gyroRect.w, gyroRect.h);
      this._gyroBtn.renderPressOverlay(ctx);
    }
    const thumbY = h * 0.65;
    this._backBtn.setRect(0, thumbY, w, h - thumbY);
    this._backBtn.renderPressOverlay(ctx);
  }
  onPointerDown(x, y) {
    const gs = this._deps.getGameState();
    if (this._gyroBtn.isHit(x, y)) {
      this._gyroBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.requestGyroPermission?.());
      return;
    }
    if (this._backBtn.isHit(x, y)) {
      this._backBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.backToMenu());
    }
  }
  onPointerUp(_x, _y) {
    this._backBtn.pressed = false;
    this._gyroBtn.pressed = false;
  }
}