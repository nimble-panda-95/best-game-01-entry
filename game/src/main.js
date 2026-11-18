// Starlight Courier — entry point and game state machine.
// Owns the run: score, combo, hearts across levels, screens, the fixed-step
// loop, and the wiring between input, world, rendering and sound.

import { GAME_NAME, PALETTE, TUNE, VIEW_H, VIEW_W } from './config.js';
import { LEVELS } from './levels.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { Particles, FloatingTexts } from './particles.js';
import { Player } from './player.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import {
  Button, centerButton, drawTitle, drawHelp, drawPause,
  drawLevelClear, drawWin, drawLose,
} from './screens.js';
import { loadBest, saveBest } from './storage.js';
import { setupScreenshot } from './shots.js';

const STEP = 1 / 120;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.renderer = new Renderer(canvas);
    this.particles = new Particles();
    this.texts = new FloatingTexts();
    this.player = new Player();
    this.world = new World();
    this.levelCount = LEVELS.length;

    this.state = 'title';
    this.stateTime = 0;
    this.time = 0;
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.runTime = 0;
    this.levelIndex = 0;
    this.totalShards = 0;
    this.best = loadBest();
    this.newBest = false;
    this.muted = false;
    this.lastTimeBonus = 0;
    this.lastLevelBonus = 0;
    this.lastHeartRestored = false;
    this.shake = 0;
    this.flash = 0;
    this.deathTimer = 0;
    this.frozen = false;
    this.buttons = [];
    this.demoT = 0;
    this.demoTrail = 0;

    this.world.loadLevel(0);
    this.player.reset(this.world.def.spawn.x, this.world.def.spawn.y);
    this.rebuildButtons();

    // Audio needs a user gesture; unlock on the first one.
    const unlock = () => {
      if (this.audio.ensure()) {
        this.audio.play('click');
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    // Screenshot mode (?shot=start|play|win|end) drives the game into a
    // state and leaves it rendering; see shots.js.
    setupScreenshot(this);
  }

  get level() {
    return this.world.def;
  }

  rebuildButtons() {
    const buttons = [];
    const center = VIEW_W / 2;
    if (this.state === 'title') {
      buttons.push(centerButton(436, 300, 58, 'LAUNCH', 'start', { primary: true, hint: 'ENTER' }));
      buttons.push(new Button(center - 250, 516, 230, 50, 'HOW TO PLAY', 'help'));
      buttons.push(new Button(center + 20, 516, 230, 50, this.muted ? 'SOUND: OFF' : 'SOUND: ON', 'mute'));
    } else if (this.state === 'help') {
      buttons.push(centerButton(614, 240, 52, 'GOT IT', 'title', { primary: true, hint: 'H / ESC' }));
    } else if (this.state === 'pause') {
      buttons.push(centerButton(300, 260, 50, 'RESUME', 'resume', { primary: true, hint: 'P / ESC' }));
      buttons.push(centerButton(362, 260, 50, 'RESTART RUN', 'restart'));
      buttons.push(centerButton(424, 260, 50, this.muted ? 'SOUND: OFF' : 'SOUND: ON', 'mute'));
      buttons.push(centerButton(486, 260, 50, 'QUIT TO TITLE', 'title'));
    } else if (this.state === 'clear') {
      buttons.push(centerButton(568, 300, 56, 'NEXT SYSTEM', 'next', { primary: true, hint: 'ENTER' }));
    } else if (this.state === 'win') {
      buttons.push(new Button(center - 250, 596, 230, 52, 'PLAY AGAIN', 'restart', { primary: true, hint: 'ENTER' }));
      buttons.push(new Button(center + 20, 596, 230, 52, 'TITLE', 'title'));
    } else if (this.state === 'lose') {
      buttons.push(new Button(center - 250, 576, 230, 52, 'TRY AGAIN', 'restart', { primary: true, hint: 'ENTER' }));
      buttons.push(new Button(center + 20, 576, 230, 52, 'TITLE', 'title'));
    }
    this.buttons = buttons;
  }

  setState(next) {
    this.state = next;
    this.stateTime = 0;
    this.rebuildButtons();
    if (next !== 'play') this.audio.setThrust(false);
  }

  startRun() {
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.runTime = 0;
    this.totalShards = 0;
    this.newBest = false;
    this.levelIndex = 0;
    this.particles.clear();
    this.texts.clear();
    this.world.loadLevel(0);
    this.player.fullReset(this.world.def.spawn.x, this.world.def.spawn.y);
    this.setState('play');
  }

  startLevel(index) {
    this.levelIndex = index;
    this.world.loadLevel(index);
    this.player.reset(this.world.def.spawn.x, this.world.def.spawn.y);
    this.combo = 1;
    this.comboTimer = 0;
    this.particles.clear();
    this.texts.clear();
    this.setState('play');
  }

  toggleMute() {
    this.audio.ensure();
    this.muted = this.audio.toggleMuted();
    this.rebuildButtons();
  }

  commitBest() {
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
      saveBest(this.best);
    }
  }

  doAction(action) {
    this.audio.ensure();
    this.audio.play('click');
    switch (action) {
      case 'start':
      case 'restart':
        this.startRun();
        break;
      case 'help':
        this.setState('help');
        break;
      case 'title':
        this.world.loadLevel(0);
        this.player.reset(this.world.def.spawn.x, this.world.def.spawn.y);
        this.setState('title');
        break;
      case 'mute':
        this.toggleMute();
        break;
      case 'resume':
        this.setState('play');
        break;
      case 'next':
        this.advanceLevel();
        break;
      default:
        break;
    }
  }

  advanceLevel() {
    if (this.levelIndex + 1 >= this.levelCount) {
      this.commitBest();
      this.audio.play('win');
      this.setState('win');
    } else {
      this.startLevel(this.levelIndex + 1);
    }
  }

  // --- Events from the world -------------------------------------------------

  handleEvents(events) {
    for (const event of events) {
      if (event.type === 'shard') {
        if (this.comboTimer > 0) this.combo = Math.min(this.combo + 1, TUNE.comboMax);
        else this.combo = 1;
        this.comboTimer = TUNE.comboWindow;
        const points = TUNE.shardScore * this.combo;
        this.score += points;
        this.totalShards += 1;
        this.texts.add(event.x, event.y - 20, `+${points}`, { color: PALETTE.shard, size: this.combo > 1 ? 26 : 22 });
        if (this.combo > 1) {
          this.texts.add(event.x, event.y - 48, `COMBO x${this.combo}`, { color: '#ff9a32', size: 17 });
        }
        this.particles.burst(event.x, event.y, { count: 20, speed: 170, colors: ['#ffd166', '#fff6dd', '#ff9a32'] });
        this.audio.play('pickup', { combo: this.combo });
      } else if (event.type === 'pickup') {
        if (event.kind === 'shield') {
          if (!this.player.shield) {
            this.player.shield = true;
            this.texts.add(event.x, event.y - 22, 'SHIELD UP', { color: PALETTE.shield, size: 20 });
          } else {
            this.score += 250;
            this.texts.add(event.x, event.y - 22, '+250', { color: PALETTE.shield, size: 20 });
          }
        } else if (event.kind === 'slowmo') {
          this.player.slowmo = TUNE.slowmoTime;
          this.texts.add(event.x, event.y - 22, 'SLOW-MO!', { color: PALETTE.slowmo, size: 20 });
        } else if (event.kind === 'heart') {
          if (this.player.heal()) {
            this.texts.add(event.x, event.y - 22, '+1 HULL', { color: PALETTE.heart, size: 20 });
          } else {
            this.score += 250;
            this.texts.add(event.x, event.y - 22, '+250', { color: PALETTE.heart, size: 20 });
          }
        }
        this.particles.ring(event.x, event.y, { count: 22, speed: 140, color: '#ffffff' });
        this.audio.play('powerup');
      } else if (event.type === 'gateOpen') {
        this.texts.add(event.x, event.y - 48, 'GATE OPEN!', { color: PALETTE.gateOpen, size: 26 });
        this.particles.ring(event.x, event.y, { count: 30, speed: 190, color: PALETTE.gateOpen });
        this.audio.play('gateOpen');
      } else if (event.type === 'mineDown') {
        this.particles.burst(event.x, event.y, { count: 26, speed: 230, colors: ['#ff5d73', '#ffb199', '#ffffff'] });
      } else if (event.type === 'hit') {
        if (event.result === 'hit') {
          this.shake = TUNE.shakeOnHit;
          this.flash = 1;
          this.combo = 1;
          this.comboTimer = 0;
          this.audio.play('hit');
          this.particles.burst(event.x, event.y, { count: 24, speed: 210, colors: ['#ff5d73', '#ffffff', '#6ee7ff'] });
          if (!this.player.alive) {
            this.particles.burst(event.x, event.y, { count: 60, speed: 300, life: 1.1, colors: ['#ffffff', '#6ee7ff', '#ffd166'] });
            this.deathTimer = 0.9;
            this.setState('dying');
          }
        } else if (event.result === 'shield') {
          this.shake = 7;
          this.audio.play('shieldBreak');
          this.texts.add(event.x, event.y - 24, 'SHIELD DOWN', { color: PALETTE.shield, size: 18 });
          this.particles.ring(event.x, event.y, { count: 24, speed: 200, color: PALETTE.shield });
        }
      } else if (event.type === 'complete') {
        this.lastTimeBonus = Math.max(0, Math.round(this.level.par - this.world.levelTime) * 10);
        this.lastLevelBonus = TUNE.levelBonus;
        this.score += this.lastTimeBonus + this.lastLevelBonus;
        // Finishing a system patches the hull: one heart back, up to full.
        // A run should be lost by flying badly, not by one early mistake.
        this.lastHeartRestored = this.player.hearts < TUNE.maxHearts;
        if (this.lastHeartRestored) this.player.hearts += 1;
        this.particles.burst(event.x, event.y, { count: 46, speed: 260, life: 1.0, colors: ['#7dffb2', '#ffd166', '#ffffff'] });
        this.audio.play('complete');
        this.setState('clear');
      }
    }
  }

  // --- Update ------------------------------------------------------------------

  update(dt) {
    this.time += dt;
    this.stateTime += dt;
    this.shake = Math.max(0, this.shake - TUNE.shakeDecay * dt);
    this.flash = Math.max(0, this.flash - TUNE.flashDecay * dt);

    if (this.state === 'title' || this.state === 'help') {
      this.updateDemo(dt);
      this.particles.update(dt);
      this.texts.update(dt);
    } else if (this.state === 'play') {
      this.runTime += dt;
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) this.combo = 1;
      const dtWorld = this.player.slowmo > 0 ? dt * TUNE.slowmoScale : dt;
      const events = this.world.update(dtWorld, dt, this.player, this.input, (x, y, vx, vy, thrusting) => {
        this.particles.trail(x, y, vx, vy, thrusting ? '#7fd8ff' : '#4a6fb5', thrusting ? 3.6 : 2.6);
      });
      this.handleEvents(events);
      this.particles.update(dtWorld);
      this.texts.update(dt);
      this.audio.setThrust(this.player.thrusting, this.player.thrustPower);
    } else if (this.state === 'dying') {
      this.deathTimer -= dt;
      this.particles.update(dt);
      this.texts.update(dt);
      if (this.deathTimer <= 0) {
        this.commitBest();
        this.audio.play('lose');
        this.setState('lose');
      }
    } else if (this.state === 'clear' || this.state === 'win' || this.state === 'lose') {
      this.particles.update(dt);
      this.texts.update(dt);
    }
    // 'pause' freezes everything.
  }

  updateDemo(dt) {
    this.demoT += dt;
    const t = this.demoT;
    const x = VIEW_W / 2 + 430 * Math.sin(t * 0.3);
    const y = 400 + 175 * Math.sin(t * 0.46 + 1.2);
    const px = VIEW_W / 2 + 430 * Math.sin((t - 0.05) * 0.3);
    const py = 400 + 175 * Math.sin((t - 0.05) * 0.46 + 1.2);
    this.demoShip = {
      x, y,
      angle: Math.atan2(y - py, x - px),
      thrusting: true, thrustPower: 0.8,
      invuln: 0, shield: false, slowmo: 0, alive: true,
    };
    this.demoTrail -= dt;
    if (this.demoTrail <= 0) {
      this.demoTrail = TUNE.trailRate * 1.4;
      this.particles.trail(
        x - Math.cos(this.demoShip.angle) * 14,
        y - Math.sin(this.demoShip.angle) * 14,
        (x - px) * 18, (y - py) * 18, '#7fd8ff', 3.2,
      );
    }
  }

  // --- Input routing ------------------------------------------------------------

  handleInput() {
    const { input } = this;
    if (input.wasPressed('KeyM')) this.toggleMute();

    for (const click of input.takeClicks()) {
      let handled = false;
      for (const button of this.buttons) {
        if (button.contains(click.x, click.y)) {
          this.doAction(button.action);
          handled = true;
          break;
        }
      }
      if (!handled && this.state === 'title') this.doAction('start');
      else if (!handled && this.state === 'clear') this.doAction('next');
    }

    if (this.state === 'title') {
      if (input.anyPressed(['Enter', 'Space'])) this.doAction('start');
      else if (input.wasPressed('KeyH')) this.doAction('help');
    } else if (this.state === 'help') {
      if (input.anyPressed(['KeyH', 'Escape', 'Enter'])) this.doAction('title');
    } else if (this.state === 'play') {
      if (input.anyPressed(['KeyP', 'Escape'])) this.setState('pause');
    } else if (this.state === 'pause') {
      if (input.anyPressed(['KeyP', 'Escape', 'Enter'])) this.setState('play');
      else if (input.wasPressed('KeyR')) this.doAction('restart');
    } else if (this.state === 'clear') {
      if (input.anyPressed(['Enter', 'Space'])) this.doAction('next');
    } else if (this.state === 'win' || this.state === 'lose') {
      if (input.anyPressed(['Enter', 'KeyR', 'Space'])) this.doAction('restart');
      else if (input.wasPressed('Escape')) this.doAction('title');
    }
  }

  // --- Render --------------------------------------------------------------------

  render() {
    const { ctx } = this;
    ctx.save();
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (this.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    this.renderer.drawBackground(this.time);

    const inRun = ['play', 'pause', 'dying', 'clear'].includes(this.state);
    if (inRun) {
      this.renderer.drawWorld(ctx, this.world, this.time);
      this.particles.draw(ctx);
      this.renderer.drawPlayer(ctx, this.player, this.time, this.input.braking() && this.state === 'play');
      this.texts.draw(ctx);
    }
    if (this.state === 'title' || this.state === 'help') {
      ctx.save();
      ctx.globalAlpha = 0.45;
      this.renderer.drawWorld(ctx, this.world, this.time);
      ctx.restore();
      this.particles.draw(ctx);
      if (this.demoShip) {
        this.renderer.drawShipBody(ctx, this.demoShip, this.time, false);
      }
    }
    if (this.state === 'win' || this.state === 'lose') {
      this.particles.draw(ctx);
    }

    if (inRun) this.renderer.drawHud(ctx, this);
    this.renderer.drawVignette(ctx, this.flash);
    ctx.restore();

    // Overlays (unshaken).
    if (this.state === 'title') drawTitle(ctx, this, this.time);
    else if (this.state === 'help') drawHelp(ctx);
    else if (this.state === 'pause') drawPause(ctx);
    else if (this.state === 'clear') drawLevelClear(ctx, this);
    else if (this.state === 'win') drawWin(ctx, this);
    else if (this.state === 'lose') drawLose(ctx, this);

    for (const button of this.buttons) button.draw(ctx, this.time);

    // Hover cursor.
    const hovered = this.buttons.some((b) => b.contains(this.input.pointer.x, this.input.pointer.y));
    for (const button of this.buttons) {
      button.hover = button.contains(this.input.pointer.x, this.input.pointer.y);
    }
    this.canvas.style.cursor = hovered ? 'pointer' : 'default';
  }

  // --- Main loop -------------------------------------------------------------------

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    if (this.lastNow === undefined) this.lastNow = now;
    let dt = (now - this.lastNow) / 1000;
    this.lastNow = now;
    dt = Math.min(dt, 0.1);

    this.handleInput();
    if (!this.frozen) {
      this.accumulator = (this.accumulator || 0) + dt;
      let steps = 0;
      while (this.accumulator >= STEP && steps < 8) {
        this.update(STEP);
        this.accumulator -= STEP;
        steps += 1;
      }
      if (steps === 8) this.accumulator = 0;
    } else {
      // Frozen (screenshot mode): keep the picture alive but the sim still.
      this.time += dt;
    }
    this.render();
    this.input.endFrame();
  }

  // Run the simulation forward synchronously (screenshot mode). The input
  // driver function receives the game and returns a scripted input each step.
  simulate(seconds, driver) {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i += 1) {
      if (driver) driver(this, i * STEP);
      this.update(STEP);
      if (this.state !== 'play') break;
    }
    this.input.scripted = null;
  }

  run() {
    requestAnimationFrame((t) => this.frame(t));
  }
}

function boot() {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  document.title = GAME_NAME;
  // A read-only handle for automated playtests and debugging.
  window.__game = game;
  game.run();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
