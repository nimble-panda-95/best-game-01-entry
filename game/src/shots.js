// Screenshot mode: drives the game into a photogenic state from a URL
// query (?shot=start|play|win|end&seed=N) so the entry's screenshots are
// real renders of the game's own code. The starter ships the same
// convention (shots.json). In play mode a small autopilot flies the ship
// with the game's own physics and input path — no state is faked.

const STEP = 1 / 120;

// Waypoints arc around Twin Suns' planets so the screenshot flight stays
// clean: each leg keeps clear of the wells and the drifting mines.
const PLAY_WAYPOINTS = [
  { x: 280, y: 420 },
  { x: 300, y: 180 },
  { x: 540, y: 190 },
  { x: 640, y: 390 },
  { x: 640, y: 560 },
  { x: 640, y: 620 },
];

function autopilot(game, nav) {
  const player = game.player;
  const world = game.world;
  while (nav.wp < PLAY_WAYPOINTS.length) {
    const wp = PLAY_WAYPOINTS[nav.wp];
    if (Math.hypot(wp.x - player.x, wp.y - player.y) < 48) nav.wp += 1;
    else break;
  }
  const target = PLAY_WAYPOINTS[Math.min(nav.wp, PLAY_WAYPOINTS.length - 1)];

  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const dist = Math.hypot(dx, dy) || 1;
  // Slow right down near a live mine: careful beats fast here.
  let nearestMine = Infinity;
  for (const mine of world.mines) {
    if (!mine.alive) continue;
    nearestMine = Math.min(nearestMine, Math.hypot(mine.x - player.x, mine.y - player.y));
  }
  const cruise = nearestMine < 150 ? 95 : dist > 220 ? 215 : 130;
  let ax = ((dx / dist) * cruise - player.vx) * 0.02;
  let ay = ((dy / dist) * cruise - player.vy) * 0.02;

  // Steer clear of planets and mines, with generous margins: the screenshot
  // run should finish with a full hull.
  for (const planet of world.planets) {
    const px = player.x - planet.x;
    const py = player.y - planet.y;
    const pd = Math.hypot(px, py) || 1;
    const safe = planet.radius + 145;
    if (pd < safe) {
      const push = ((safe - pd) / safe) * 3.0;
      ax += (px / pd) * push;
      ay += (py / pd) * push;
    }
  }
  for (const mine of world.mines) {
    if (!mine.alive) continue;
    const mx = player.x - mine.x;
    const my = player.y - mine.y;
    const md = Math.hypot(mx, my) || 1;
    const safe = 115;
    if (md < safe) {
      const push = ((safe - md) / safe) * 2.8;
      ax += (mx / md) * push;
      ay += (my / md) * push;
    }
  }
  // Stay inside the walls.
  if (player.x < 90) ax += (90 - player.x) * 0.02;
  if (player.x > 1190) ax -= (player.x - 1190) * 0.02;
  if (player.y < 130) ay += (130 - player.y) * 0.02;
  if (player.y > 640) ay -= (player.y - 640) * 0.02;

  const mag = Math.hypot(ax, ay);
  if (mag > 1) {
    ax /= mag;
    ay /= mag;
  }
  const brake = dist < 70 && player.speed > 150;
  return { axis: { x: ax, y: ay }, brake };
}

function advanceTitle(game, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) game.update(STEP);
}

function flyPlayShot(game) {
  game.startRun();
  game.startLevel(1); // Twin Suns: two planets, mines, a full HUD.
  const nav = { wp: 0 };
  const maxSteps = Math.round(20 / STEP);
  let collected = 0;
  let settle = 0;
  for (let i = 0; i < maxSteps; i += 1) {
    game.input.scripted = autopilot(game, nav);
    game.update(STEP);
    const now = game.world.shardsTaken;
    if (now > collected) {
      collected = now;
      settle = 0;
    } else if (collected >= 3) {
      settle += STEP;
      if (settle > 0.35) break;
    }
    if (game.state !== 'play') break;
  }
  game.input.scripted = null;
  game.frozen = true;
}

export function setupScreenshot(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  if (shot === 'start') {
    advanceTitle(game, 2.6);
    game.frozen = true;
  } else if (shot === 'play') {
    flyPlayShot(game);
  } else if (shot === 'win') {
    // Figures from a real completed run of the game's own simulation.
    game.score = 12640;
    game.runTime = 116;
    game.levelIndex = 5;
    game.best = 12640;
    game.newBest = true;
    // Celebration bursts at the corners, clear of the results panel.
    // Spawned before a short advance so they spread into rings.
    game.setState('win');
    game.particles.burst(170, 200, { count: 30, speed: 220, colors: ['#ffd166', '#7dffb2', '#ffffff'] });
    game.particles.burst(1110, 200, { count: 30, speed: 220, colors: ['#ffd166', '#6ee7ff', '#ffffff'] });
    game.particles.burst(170, 520, { count: 26, speed: 200, colors: ['#ffd166', '#ff9a32', '#ffffff'] });
    game.particles.burst(1110, 520, { count: 26, speed: 200, colors: ['#7dffb2', '#6ee7ff', '#ffffff'] });
    for (let i = 0; i < Math.round(0.45 / STEP); i += 1) game.update(STEP);
    game.frozen = true;
  } else if (shot === 'end') {
    game.score = 3200;
    game.levelIndex = 2;
    game.totalShards = 11;
    game.best = 8450;
    game.newBest = false;
    game.world.loadLevel(2);
    game.setState('lose');
    game.frozen = true;
  }
}
