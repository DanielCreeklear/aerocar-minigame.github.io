import { GameState } from "../GameState.js";
import { Button } from "../Button.js";
import { drawGameOverScreen } from "../../rendering/screen-renderer.js";


export class GameOverState extends GameState {
  
  constructor(deps) {
    super();
    this._deps = deps;
    this._retryBtn = new Button();
    this._nameEntryBtn = new Button();
  }

  render(ctx, w, h) {
    const gs = this._deps.getGameState();
    drawGameOverScreen(ctx, w, h, gs);

    const isPortrait = h > w;

    
    const thumbY = h * 0.65;
    this._retryBtn.setRect(0, thumbY, w, h - thumbY);


    if (isPortrait) {
      this._nameEntryBtn.setRect(w * 0.1, h * 0.78, w * 0.8, h * 0.09);
    } else {
      this._nameEntryBtn.setRect(w * 0.5, h * 0.76, w * 0.32, h * 0.1);
    }

    if (gs.rankingPhase === "results") {
      this._retryBtn.renderPressOverlay(ctx);
    }
  }

  onPointerDown(x, y) {
    const gs = this._deps.getGameState();

    if (gs.rankingPhase === "entering") {
      
      if (this._nameEntryBtn.isHit(x, y) || this._retryBtn.isHit(x, y)) {
        this._deps.callbacks.focusNameInput();
      }
      return;
    }

    if (gs.rankingPhase === "results") {
      if (this._retryBtn.isHit(x, y)) {
        this._retryBtn.pressed = true;
        requestAnimationFrame(() => this._deps.callbacks.retry());
      }
    }
  }

  onPointerUp(_x, _y) {
    this._retryBtn.pressed = false;
  }
}
