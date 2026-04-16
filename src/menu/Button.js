
export class Button {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
    this.pressed = false;
  }

  
  setRect(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  
  isHit(px, py) {
    const ex = this.w * 0.1; 
    const ey = this.h * 0.1; 
    return (
      px >= this.x - ex &&
      px <= this.x + this.w + ex &&
      py >= this.y - ey &&
      py <= this.y + this.h + ey
    );
  }

  
  renderPressOverlay(ctx) {
    if (!this.pressed) return;
    ctx.save();
    ctx.translate(0, 4);
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.restore();
  }
}
