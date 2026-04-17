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
}