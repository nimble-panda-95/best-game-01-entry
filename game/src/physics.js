// Gravity, collisions and motion helpers shared by the player and the
// drifting mines. Pure functions over positions and velocities.

import { TUNE } from './config.js';

// Add every planet's pull to a velocity. Pull fades out past gravityRange
// so ships are never yanked from across the map.
export function applyGravity(x, y, vx, vy, planets, dt) {
  let ax = 0;
  let ay = 0;
  for (const planet of planets) {
    const dx = planet.x - x;
    const dy = planet.y - y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    if (dist < 1) continue;
    const reach = TUNE.gravityRange + planet.radius;
    if (dist > reach + TUNE.gravityFade) continue;
    let pull = (TUNE.gravityK * planet.mass) / Math.max(distSq, 900);
    if (dist > reach) pull *= 1 - (dist - reach) / TUNE.gravityFade;
    pull = Math.min(pull, TUNE.gravityMax);
    ax += (dx / dist) * pull;
    ay += (dy / dist) * pull;
  }
  return { vx: vx + ax * dt, vy: vy + ay * dt };
}

export function circlesHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

export function clampSpeed(vx, vy, max) {
  const speed = Math.hypot(vx, vy);
  if (speed <= max) return { vx, vy };
  const scale = max / speed;
  return { vx: vx * scale, vy: vy * scale };
}

// Bounce an entity off the play-area walls, damped. Returns the new state.
export function bounceOffWalls(x, y, vx, vy, radius, bounds, restitution = 0.5) {
  let nx = x;
  let ny = y;
  let nvx = vx;
  let nvy = vy;
  if (nx < bounds.left + radius) {
    nx = bounds.left + radius;
    nvx = Math.abs(nvx) * restitution;
  } else if (nx > bounds.right - radius) {
    nx = bounds.right - radius;
    nvx = -Math.abs(nvx) * restitution;
  }
  if (ny < bounds.top + radius) {
    ny = bounds.top + radius;
    nvy = Math.abs(nvy) * restitution;
  } else if (ny > bounds.bottom - radius) {
    ny = bounds.bottom - radius;
    nvy = -Math.abs(nvy) * restitution;
  }
  return { x: nx, y: ny, vx: nvx, vy: nvy };
}

// Push a circle out of a planet and reflect its velocity along the normal.
export function resolvePlanetHit(x, y, vx, vy, radius, planet, restitution) {
  const dx = x - planet.x;
  const dy = y - planet.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const nx = dx / dist;
  const ny = dy / dist;
  const push = planet.radius + radius - dist;
  const px = x + nx * Math.max(0, push);
  const py = y + ny * Math.max(0, push);
  const dot = vx * nx + vy * ny;
  const rx = dot < 0 ? vx - (1 + restitution) * dot * nx : vx;
  const ry = dot < 0 ? vy - (1 + restitution) * dot * ny : vy;
  return { x: px, y: py, vx: rx, vy: ry };
}
