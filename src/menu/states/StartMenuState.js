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
    this._rankingBtn = new Button();
  }
  render(ctx, w, h) {
    drawStartScreen(ctx, w, h, this._deps.getGameState(), this._deps.track);
    const isPortrait = h > w;
    const btnStartY = isPortrait ? h * 0.44 : h * 0.62;
    const btnH = Math.max(44, Math.round(h * 0.075));
    this._ctaBtn.setRect(0, btnStartY, w, btnH);
    this._ctaBtn.renderPressOverlay(ctx);
    // ranking "VER TUDO" button hit area mirrors rendering in screen-renderer
    const pad = Math.max(20, w * 0.05);
    const rankings = (this._deps.getGameState() && this._deps.getGameState().rankings) || [];
    if (isPortrait) {
      const rkY = h * 0.63;
      const hdrBtnW = 86;
      const hdrBtnH = 26;
      const hdrBtnX = w - pad - hdrBtnW;
      const hdrBtnY = rkY - hdrBtnH - 6;
      this._rankingBtn.setRect(Math.round(hdrBtnX), Math.round(hdrBtnY), Math.round(hdrBtnW), Math.round(hdrBtnH));
    } else {
      const divX = Math.round(w * 0.5);
      const rightX = divX + 20;
      const rightW = w - rightX - pad;
      const hdrBtnW = 86;
      const hdrBtnH = 20;
      const hdrBtnX = rightX + rightW - hdrBtnW;
      const hdrBtnY = pad + 8 - hdrBtnH - 4;
      this._rankingBtn.setRect(Math.round(hdrBtnX), Math.round(hdrBtnY), Math.round(hdrBtnW), Math.round(hdrBtnH));
    }
    this._rankingBtn.renderPressOverlay(ctx);
    // dev button for localhost (hidden otherwise)
    try {
      const hostname = typeof window !== 'undefined' && window.location && window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        ctx.fillStyle = '#ffaa00';
        ctx.font = '12px monospace';
        ctx.fillText('[DEV]', 12, h - 12);
      }
    } catch (e) {}
    const footerH = 40;
    this._settingsBtn.setRect(w * 0.5, h - footerH, w * 0.5, footerH);
    const gs = this._deps.getGameState();
    if (gs && gs.iosPermissionStatus === "prompt") {
      const isPortrait = h > w;
      if (isPortrait) {
        const tx = Math.max(18, Math.min(36, w * 0.06));
        const availW = w - tx * 2;
        const sz = Math.max(11, Math.min(15, availW * 0.034));
        const btnH = sz + 16;
        const btnW = availW * 0.9;
        this._gyroBtn.setRect(
          tx,
          Math.round(h * 0.54),
          Math.round(btnW),
          Math.round(btnH),
        );
      } else {
        const titleX = Math.max(18, Math.min(40, w * 0.04));
        const divX = Math.round(w * 0.6);
        const leftW = divX - titleX - 24;
        const ruleY = h * 0.57;
        const ctrlY = ruleY + 18;
        const ctrlSz = Math.max(12, Math.min(17, w * 0.022));
        const btnY = ctrlY + 14 + (ctrlSz + 5) * 3 + 4;
        const sz = Math.max(11, Math.min(15, leftW * 0.034));
        const btnH = sz + 16;
        const btnW = leftW * 0.9;
        this._gyroBtn.setRect(
          titleX,
          Math.round(btnY),
          Math.round(btnW),
          Math.round(btnH),
        );
      }
    } else {
      this._gyroBtn.setRect(0, 0, 0, 0);
    }
  }
  onPointerDown(x, y) {
    if (this._rankingBtn.isHit(x, y)) {
      this._rankingBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.openLeaderboard());
      return;
    }
    if (this._settingsBtn.isHit(x, y)) {
      this._settingsBtn.pressed = true;
      requestAnimationFrame(() => this._deps.callbacks.openSettings());
      return;
    }
    const gs = this._deps.getGameState();
    if (
      gs &&
      gs.iosPermissionStatus === "prompt" &&
      this._gyroBtn.isHit(x, y)
    ) {
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
    this._rankingBtn.pressed = false;
  }
}
