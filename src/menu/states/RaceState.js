import { GameState } from "../GameState.js";
export class RaceState extends GameState {
  constructor(deps) {
    super();
    this._deps = deps;
  }
  onEnter() {
    this._deps.callbacks.onRaceEnter?.();
  }
  onExit() {
    this._deps.callbacks.onRaceExit?.();
  }
  onPointerDown(x, y) {
    const hud = this._deps.getHud?.();
    if (hud && hud.isBackBtnHit(x, y)) {
      hud._backBtnPressed = true;
    }
  }
  onPointerUp(x, y) {
    const hud = this._deps.getHud?.();
    if (hud && hud._backBtnPressed) {
      hud._backBtnPressed = false;
      if (hud.isBackBtnHit(x, y)) {
        this._deps.callbacks.backToMenu?.();
      }
    }
  }
}
