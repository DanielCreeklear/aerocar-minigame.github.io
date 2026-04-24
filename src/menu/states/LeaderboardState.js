import { GameState } from "../GameState.js";
import { Button } from "../Button.js";
import { drawLeaderboardScreen } from "../../rendering/screen-renderer.js";

export class LeaderboardState extends GameState {
  constructor(deps) {
    super();
    this._deps = deps;
    this._backBtn = new Button();
  }

  render(ctx, w, h) {
    drawLeaderboardScreen(ctx, w, h, this._deps.getGameState(), this._deps.track);
    // Back button occupies left half of footer for easy tap
    const footerH = 40;
    this._backBtn.setRect(0, h - footerH, w * 0.5, footerH);
    this._backBtn.renderPressOverlay(ctx);
  }

  onPointerDown(x, y) {
    if (this._backBtn.isHit(x, y)) {
      this._backBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.backToMenu());
    }
  }

  onPointerUp() {
    this._backBtn.pressed = false;
  }
}
