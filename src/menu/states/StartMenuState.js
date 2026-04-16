import { GameState } from "../GameState.js";
import { Button } from "../Button.js";
import { drawStartScreen } from "../../rendering/screen-renderer.js";


export class StartMenuState extends GameState {
  
  constructor(deps) {
    super();
    this._deps = deps;
    this._ctaBtn = new Button();
    this._settingsBtn = new Button();
  }

  render(ctx, w, h) {
    drawStartScreen(ctx, w, h, this._deps.getGameState(), this._deps.track);

    const thumbY = h * 0.65;
    this._ctaBtn.setRect(0, thumbY, w, h - thumbY);
    this._ctaBtn.renderPressOverlay(ctx);

    const btnSzEst = Math.max(18, Math.min(28, w * 0.06));
    this._settingsBtn.setRect(0, 0, btnSzEst * 6, btnSzEst + 16);
  }

  onPointerDown(x, y) {
    if (this._settingsBtn.isHit(x, y)) {
      this._settingsBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.openSettings());
      return;
    }
    if (this._ctaBtn.isHit(x, y)) {
      this._ctaBtn.pressed = true;
      
      requestAnimationFrame(() => this._deps.callbacks.startRace());
    }
  }

  onPointerUp(_x, _y) {
    this._ctaBtn.pressed = false;
    this._settingsBtn.pressed = false;
  }
}
