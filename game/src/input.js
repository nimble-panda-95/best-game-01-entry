// Keyboard, mouse and pointer state, sampled once per frame.
// The game reads axes and edge-triggered presses; buttons read click points.

const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyP', 'KeyM', 'KeyR', 'KeyH',
  'Enter', 'Escape',
]);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.pointer = { x: 0, y: 0, down: false, inside: false };
    this.clicks = [];
    this.scripted = null; // {axis:{x,y}, brake:boolean} — set by screenshot mode.

    window.addEventListener('keydown', (event) => {
      if (GAME_KEYS.has(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.down.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.down.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
      this.pointer.down = false;
    });

    canvas.addEventListener('pointermove', (event) => {
      const point = this.toGame(event);
      this.pointer.x = point.x;
      this.pointer.y = point.y;
      this.pointer.inside = true;
    });
    canvas.addEventListener('pointerdown', (event) => {
      const point = this.toGame(event);
      this.pointer.x = point.x;
      this.pointer.y = point.y;
      this.pointer.down = true;
      this.clicks.push({ x: point.x, y: point.y });
      canvas.focus();
    });
    window.addEventListener('pointerup', () => {
      this.pointer.down = false;
    });
    canvas.addEventListener('pointerleave', () => {
      this.pointer.inside = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  toGame(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  // Normalised thrust axis from keys, or from the scripted driver.
  axis() {
    if (this.scripted) return this.scripted.axis;
    let x = 0;
    let y = 0;
    if (this.down.has('ArrowLeft') || this.down.has('KeyA')) x -= 1;
    if (this.down.has('ArrowRight') || this.down.has('KeyD')) x += 1;
    if (this.down.has('ArrowUp') || this.down.has('KeyW')) y -= 1;
    if (this.down.has('ArrowDown') || this.down.has('KeyS')) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }

  braking() {
    if (this.scripted) return this.scripted.brake;
    return this.down.has('Space');
  }

  // Holding the mouse steers thrust toward the pointer.
  pointerThrust(fromX, fromY) {
    if (!this.pointer.down || !this.pointer.inside) return null;
    const dx = this.pointer.x - fromX;
    const dy = this.pointer.y - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist < 24) return null;
    return { x: dx / dist, y: dy / dist, strength: Math.min(1, dist / 160) };
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  anyPressed(codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  takeClicks() {
    const taken = this.clicks;
    this.clicks = [];
    return taken;
  }

  endFrame() {
    this.pressed.clear();
  }
}
