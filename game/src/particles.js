// Particles and floating score texts: the feedback layer. Pooled, capped,
// and drawn additively so bursts glow against the dark background.

export class Particles {
  constructor(cap = 600) {
    this.cap = cap;
    this.items = [];
  }

  spawn(x, y, { vx = 0, vy = 0, life = 0.6, size = 3, color = '#ffffff', drag = 2.0, grow = 0, gravity = 0 } = {}) {
    if (this.items.length >= this.cap) this.items.shift();
    this.items.push({ x, y, vx, vy, life, maxLife: life, size, color, drag, grow, gravity });
  }

  burst(x, y, { count = 18, speed = 180, life = 0.7, size = 3, colors = ['#ffffff'], spread = Math.PI * 2, angle = 0 } = {}) {
    for (let i = 0; i < count; i += 1) {
      const a = angle + (Math.random() - 0.5) * spread + (spread === Math.PI * 2 ? (i / count) * Math.PI * 2 : 0);
      const s = speed * (0.35 + Math.random() * 0.85);
      this.spawn(x, y, {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.6 + Math.random() * 0.7),
        size: size * (0.6 + Math.random() * 0.8),
        color: colors[i % colors.length],
      });
    }
  }

  ring(x, y, { count = 26, speed = 150, life = 0.5, size = 3, color = '#ffffff' } = {}) {
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2;
      this.spawn(x, y, { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life, size, color, drag: 3.2 });
    }
  }

  trail(x, y, vx, vy, color, size = 3.2) {
    this.spawn(x, y, {
      vx: vx * 0.12 + (Math.random() - 0.5) * 22,
      vy: vy * 0.12 + (Math.random() - 0.5) * 22,
      life: 0.6 + Math.random() * 0.35,
      size: size * (0.8 + Math.random() * 0.6),
      color,
      drag: 1.2,
    });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += p.grow * dt;
    }
  }

  draw(ctx) {
    if (this.items.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.items) {
      const t = p.life / p.maxLife;
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.size * (0.5 + t * 0.5)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    this.items.length = 0;
  }
}

export class FloatingTexts {
  constructor() {
    this.items = [];
  }

  add(x, y, text, { color = '#ffffff', size = 22, life = 1.0, rise = 46 } = {}) {
    this.items.push({ x, y, text, color, size, life, maxLife: life, rise });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      item.life -= dt;
      item.y -= item.rise * dt;
      if (item.life <= 0) this.items.splice(i, 1);
    }
  }

  draw(ctx) {
    if (this.items.length === 0) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const item of this.items) {
      const t = item.life / item.maxLife;
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.font = `700 ${item.size}px "Trebuchet MS", Verdana, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(4, 6, 18, 0.85)';
      ctx.strokeText(item.text, item.x, item.y);
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
  }

  clear() {
    this.items.length = 0;
  }
}
