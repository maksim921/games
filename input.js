const KEY_MAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', KeyW: 'jump', ArrowUp: 'jump'
};

export class Input {
  constructor() {
    this.keys = new Set();
    this.jumpPressed = false;
    this.active = false;
    window.addEventListener('keydown', event => {
      const action = KEY_MAP[event.code];
      if (!action) return;
      if (this.active) event.preventDefault();
      if (action === 'jump' && !event.repeat) this.jumpPressed = true;
      this.keys.add(action);
    });
    window.addEventListener('keyup', event => {
      const action = KEY_MAP[event.code];
      if (action) this.keys.delete(action);
    });
    window.addEventListener('blur', () => this.clear());
    document.querySelectorAll('[data-input]').forEach(button => {
      const action = button.dataset.input;
      const down = event => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        if (action === 'jump') this.jumpPressed = true;
        this.keys.add(action);
      };
      const up = event => { event.preventDefault(); this.keys.delete(action); };
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      button.addEventListener('lostpointercapture', up);
    });
  }
  isDown(action) { return this.keys.has(action); }
  consumeJump() { const pressed = this.jumpPressed; this.jumpPressed = false; return pressed; }
  clear() { this.keys.clear(); this.jumpPressed = false; }
}
