const TARGET_FPS = 60;
const MS_PER_FRAME_AT_TARGET = 1000 / TARGET_FPS;
const MAX_DT = 4;

class GameLoop {
  constructor() {
    this.running = false;
    this.lastTimestamp = null;
    this.onTick = null;
    this._tick = this._tick.bind(this);


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
