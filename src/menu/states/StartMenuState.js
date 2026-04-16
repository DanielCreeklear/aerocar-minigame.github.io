import { GameState } from "../GameState.js";
import { Button } from "../Button.js";
import { drawStartScreen } from "../../rendering/screen-renderer.js";


export class StartMenuState extends GameState {
  
  constructor(deps) {
    super();
    this._deps = deps;
    this._ctaBtn = new Button();
    this._settingsBtn = new Button();
    this._gyroBtn = new Button();
  }

  render(ctx, w, h) {
    drawStartScreen(ctx, w, h, this._deps.getGameState(), this._deps.track);

    const thumbY = h * 0.65;
    this._ctaBtn.setRect(0, thumbY, w, h - thumbY);
    this._ctaBtn.renderPressOverlay(ctx);

    // Hit area for the "⚙ CONFIG" label drawn at top-left in screen-renderer
    // (roughly 8px padding + ~6 chars × max font size 28px wide, height = max 28 + 16 pad)
    this._settingsBtn.setRect(0, 0, Math.round(w * 0.38), Math.round(h * 0.06));

    const gs = this._deps.getGameState();
    if (gs && gs.iosPermissionStatus === "prompt") {
      const isPortrait = h > w;
      if (isPortrait) {
        this._gyroBtn.setRect(0, Math.round(h * 0.51), Math.round(w * 0.9), Math.round(h * 0.1));
      } else {
        this._gyroBtn.setRect(0, Math.round(h * 0.68), Math.round(w * 0.55), Math.round(h * 0.2));
      }
    } else {
      this._gyroBtn.setRect(0, 0, 0, 0);
    }
  }

  onPointerDown(x, y) {
    if (this._settingsBtn.isHit(x, y)) {
      this._settingsBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.openSettings());
      return;
    }
    const gs = this._deps.getGameState();
    if (gs && gs.iosPermissionStatus === "prompt" && this._gyroBtn.isHit(x, y)) {
      this._gyroBtn.pressed = true;
      this._deps.callbacks.requestGyroPermission();
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
    this._gyroBtn.pressed = false;
  }
}
