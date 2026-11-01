import { moveAndCollide } from './collision.js';

export class Player {
  constructor() { this.reset(); }
  reset() {
    this.x = 65; this.y = 428; this.w = 28; this.h = 42;
    this.vx = 0; this.vy = 0; this.grounded = false; this.facing = 1;
  }
  update(dt, input, platforms) {
    const direction = Number(input.isDown('right')) - Number(input.isDown('left'));
    const speed = 265;
    this.vx = direction * speed;
    if (direction) this.facing = direction;
    if (input.consumeJump() && this.grounded) {
      this.vy = -570;
      this.grounded = false;
    }
    this.vy = Math.min(this.vy + 1480 * dt, 820);
    moveAndCollide(this, platforms, dt);
  }
}
