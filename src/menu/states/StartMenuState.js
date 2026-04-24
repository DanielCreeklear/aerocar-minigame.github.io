import { GameState } from "../GameState.js";
import { Button } from "../Button.js";
import { drawStartScreen } from "../../rendering/screen-renderer.js";

function _roundRect(ctx, x, y, w, h, r = 8) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export class StartMenuState extends GameState {
  constructor(deps) {
    super();
    this._deps = deps;
    this._ctaBtn = new Button();
    this._settingsBtn = new Button();
    this._gyroBtn = new Button();
    this._rankingBtn = new Button();
    this._tutorialBtn = new Button();
    this._lastW = 0;
    this._lastH = 0;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._devRect = { x: 0, y: 0, w: 0, h: 0 };
  }
  render(ctx, w, h) {
    drawStartScreen(ctx, w, h, this._deps.getGameState(), this._deps.track);
    this._lastW = w;
    this._lastH = h;
    const isPortrait = h > w;
    const btnStartY = isPortrait ? h * 0.44 : h * 0.62;
    const btnH = Math.max(44, Math.round(h * 0.075));
    this._ctaBtn.setRect(0, btnStartY, w, btnH);
    this._ctaBtn.renderPressOverlay(ctx);
    
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
    
    try {
      const hostname = typeof window !== 'undefined' && window.location && window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const devW = Math.min(180, Math.max(110, w * 0.18));
        const devH = 40;
        const devX = 12;
        const devY = Math.round(h - devH - 12);
        
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        _roundRect(ctx, devX + 2, devY + 4, devW, devH, 10);
        ctx.fill();
        
        const g = ctx.createLinearGradient(devX, devY, devX + devW, devY);
        g.addColorStop(0, '#ff8a3a');
        g.addColorStop(1, '#ff5f2a');
        ctx.fillStyle = g;
        _roundRect(ctx, devX, devY, devW, devH, 10);
        ctx.fill();
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        _roundRect(ctx, devX, devY, devW, devH, 10);
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = '700 14px monospace';
        ctx.fillText('DEV', devX + 12, devY + devH / 2 + 5);
        ctx.font = '12px monospace';
        ctx.fillText('Sandbox (D)', devX + 58, devY + devH / 2 + 5);
        ctx.restore();
        
        this._devRect = { x: devX, y: devY, w: devW, h: devH };
      } else {
        this._devRect = { x: 0, y: 0, w: 0, h: 0 };
      }
    } catch (e) {
      this._devRect = { x: 0, y: 0, w: 0, h: 0 };
    }
    const footerH = 40;
    // footer buttons hitboxes are computed below to match renderer.bottomBar
    this._settingsBtn.setRect(0, 0, 0, 0);
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
    // Footer actions are rendered by drawStartScreen's bottomBar.
    // Recompute the text metrics here to build hitboxes that match the bottomBar layout.
    const footerBh = 40;
    const footerBy = h - footerBh;
    const footerSz = Math.max(12, Math.min(15, w * 0.032));
    ctx.font = `700 ${footerSz}px monospace`;
    const footerCy = footerBy + footerBh * 0.5;
    let curX = 20;
    const footerActions = [
      { icon: "○", label: "INICIAR" },
      { icon: "△", label: "CONFIG" },
      { icon: "◉", label: "TUTORIAL" },
    ];
    // create or reuse footer buttons
    this._footerStartBtn = this._footerStartBtn || new Button();
    this._settingsBtn = this._settingsBtn || new Button();
    this._tutorialBtn = this._tutorialBtn || new Button();
    // iterate and set rects
    for (let i = 0; i < footerActions.length; i++) {
      const a = footerActions[i];
      const txt = `${a.icon} ${a.label}`;
      const wText = Math.ceil(ctx.measureText(txt).width);
      const padX = 12; // clickable padding around label for better UX
      const rx = Math.round(curX - padX);
      const ry = Math.round(footerBy);
      const rw = Math.round(wText + padX * 2);
      const rh = Math.round(footerBh);
      if (a.label === "INICIAR") this._footerStartBtn.setRect(rx, ry, rw, rh);
      else if (a.label === "CONFIG") this._settingsBtn.setRect(rx, ry, rw, rh);
      else if (a.label === "TUTORIAL") this._tutorialBtn.setRect(rx, ry, rw, rh);
      curX += wText + 28;
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
    if (this._tutorialBtn && this._tutorialBtn.isHit(x, y)) {
      this._tutorialBtn.pressed = true;
      // open tutorial screen
      requestAnimationFrame(() => {
        // Some deps may not have direct helper for tutorial; use backToMenu/openSettings as safe nav
        if (this._deps.callbacks && this._deps.callbacks.openTutorial) {
          this._deps.callbacks.openTutorial();
        } else if (this._deps.callbacks && this._deps.callbacks.backToMenu) {
          // reuse backToMenu to navigate; actual mapping happens in Game
          this._deps.callbacks.backToMenu();
        }
      });
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
    
    try {
      const hostname = typeof window !== 'undefined' && window.location && window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const r = this._devRect || { x: 0, y: 0, w: 0, h: 0 };
        if (r.w > 0 && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          requestAnimationFrame(() => this._deps.callbacks.openPhysicsSandbox());
          return;
        }
        
        const hThreshold = this._lastH || (this._deps.canvas ? this._deps.canvas.height : 480);
        if (x < 120 && y > hThreshold - 80) {
          requestAnimationFrame(() => this._deps.callbacks.openPhysicsSandbox());
          return;
        }
      }
    } catch (e) {}
  }
  onPointerUp(_x, _y) {
    this._ctaBtn.pressed = false;
    this._settingsBtn.pressed = false;
    this._gyroBtn.pressed = false;
    this._rankingBtn.pressed = false;
    if (this._tutorialBtn) this._tutorialBtn.pressed = false;
    if (this._footerStartBtn) this._footerStartBtn.pressed = false;
  }

  onEnter() {
    window.addEventListener('keydown', this._onKeyDown);
  }

  onExit() {
    window.removeEventListener('keydown', this._onKeyDown);
  }

  _onKeyDown(e) {
    try {
      const hostname = typeof window !== 'undefined' && window.location && window.location.hostname;
      if (!(hostname === 'localhost' || hostname === '127.0.0.1')) return;
      if (e.key === 'd' || e.key === 'D') {
        this._deps.callbacks.openPhysicsSandbox();
      }
    } catch (err) {}
  }
}
