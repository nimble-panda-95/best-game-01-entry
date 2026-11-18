// Menu screens and buttons. Screens are drawn on the canvas; buttons are
// hit-tested against pointer clicks and the hovered one gets the pointer
// cursor. Every screen also has a keyboard shortcut.

import { GAME_NAME, GAME_TAGLINE, PALETTE, VIEW_H, VIEW_W } from './config.js';
import { starPath } from './render.js';

const UI_FONT = "'Trebuchet MS', Verdana, sans-serif";

function font(size, weight = 700) {
  return `${weight} ${size}px ${UI_FONT}`;
}

export class Button {
  constructor(x, y, w, h, label, action, { primary = false, hint = '' } = {}) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.label = label;
    this.action = action;
    this.primary = primary;
    this.hint = hint;
    this.hover = false;
  }

  contains(px, py) {
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }

  draw(ctx, time) {
    const pulse = this.primary ? 1 + 0.04 * Math.sin(time * 3) : 1;
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-(this.x + this.w / 2), -(this.y + this.h / 2));
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.w, this.h, 12);
    if (this.primary) {
      const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
      grad.addColorStop(0, '#ffd166');
      grad.addColorStop(1, '#f4a52a');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = this.hover ? 'rgba(70, 90, 160, 0.85)' : 'rgba(40, 52, 96, 0.85)';
    }
    ctx.fill();
    ctx.strokeStyle = this.primary ? '#fff3d0' : 'rgba(150, 175, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = this.primary ? '#241300' : PALETTE.text;
    ctx.font = font(22);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x + this.w / 2, this.y + this.h / 2 + 1);
    if (this.hint) {
      ctx.font = font(12, 600);
      // The hint sits below the button on the dark background, so it is
      // always light, whatever the button's own colours are.
      ctx.fillStyle = 'rgba(238, 242, 255, 0.6)';
      ctx.fillText(this.hint, this.x + this.w / 2, this.y + this.h + 18);
    }
    ctx.restore();
  }
}

export function centerButton(y, w, h, label, action, options) {
  return new Button(VIEW_W / 2 - w / 2, y, w, h, label, action, options);
}

