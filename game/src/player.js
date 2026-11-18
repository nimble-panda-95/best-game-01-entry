// The courier ship: a small comet with thrust, brake, shield and slow-mo.
// Owns its motion state; the world owns collisions and scoring.

import { PLAY, TUNE } from './config.js';
import { applyGravity, bounceOffWalls, clampSpeed } from './physics.js';

export class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.hearts = TUNE.maxHearts;
    this.shield = false;
    this.invuln = 0;
    this.slowmo = 0;
    this.thrusting = false;
    this.thrustPower = 0;
    this.trailTimer = 0;
    this.alive = true;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.invuln = 0;
    this.slowmo = 0;
    this.thrusting = false;
    this.thrustPower = 0;
    this.alive = true;
  }

  fullReset(x, y) {
    this.reset(x, y);
    this.hearts = TUNE.maxHearts;
    this.shield = false;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  update(dt, input, planets, onTrail) {
    if (!this.alive) return;
    this.invuln = Math.max(0, this.invuln - dt);
    this.slowmo = Math.max(0, this.slowmo - dt);

    const axis = input.axis();
    const pointer = input.pointerThrust(this.x, this.y);
    let tx = axis.x;
    let ty = axis.y;
    let power = 1;
    if ((tx === 0 && ty === 0) && pointer) {
      tx = pointer.x;
      ty = pointer.y;
      power = pointer.strength;
    }
    this.thrusting = tx !== 0 || ty !== 0;
    this.thrustPower = this.thrusting ? power : 0;

    if (this.thrusting) {
      this.vx += tx * TUNE.thrust * power * dt;
      this.vy += ty * TUNE.thrust * power * dt;
      this.angle = Math.atan2(ty, tx);
    } else if (this.speed > 30) {
      this.angle = Math.atan2(this.vy, this.vx);
    }

    if (input.braking()) {
      const damp = Math.exp(-TUNE.brake * dt);
      this.vx *= damp;
      this.vy *= damp;
    }

    const dragged = applyGravity(this.x, this.y, this.vx, this.vy, planets, dt);
    this.vx = dragged.vx;
    this.vy = dragged.vy;

    const drag = Math.exp(-TUNE.drag * dt);
    this.vx *= drag;
    this.vy *= drag;

    const capped = clampSpeed(this.vx, this.vy, TUNE.maxSpeed);
    this.vx = capped.vx;
    this.vy = capped.vy;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const bounced = bounceOffWalls(this.x, this.y, this.vx, this.vy, TUNE.shipRadius, PLAY);
    this.x = bounced.x;
    this.y = bounced.y;
    this.vx = bounced.vx;
    this.vy = bounced.vy;

    // Engine trail, emitted on a timer while moving or thrusting.
    this.trailTimer -= dt;
    if (this.trailTimer <= 0 && (this.thrusting || this.speed > 60)) {
      this.trailTimer = TUNE.trailRate;
      const backX = this.x - Math.cos(this.angle) * 14;
      const backY = this.y - Math.sin(this.angle) * 14;
      onTrail(backX, backY, this.vx, this.vy, this.thrusting);
    }
  }

  // Returns 'hit' (lost a heart), 'shield' (shield absorbed it) or 'safe'
  // (invulnerable: nothing happens).
  takeHit() {
    if (!this.alive || this.invuln > 0) return 'safe';
    if (this.shield) {
      this.shield = false;
      this.invuln = TUNE.invulnTime;
      return 'shield';
    }
    this.hearts -= 1;
    this.invuln = TUNE.invulnTime;
    if (this.hearts <= 0) this.alive = false;
    return 'hit';
  }

  heal() {
    if (this.hearts < TUNE.maxHearts) {
      this.hearts += 1;
      return true;
    }
    return false;
  }
}
