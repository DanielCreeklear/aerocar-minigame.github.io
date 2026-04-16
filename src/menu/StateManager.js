
export class StateManager {
  constructor() {
    
    this.current = null;
  }

  
  transition(nextState) {
    if (this.current) this.current.onExit();
    this.current = nextState;
    if (this.current) this.current.onEnter();
  }

  
  update(dt) {
    this.current?.update(dt);
  }

  
  render(ctx, w, h) {
    this.current?.render(ctx, w, h);
  }

  
  onPointerDown(x, y) {
    this.current?.onPointerDown(x, y);
  }

  
  onPointerUp(x, y) {
    this.current?.onPointerUp(x, y);
  }

  
  onPointerMove(x, y) {
    this.current?.onPointerMove(x, y);
  }
}
