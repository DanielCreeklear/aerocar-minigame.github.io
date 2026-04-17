import { GameState } from "../GameState.js";
import { drawTrackPreviewScreen } from "../../rendering/screen-renderer.js";
export class TrackPreviewState extends GameState {
  constructor(deps) {
    super();
    this._deps = deps;
  }
  render(ctx, w, h) {
    drawTrackPreviewScreen(
      ctx,
      w,
      h,
      this._deps.track,
      this._deps.getGameState(),
    );
  }
  onPointerDown(_x, _y) {
    this._deps.callbacks.advance();
  }
}