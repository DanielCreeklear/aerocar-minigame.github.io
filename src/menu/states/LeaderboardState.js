import { GameState } from "../GameState.js";
import { Button } from "../Button.js";
import { drawLeaderboardScreen } from "../../rendering/screen-renderer.js";

export class LeaderboardState extends GameState {
  constructor(deps) {
    super();
    this._deps = deps;
    this._backBtn = new Button();
    this._prevBtn = new Button();
    this._nextBtn = new Button();
  }

  render(ctx, w, h) {
    drawLeaderboardScreen(ctx, w, h, this._deps.getGameState(), this._deps.track);
    
    const footerH = 40;
    this._backBtn.setRect(0, h - footerH, w * 0.5, footerH);
    this._backBtn.renderPressOverlay(ctx);

    
    const pad = Math.max(20, w * 0.05);
    const titleSz = Math.max(18, Math.min(36, w * 0.06));
    const ctrlBtnW = Math.min(72, Math.round(w * 0.14));
    const ctrlBtnH = h > w ? 24 : 18;
    const gap = 6;
    const lineY = pad + titleSz + 6;
    const nextBtnX = w - pad - ctrlBtnW;
    const prevBtnX = nextBtnX - (ctrlBtnW + gap);
    const ctrlBtnY = Math.round(lineY + 6);
    const rankings = (this._deps.getGameState() && this._deps.getGameState().rankings) || [];
    const showPagingControls = (rankings && rankings.length) > 10;
    if (showPagingControls) {
      this._prevBtn.setRect(Math.round(prevBtnX), Math.round(ctrlBtnY), Math.round(ctrlBtnW), Math.round(ctrlBtnH));
      this._nextBtn.setRect(Math.round(nextBtnX), Math.round(ctrlBtnY), Math.round(ctrlBtnW), Math.round(ctrlBtnH));
      this._prevBtn.renderPressOverlay(ctx);
      this._nextBtn.renderPressOverlay(ctx);
    } else {
      this._prevBtn.setRect(0,0,0,0);
      this._nextBtn.setRect(0,0,0,0);
    }
  }

  onPointerDown(x, y) {
    if (this._backBtn.isHit(x, y)) {
      this._backBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.backToMenu());
      return;
    }
    if (this._prevBtn.isHit(x, y)) {
      this._prevBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.changeLeaderboardPage(-1));
      return;
    }
    if (this._nextBtn.isHit(x, y)) {
      this._nextBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.changeLeaderboardPage(1));
      return;
    }
  }

  onPointerUp() {
    this._backBtn.pressed = false;
    this._prevBtn.pressed = false;
    this._nextBtn.pressed = false;
  }
}
