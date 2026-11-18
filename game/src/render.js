// All canvas drawing: background, entities, ship, HUD. Nothing here changes
// game state; it only reads it. Glow is done with pre-rendered sprites
// (cheap) instead of shadowBlur (slow).

import { HUD_H, PALETTE, PLAY, TUNE, VIEW_H, VIEW_W } from './config.js';
import { makeRng } from './rng.js';

const UI_FONT = "'Trebuchet MS', Verdana, sans-serif";

function font(size, weight = 700) {
  return `${weight} ${size}px ${UI_FONT}`;
}

// A soft radial glow sprite, cached per colour.
const glowCache = new Map();
export function glowSprite(color, inner = 'rgba(255,255,255,0.9)') {
  const key = `${color}|${inner}`;
  let sprite = glowCache.get(key);
  if (sprite) return sprite;
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 96, 96);
  glowCache.set(key, canvas);
  return canvas;
}

function drawGlow(ctx, sprite, x, y, size, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

// Four-point star path, used for shards and decorations.
export function starPath(ctx, x, y, outer, inner, rotation) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = rotation + (i * Math.PI) / 4 - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function heartPath(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.35);
  ctx.bezierCurveTo(x - size, y - size * 0.45, x - size * 0.45, y - size, x, y - size * 0.4);
  ctx.bezierCurveTo(x + size * 0.45, y - size, x + size, y - size * 0.45, x, y + size * 0.35);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.background = this.buildBackground();
    const rng = makeRng(4242);
    this.twinkles = Array.from({ length: 70 }, () => ({
      x: rng.range(0, VIEW_W),
      y: rng.range(0, VIEW_H),
      r: rng.range(0.8, 2.1),
      phase: rng.range(0, Math.PI * 2),
      speed: rng.range(0.6, 2.2),
    }));
  }

  buildBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, PALETTE.spaceTop);
    grad.addColorStop(0.55, '#070a20');
    grad.addColorStop(1, PALETTE.spaceBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const rng = makeRng(1337);
    // Nebulae: big soft colour clouds.
    const nebulae = [
      { x: 220, y: 180, r: 320, color: 'rgba(88, 80, 200, 0.20)' },
      { x: 1050, y: 540, r: 360, color: 'rgba(30, 140, 190, 0.16)' },
      { x: 880, y: 120, r: 240, color: 'rgba(200, 80, 140, 0.12)' },
      { x: 480, y: 640, r: 260, color: 'rgba(60, 120, 220, 0.12)' },
    ];
    for (const nebula of nebulae) {
      const g = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.r);
      g.addColorStop(0, nebula.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(nebula.x - nebula.r, nebula.y - nebula.r, nebula.r * 2, nebula.r * 2);
    }
    // Far static stars.
    for (let i = 0; i < 260; i += 1) {
      const x = rng.range(0, VIEW_W);
      const y = rng.range(0, VIEW_H);
      const r = rng.range(0.4, 1.4);
      ctx.globalAlpha = rng.range(0.25, 0.85);
      ctx.fillStyle = rng.chance(0.2) ? '#cfe4ff' : '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return canvas;
  }

  drawBackground(time) {
    const { ctx } = this;
    ctx.drawImage(this.background, 0, 0);
    ctx.save();
    for (const star of this.twinkles) {
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPlanet(ctx, planet, time) {
    const { x, y, radius: r, hue } = planet;
    // Gravity hint: a faint dashed ring at the edge of the pull.
    ctx.save();
    ctx.strokeStyle = 'rgba(150, 180, 255, 0.10)';
    ctx.setLineDash([6, 10]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r + TUNE.gravityRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    drawGlow(ctx, glowSprite(`hsla(${hue}, 80%, 60%, 0.55)`), x, y, r * 3.4, 0.5);

    const lightX = x - r * 0.35;
    const lightY = y - r * 0.4;
    const body = ctx.createRadialGradient(lightX, lightY, r * 0.1, x, y, r);
    body.addColorStop(0, `hsl(${hue}, 65%, 62%)`);
    body.addColorStop(0.55, `hsl(${hue}, 55%, 38%)`);
    body.addColorStop(1, `hsl(${hue}, 60%, 16%)`);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = `hsla(${hue}, 50%, 22%, 0.55)`;
    for (const crater of planet.craters) {
      ctx.beginPath();
      ctx.arc(x + crater.dx, y + crater.dy, crater.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Terminator shadow on the lower right.
    const shade = ctx.createRadialGradient(x + r * 0.5, y + r * 0.55, r * 0.2, x + r * 0.4, y + r * 0.4, r * 1.4);
    shade.addColorStop(0, 'rgba(2, 4, 14, 0.5)');
    shade.addColorStop(1, 'rgba(2, 4, 14, 0)');
    ctx.fillStyle = shade;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();

    ctx.strokeStyle = `hsla(${hue}, 80%, 75%, 0.5)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    if (planet.ring) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.42);
      ctx.strokeStyle = `hsla(${hue}, 70%, 80%, 0.55)`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.55, r * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `hsla(${hue}, 70%, 85%, 0.3)`;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.75, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    void time;
  }

  drawGate(ctx, gate, open, time) {
    const { x, y, radius: r } = gate;
    const color = open ? PALETTE.gateOpen : PALETTE.gateClosed;
    if (open) {
      const pulse = 1 + 0.08 * Math.sin(time * 3);
      drawGlow(ctx, glowSprite('rgba(125, 255, 178, 0.6)'), x, y, r * 3.6 * pulse, 0.75);
    }
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = open ? 5 : 4;
    ctx.globalAlpha = open ? 1 : 0.7;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    // Swirling arcs.
    for (let i = 0; i < 3; i += 1) {
      const start = gate.swirl + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(x, y, r - 9, start, start + 1.15);
      ctx.stroke();
    }
    ctx.restore();
    // Centre marker: a star when open, a lock dot pattern when closed.
    if (open) {
      starPath(ctx, x, y, 15, 6, time * 1.4);
      ctx.fillStyle = '#eafff2';
      ctx.fill();
    } else {
      ctx.fillStyle = PALETTE.gateClosed;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(x - 12 + i * 12, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawShard(ctx, shard, time) {
    const bob = Math.sin(time * 2 + shard.phase) * 4;
    const y = shard.y + bob;
    const pulse = 1 + 0.12 * Math.sin(time * 3 + shard.phase);
    drawGlow(ctx, glowSprite('rgba(255, 209, 102, 0.65)'), shard.x, y, 64 * pulse, 0.8);
    starPath(ctx, shard.x, y, 17 * pulse, 7 * pulse, time * 1.2 + shard.phase);
    ctx.fillStyle = PALETTE.shard;
    ctx.fill();
    ctx.fillStyle = '#fff6dd';
    starPath(ctx, shard.x, y, 8 * pulse, 3.5 * pulse, time * 1.2 + shard.phase);
    ctx.fill();
  }

  drawMine(ctx, mine, time) {
    const blink = 0.5 + 0.5 * Math.sin(time * 4 + mine.phase);
    drawGlow(ctx, glowSprite('rgba(255, 93, 115, 0.5)'), mine.x, mine.y, 58, 0.35 + blink * 0.3);
    ctx.save();
    ctx.translate(mine.x, mine.y);
    ctx.rotate(mine.angle);
    ctx.fillStyle = '#1a2038';
    ctx.strokeStyle = '#8b96c4';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.16) * 11, Math.sin(a - 0.16) * 11);
      ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
      ctx.lineTo(Math.cos(a + 0.16) * 11, Math.sin(a + 0.16) * 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = blink > 0.6 ? '#ff8b9d' : '#c22038';
    ctx.beginPath();
    ctx.arc(mine.x, mine.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPickup(ctx, pickup, time) {
    const bob = Math.sin(time * 2 + pickup.phase) * 4;
    const y = pickup.y + bob;
    const kinds = {
      shield: { color: PALETTE.shield, glow: 'rgba(110, 231, 255, 0.6)' },
      slowmo: { color: PALETTE.slowmo, glow: 'rgba(199, 146, 255, 0.6)' },
      heart: { color: PALETTE.heart, glow: 'rgba(255, 93, 115, 0.6)' },
    };
    const kind = kinds[pickup.kind];
    drawGlow(ctx, glowSprite(kind.glow), pickup.x, y, 62, 0.7);
    ctx.save();
    ctx.strokeStyle = kind.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pickup.x, y, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = kind.color;
    if (pickup.kind === 'shield') {
      ctx.beginPath();
      ctx.arc(pickup.x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#06101e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pickup.x, y, 3.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (pickup.kind === 'slowmo') {
      ctx.font = font(17);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◷', pickup.x, y + 1);
    } else {
      heartPath(ctx, pickup.x, y + 2, 9);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPlayer(ctx, player, time, braking) {
    if (!player.alive) return;
    // Invulnerability blink: half the frames the ship is faint.
    if (player.invuln > 0 && Math.floor(time * 14) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      this.drawShipBody(ctx, player, time, braking);
      ctx.restore();
    } else {
      this.drawShipBody(ctx, player, time, braking);
    }
    if (player.shield) {
      const pulse = 1 + 0.06 * Math.sin(time * 5);
      ctx.save();
      ctx.strokeStyle = 'rgba(110, 231, 255, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 24 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(110, 231, 255, 0.25)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 24 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (player.slowmo > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(199, 146, 255, 0.5)';
      ctx.setLineDash([4, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 30, time * 2, time * 2 + Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawShipBody(ctx, player, time, braking) {
    const { x, y, angle } = player;
    drawGlow(ctx, glowSprite('rgba(110, 231, 255, 0.7)'), x, y, 64, 0.85);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // Engine flame.
    if (player.thrusting) {
      const flick = 1 + 0.35 * Math.sin(time * 40) + Math.random() * 0.2;
      const len = 26 * flick * (0.5 + player.thrustPower * 0.5);
      const flame = ctx.createLinearGradient(-10, 0, -10 - len, 0);
      flame.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
      flame.addColorStop(0.4, 'rgba(255, 160, 60, 0.8)');
      flame.addColorStop(1, 'rgba(255, 80, 40, 0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(-8, -6);
      ctx.lineTo(-10 - len, 0);
      ctx.lineTo(-8, 6);
      ctx.closePath();
      ctx.fill();
    }
    if (braking) {
      ctx.strokeStyle = 'rgba(110, 231, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 20 + 2 * Math.sin(time * 10), 0, Math.PI * 2);
      ctx.stroke();
    }
    // Comet head: a sleek dart with a bright core.
    ctx.fillStyle = '#dfe9ff';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-9, -9);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-9, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6ee7ff';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawWorld(ctx, world, time) {
    for (const planet of world.planets) this.drawPlanet(ctx, planet, time);
    this.drawGate(ctx, world.gate, world.gateOpen, time);
    for (const shard of world.shards) {
      if (!shard.taken) this.drawShard(ctx, shard, time);
    }
    for (const pickup of world.pickups) {
      if (!pickup.taken) this.drawPickup(ctx, pickup, time);
    }
    for (const mine of world.mines) {
      if (mine.alive) this.drawMine(ctx, mine, time);
    }
  }

  formatTime(seconds) {
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }

  drawHud(ctx, game) {
    const { ctx: c } = this;
    void c;
    ctx.save();
    ctx.fillStyle = PALETTE.hudBar;
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.fillStyle = PALETTE.hudLine;
    ctx.fillRect(0, HUD_H - 1, VIEW_W, 1);

    // Hearts.
    for (let i = 0; i < TUNE.maxHearts; i += 1) {
      const x = 34 + i * 34;
      const y = HUD_H / 2;
      heartPath(ctx, x, y, 13);
      if (i < game.player.hearts) {
        ctx.fillStyle = PALETTE.heart;
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255, 93, 115, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    if (game.player.shield) {
      ctx.strokeStyle = PALETTE.shield;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(34 + TUNE.maxHearts * 34 + 6, HUD_H / 2, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.shield;
      ctx.beginPath();
      ctx.arc(34 + TUNE.maxHearts * 34 + 6, HUD_H / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Score (left-centre).
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(26);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`${game.score.toLocaleString('en-US')}`, 190, HUD_H / 2 + 1);
    ctx.font = font(12, 600);
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('SCORE', 190, 14);

    // Combo badge.
    if (game.combo > 1 && game.comboTimer > 0) {
      const label = `COMBO x${game.combo}`;
      ctx.font = font(20);
      const width = ctx.measureText(label).width + 24;
      const bx = 330;
      ctx.fillStyle = 'rgba(255, 150, 50, 0.9)';
      ctx.beginPath();
      ctx.roundRect(bx, HUD_H / 2 - 16, width, 32, 16);
      ctx.fill();
      ctx.fillStyle = '#1a0e00';
      ctx.fillText(label, bx + 12, HUD_H / 2 + 1);
      // Combo timer bar under the badge.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(bx, HUD_H / 2 + 20, width, 3);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(bx, HUD_H / 2 + 20, width * (game.comboTimer / TUNE.comboWindow), 3);
    }

    // Level name, centred.
    ctx.textAlign = 'center';
    ctx.font = font(17, 600);
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(`SYSTEM ${game.levelIndex + 1} / ${game.levelCount} — ${game.world.def.name.toUpperCase()}`, VIEW_W / 2, 20);
    // Shards.
    ctx.font = font(22);
    ctx.fillStyle = PALETTE.shard;
    starPath(ctx, VIEW_W / 2 - 44, 44, 10, 4.5, 0);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.fillText(`${game.world.shardsTaken} / ${game.world.shardsTotal}`, VIEW_W / 2 - 28, 45);
    // Gate status.
    ctx.textAlign = 'center';
    ctx.font = font(13, 600);
    ctx.fillStyle = game.world.gateOpen ? PALETTE.gateOpen : PALETTE.textDim;
    ctx.fillText(game.world.gateOpen ? 'GATE OPEN — FLY TO IT' : 'COLLECT ALL SHARDS', VIEW_W / 2 + 150, 45);

    // Timer (right).
    ctx.textAlign = 'right';
    ctx.font = font(24);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(this.formatTime(game.runTime), VIEW_W - 24, HUD_H / 2 + 1);
    ctx.font = font(12, 600);
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('TIME', VIEW_W - 24, 14);

    // Sound state, bottom-right corner of the play area, out of the HUD.
    ctx.font = font(13, 600);
    ctx.fillStyle = game.muted ? PALETTE.danger : 'rgba(154, 167, 208, 0.75)';
    ctx.textAlign = 'right';
    ctx.fillText(game.muted ? 'M · MUTED' : 'M · SOUND ON', VIEW_W - 18, VIEW_H - 18);

    // Slow-mo bar.
    if (game.player.slowmo > 0) {
      const width = 180;
      const bx = VIEW_W - 24 - width;
      ctx.fillStyle = 'rgba(199, 146, 255, 0.25)';
      ctx.fillRect(bx, HUD_H - 10, width, 4);
      ctx.fillStyle = PALETTE.slowmo;
      ctx.fillRect(bx, HUD_H - 10, width * (game.player.slowmo / TUNE.slowmoTime), 4);
      ctx.font = font(11, 600);
      ctx.fillStyle = PALETTE.slowmo;
      ctx.textAlign = 'left';
      ctx.fillText('SLOW-MO', bx, HUD_H - 18);
    }
    ctx.restore();
  }

  drawVignette(ctx, flash) {
    if (flash <= 0) return;
    const grad = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.32,
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75,
    );
    grad.addColorStop(0, 'rgba(255, 40, 60, 0)');
    grad.addColorStop(1, `rgba(255, 40, 60, ${0.45 * flash})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
