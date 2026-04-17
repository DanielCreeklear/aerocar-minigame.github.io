import { GameState } from "../GameState.js";
import { Button } from "../Button.js";
import { drawSettingsScreen } from "../../rendering/screen-renderer.js";
export class SettingsState extends GameState {
  constructor(deps) {
    super();
    this._deps = deps;
    this._backBtn = new Button();
  }
  render(ctx, w, h) {
    drawSettingsScreen(ctx, w, h, this._deps.getGameState());
    const thumbY = h * 0.65;
    this._backBtn.setRect(0, thumbY, w, h - thumbY);
    this._backBtn.renderPressOverlay(ctx);
  }
  onPointerDown(x, y) {
    if (this._backBtn.isHit(x, y)) {
      this._backBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.backToMenu());
    }
  }
  onPointerUp(_x, _y) {
    this._backBtn.pressed = false;
  }
}