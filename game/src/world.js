// A star system at run time: planets, shards, mines, pickups and the gate,
// plus collisions and scoring events. The Game owns the run (score, combo,
// hearts across levels); the World owns one level's state and its events.

import { TUNE } from './config.js';
import { LEVELS } from './levels.js';
import { circlesHit, resolvePlanetHit } from './physics.js';
import { makeRng } from './rng.js';

export class World {
  constructor() {
    this.levelIndex = 0;
    this.def = null;
    this.planets = [];
    this.shards = [];
    this.mines = [];
    this.pickups = [];
    this.gate = null;
    this.levelTime = 0;
    this.gateOpen = false;
    this.gateAnnounced = false;
    this.time = 0;
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.def = LEVELS[index];
    const rng = makeRng(1000 + index * 77);
    this.planets = this.def.planets.map((planet, i) => ({
      ...planet,
      craters: Array.from({ length: 5 }, () => ({
        dx: rng.range(-0.55, 0.55) * planet.radius,
        dy: rng.range(-0.55, 0.55) * planet.radius,
        r: rng.range(0.1, 0.22) * planet.radius,
      })),
      seed: i * 13 + 5,
    }));
    this.shards = this.def.shards.map((shard, i) => ({
      ...shard, taken: false, phase: rng.range(0, Math.PI * 2), index: i,
    }));
    this.mines = this.def.mines.map((mine, i) => ({
      ...mine,
      baseX: mine.x,
      baseY: mine.y,
      alive: true,
      phase: rng.range(0, Math.PI * 2),
      angle: (mine.phase || 0) + i,
      spin: rng.range(0.4, 0.9) * (i % 2 === 0 ? 1 : -1),
    }));
    this.pickups = this.def.pickups.map((pickup) => ({
      ...pickup, taken: false, phase: rng.range(0, Math.PI * 2),
    }));
    this.gate = { ...this.def.gate, radius: 36, swirl: 0 };
    this.levelTime = 0;
    this.gateOpen = false;
    this.gateAnnounced = false;
    this.time = 0;
  }

  get shardsLeft() {
    return this.shards.filter((shard) => !shard.taken).length;
  }

  get shardsTotal() {
    return this.shards.length;
  }

  get shardsTaken() {
    return this.shardsTotal - this.shardsLeft;
  }

  // dtWorld scales mines, timers and ambient motion (slow-mo); the player
  // always moves on real time so slow-mo feels like an advantage.
  update(dtWorld, dtPlayer, player, input, onTrail) {
    const events = [];
    this.time += dtWorld;
    this.levelTime += dtWorld;
    this.gate.swirl += dtWorld * (this.gateOpen ? 2.4 : 0.7);

    for (const mine of this.mines) {
      if (!mine.alive) continue;
      mine.angle += dtWorld * mine.spin;
      if (mine.orbit) {
        const speed = 0.32;
        mine.orbitAngle = (mine.orbitAngle ?? mine.angle) + dtWorld * speed;
        mine.x = mine.baseX + Math.cos(mine.orbitAngle) * mine.orbit;
        mine.y = mine.baseY + Math.sin(mine.orbitAngle) * mine.orbit;
      } else if (mine.drift) {
        mine.x = mine.baseX + Math.sin(this.time * 0.5 + mine.phase) * mine.drift;
        mine.y = mine.baseY + Math.cos(this.time * 0.37 + mine.phase) * mine.drift * 0.7;
      }
    }

    player.update(dtPlayer, input, this.planets, onTrail);

    // Shards.
    for (const shard of this.shards) {
      if (shard.taken) continue;
      if (circlesHit(player.x, player.y, TUNE.shipRadius + 6, shard.x, shard.y, 20)) {
        shard.taken = true;
        events.push({ type: 'shard', x: shard.x, y: shard.y });
      }
    }

    // Pickups.
    for (const pickup of this.pickups) {
      if (pickup.taken) continue;
      if (circlesHit(player.x, player.y, TUNE.shipRadius + 6, pickup.x, pickup.y, 22)) {
        pickup.taken = true;
        events.push({ type: 'pickup', kind: pickup.kind, x: pickup.x, y: pickup.y });
      }
    }

    // Gate opens the moment the last shard is taken.
    if (!this.gateOpen && this.shardsLeft === 0) {
      this.gateOpen = true;
      events.push({ type: 'gateOpen', x: this.gate.x, y: this.gate.y });
    }

    // Gate entry completes the level.
    if (this.gateOpen && circlesHit(player.x, player.y, TUNE.shipRadius, this.gate.x, this.gate.y, this.gate.radius - 6)) {
      events.push({ type: 'complete', x: this.gate.x, y: this.gate.y });
      return events;
    }

    // Mines: contact destroys the mine and hurts the ship (unless shielded
    // or invulnerable — the player resolves that).
    for (const mine of this.mines) {
      if (!mine.alive) continue;
      if (circlesHit(player.x, player.y, TUNE.shipRadius + 2, mine.x, mine.y, 17)) {
        const result = player.takeHit();
        if (result !== 'safe') {
          mine.alive = false;
          events.push({ type: 'mineDown', x: mine.x, y: mine.y, result });
        }
        events.push({ type: 'hit', x: player.x, y: player.y, result, source: 'mine' });
        if (result === 'hit') {
          player.vx *= -0.4;
          player.vy *= -0.4;
        }
        break;
      }
    }

    // Planets: a crash bounces the ship and hurts it.
    for (const planet of this.planets) {
      if (circlesHit(player.x, player.y, TUNE.shipRadius - 2, planet.x, planet.y, planet.radius)) {
        const resolved = resolvePlanetHit(player.x, player.y, player.vx, player.vy, TUNE.shipRadius, planet, TUNE.crashBounce);
        player.x = resolved.x;
        player.y = resolved.y;
        player.vx = resolved.vx;
        player.vy = resolved.vy;
        const result = player.takeHit();
        events.push({ type: 'hit', x: player.x, y: player.y, result, source: 'planet' });
        break;
      }
    }

    return events;
  }
}
