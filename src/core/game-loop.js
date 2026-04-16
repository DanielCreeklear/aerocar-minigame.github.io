const TARGET_FPS = 60;
const MS_PER_FRAME_AT_TARGET = 1000 / TARGET_FPS;
const MAX_DT = 4;

class GameLoop {
  constructor() {
    this.running = false;
    this.lastTimestamp = null;
    this.onTick = null;
    this._tick = this._tick.bind(this);

    // Pause the loop when the page is hidden (app goes to background on
    // mobile) so we don't burn CPU/battery and don't accumulate a huge dt
    // when the page becomes visible again.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.lastTimestamp = null;
      }
    });
  }

  start(onTick) {
    this.onTick = onTick;
    this.running = true;
    this.lastTimestamp = null;
    requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
  }

  _tick(timestamp) {
    if (!this.running) return;

    // Skip the tick entirely while the document is hidden; re-queue for
    // when it becomes visible again (rAF is still queued so we'll resume).
    if (document.hidden) {
      requestAnimationFrame(this._tick);
      return;
    }

    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
    }

    const elapsedMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    const dt = Math.min(elapsedMs / MS_PER_FRAME_AT_TARGET, MAX_DT);

    this.onTick(dt);

    requestAnimationFrame(this._tick);
  }
}

export { GameLoop };