function dim(ctx, alpha = 0.55) {
  ctx.fillStyle = `rgba(3, 5, 16, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function panel(ctx, w, h) {
  const x = VIEW_W / 2 - w / 2;
  const y = VIEW_H / 2 - h / 2;
  ctx.fillStyle = 'rgba(10, 14, 36, 0.92)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 170, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  return { x, y, w, h };
}

function bigTitle(ctx, text, y, size, color = PALETTE.text) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(size, 800);
  try {
    ctx.letterSpacing = '4px';
  } catch {
    // Older browsers ignore letterSpacing; the title still draws.
  }
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(4, 6, 18, 0.9)';
  ctx.strokeText(text, VIEW_W / 2, y);
  ctx.fillStyle = color;
  ctx.fillText(text, VIEW_W / 2, y);
  ctx.restore();
}

function centerText(ctx, text, y, size, color = PALETTE.text, weight = 600) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.fillText(text, VIEW_W / 2, y);
  ctx.restore();
}

function statRow(ctx, label, value, y, x = VIEW_W / 2) {
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.font = font(19, 600);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(label, x - 16, y);
  ctx.textAlign = 'left';
  ctx.font = font(22);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(value, x + 16, y);
  ctx.restore();
}

// --- Title screen -------------------------------------------------------

export function drawTitle(ctx, game, time) {
  // A slow comet arc behind the title is drawn by the game (demo ship).
  const glowY = 218;
  const grad = ctx.createRadialGradient(VIEW_W / 2, glowY, 10, VIEW_W / 2, glowY, 420);
  grad.addColorStop(0, 'rgba(110, 231, 255, 0.16)');
  grad.addColorStop(1, 'rgba(110, 231, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Decorative stars flanking the title.
  for (const side of [-1, 1]) {
    const sx = VIEW_W / 2 + side * 400;
    starPath(ctx, sx, 150, 16, 6, time * 0.8);
    ctx.fillStyle = PALETTE.shard;
    ctx.fill();
    starPath(ctx, sx + side * -40, 300, 10, 4, -time * 0.6);
    ctx.fillStyle = PALETTE.accent2;
    ctx.fill();
  }

  bigTitle(ctx, 'STARLIGHT', 190, 84, '#f4f7ff');
  bigTitle(ctx, 'COURIER', 268, 84, PALETTE.accent);
  centerText(ctx, GAME_TAGLINE, 322, 22, PALETTE.textDim, 600);

  centerText(ctx, 'Fly the comet. Gather every shard. Reach the gate.', 366, 19, PALETTE.text, 600);

  if (game.best > 0) {
    centerText(ctx, `BEST SCORE  ${game.best.toLocaleString('en-US')}`, 398, 16, PALETTE.shard, 700);
  }
  centerText(ctx, 'WASD / ARROWS to thrust · SPACE to brake · MOUSE steers too · P pauses · M mutes', 648, 15, PALETTE.textDim, 600);
  centerText(ctx, `An original game · ${GAME_NAME} · built for make.fun`, 676, 13, 'rgba(154, 167, 208, 0.6)', 600);
}

// --- Help overlay ---------------------------------------------------------

export function drawHelp(ctx) {
  dim(ctx, 0.7);
  const { y } = panel(ctx, 720, 470);
  bigTitle(ctx, 'HOW TO PLAY', y + 58, 36);
  const lines = [
    ['GOAL', 'Collect every star shard in the system, then fly into the open gate.'],
    ['FLY', 'WASD or arrow keys thrust. Hold the mouse to steer toward the pointer.'],
    ['BRAKE', 'Hold SPACE to slow down fast. Planets pull you in — use it, don\'t fight it.'],
    ['DANGER', 'Mines and hard planet crashes cost a hull heart. You have 3 per run.'],
    ['COMBO', 'Grab shards quickly in a row to raise your combo multiplier, up to x5.'],
    ['PICKUPS', 'Shield blocks one hit · Slow-mo bends time · Heart repairs the hull.'],
    ['SCORE', 'Shards, combos and fast finishes. Six systems stand between you and home.'],
  ];
  ctx.save();
  ctx.textBaseline = 'middle';
  lines.forEach(([head, body], i) => {
    const ly = y + 116 + i * 40;
    ctx.textAlign = 'right';
    ctx.font = font(16);
    ctx.fillStyle = PALETTE.accent;
    ctx.fillText(head, VIEW_W / 2 - 190, ly);
    ctx.textAlign = 'left';
    ctx.font = font(17, 600);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(body, VIEW_W / 2 - 170, ly);
  });
  ctx.restore();
}

// --- Pause ----------------------------------------------------------------

export function drawPause(ctx) {
  dim(ctx, 0.6);
  const { y } = panel(ctx, 460, 440);
  bigTitle(ctx, 'PAUSED', y + 62, 40);
  centerText(ctx, 'The stars wait for no courier. Well — this once.', y + 104, 16, PALETTE.textDim, 600);
}

// --- Level clear ------------------------------------------------------------

export function drawLevelClear(ctx, game) {
  dim(ctx, 0.55);
  const { y } = panel(ctx, 560, 380);
  bigTitle(ctx, 'DELIVERED!', y + 62, 40, PALETTE.gateOpen);
  centerText(ctx, `${game.world.def.name} complete`, y + 104, 18, PALETTE.textDim, 600);
  statRow(ctx, 'Time', game.renderer.formatTime(game.world.levelTime), y + 150);
  statRow(ctx, 'Time bonus', `+${game.lastTimeBonus.toLocaleString('en-US')}`, y + 186);
  statRow(ctx, 'Level bonus', `+${game.lastLevelBonus.toLocaleString('en-US')}`, y + 222);
  if (game.lastHeartRestored) {
    statRow(ctx, 'Hull patched', `+1  (${game.player.hearts} / 3)`, y + 258);
  }
  statRow(ctx, 'Score', game.score.toLocaleString('en-US'), y + (game.lastHeartRestored ? 300 : 262));
}

// --- Win --------------------------------------------------------------------

export function drawWin(ctx, game) {
  dim(ctx, 0.6);
  const { y } = panel(ctx, 600, 430);
  starPath(ctx, VIEW_W / 2, y + 66, 30, 12, 0.4);
  ctx.fillStyle = PALETTE.shard;
  ctx.fill();
  bigTitle(ctx, 'ALL DELIVERIES', y + 128, 34, PALETTE.gateOpen);
  bigTitle(ctx, 'COMPLETE', y + 170, 34, PALETTE.gateOpen);
  centerText(ctx, 'Every shard is home. The route is yours, courier.', y + 210, 17, PALETTE.textDim, 600);
  statRow(ctx, 'Final score', game.score.toLocaleString('en-US'), y + 258);
  statRow(ctx, 'Total time', game.renderer.formatTime(game.runTime), y + 292);
  statRow(ctx, 'Best', game.best.toLocaleString('en-US'), y + 326);
  if (game.newBest) {
    centerText(ctx, '★ NEW BEST SCORE ★', y + 364, 18, PALETTE.shard, 700);
  }
}

// --- Game over ----------------------------------------------------------------

export function drawLose(ctx, game) {
  dim(ctx, 0.65);
  const { y } = panel(ctx, 560, 390);
  bigTitle(ctx, 'SIGNAL LOST', y + 66, 40, PALETTE.danger);
  centerText(ctx, `The courier went dark in ${game.world.def.name}.`, y + 110, 17, PALETTE.textDim, 600);
  statRow(ctx, 'Score', game.score.toLocaleString('en-US'), y + 166);
  statRow(ctx, 'Systems cleared', `${game.levelIndex} / ${game.levelCount}`, y + 202);
  statRow(ctx, 'Shards gathered', `${game.totalShards}`, y + 238);
  statRow(ctx, 'Best', game.best.toLocaleString('en-US'), y + 274);
  if (game.newBest) {
    centerText(ctx, '★ NEW BEST SCORE ★', y + 314, 18, PALETTE.shard, 700);
  }
}
