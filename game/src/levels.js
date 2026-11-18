// The six star systems. Layouts are hand-placed (no RNG) so every run of a
// level is fair and learnable, and scripted play stays reproducible.
// Coordinates are canvas pixels in the 1280x720 playfield; the HUD occupies
// the top 64 pixels, so nothing is placed above y = 96.

export const LEVELS = [
  {
    name: 'First Light',
    sub: 'Learn to fly. Gather the shards, reach the gate.',
    par: 45,
    spawn: { x: 120, y: 380 },
    planets: [
      { x: 640, y: 400, radius: 58, mass: 1.0, hue: 222, ring: false },
    ],
    shards: [
      { x: 330, y: 220 }, { x: 640, y: 180 }, { x: 940, y: 260 }, { x: 1080, y: 480 },
    ],
    mines: [],
    pickups: [],
    gate: { x: 1160, y: 620 },
  },
  {
    name: 'Twin Suns',
    sub: 'Two wells pull at once. Thread the middle.',
    par: 55,
    spawn: { x: 110, y: 620 },
    planets: [
      { x: 430, y: 300, radius: 52, mass: 0.9, hue: 28, ring: true },
      { x: 860, y: 480, radius: 52, mass: 0.9, hue: 200, ring: false },
    ],
    shards: [
      { x: 300, y: 180 }, { x: 640, y: 390 }, { x: 640, y: 620 }, { x: 950, y: 220 }, { x: 1120, y: 380 },
    ],
    mines: [
      { x: 640, y: 250, drift: 26 },
      { x: 980, y: 560, drift: 22 },
    ],
    pickups: [],
    gate: { x: 1160, y: 130 },
  },
  {
    name: 'The Shattered Belt',
    sub: 'Mines drift between the rocks. A shield waits below.',
    par: 65,
    spawn: { x: 110, y: 140 },
    planets: [
      { x: 360, y: 430, radius: 48, mass: 0.85, hue: 160, ring: false },
      { x: 700, y: 240, radius: 44, mass: 0.8, hue: 280, ring: true },
      { x: 990, y: 500, radius: 50, mass: 0.9, hue: 222, ring: false },
    ],
    shards: [
      { x: 260, y: 300 }, { x: 520, y: 560 }, { x: 700, y: 420 }, { x: 860, y: 160 }, { x: 1060, y: 300 }, { x: 1180, y: 620 },
    ],
    mines: [
      { x: 520, y: 300, drift: 30 },
      { x: 830, y: 380, drift: 26 },
      { x: 1120, y: 170, drift: 24 },
      { x: 240, y: 580, drift: 28 },
    ],
    pickups: [
      { x: 360, y: 620, kind: 'shield' },
    ],
    gate: { x: 1160, y: 110 },
  },
  {
    name: 'Neon Drift',
    sub: 'Strong wells, fast lanes. Slow time to slip through.',
    par: 70,
    spawn: { x: 110, y: 620 },
    planets: [
      { x: 400, y: 260, radius: 56, mass: 1.25, hue: 320, ring: true },
      { x: 780, y: 520, radius: 56, mass: 1.25, hue: 190, ring: true },
      { x: 1080, y: 240, radius: 42, mass: 0.9, hue: 40, ring: false },
    ],
    shards: [
      { x: 240, y: 300 }, { x: 400, y: 560 }, { x: 620, y: 180 }, { x: 780, y: 300 }, { x: 960, y: 620 }, { x: 1180, y: 420 },
    ],
    mines: [
      { x: 560, y: 380, drift: 34 },
      { x: 920, y: 380, drift: 30 },
      { x: 250, y: 520, drift: 26 },
      { x: 1180, y: 620, drift: 22 },
      { x: 640, y: 620, drift: 30 },
    ],
    pickups: [
      { x: 590, y: 480, kind: 'slowmo' },
    ],
    gate: { x: 1160, y: 110 },
  },
  {
    name: 'The Maw',
    sub: 'One great well. Orbit it — do not fall in.',
    par: 75,
    spawn: { x: 110, y: 380 },
    planets: [
      { x: 640, y: 400, radius: 92, mass: 1.9, hue: 262, ring: true },
    ],
    shards: [
      { x: 330, y: 190 }, { x: 640, y: 150 }, { x: 950, y: 190 }, { x: 1120, y: 400 },
      { x: 950, y: 610 }, { x: 640, y: 650 }, { x: 330, y: 610 }, { x: 160, y: 400 },
    ],
    mines: [
      { x: 470, y: 260, drift: 20 },
      { x: 810, y: 260, drift: 20 },
      { x: 470, y: 540, drift: 20 },
      { x: 810, y: 540, drift: 20 },
      { x: 640, y: 400, drift: 0, orbit: 190 },
      { x: 640, y: 400, drift: 0, orbit: 190, phase: Math.PI },
    ],
    pickups: [
      { x: 110, y: 620, kind: 'heart' },
    ],
    gate: { x: 1160, y: 110 },
  },
  {
    name: 'Last Delivery',
    sub: 'Everything at once. Bring the light home.',
    par: 90,
    spawn: { x: 110, y: 620 },
    planets: [
      { x: 330, y: 250, radius: 50, mass: 1.0, hue: 222, ring: true },
      { x: 660, y: 500, radius: 54, mass: 1.1, hue: 28, ring: false },
      { x: 950, y: 260, radius: 48, mass: 1.0, hue: 160, ring: true },
      { x: 1150, y: 560, radius: 44, mass: 0.9, hue: 280, ring: false },
    ],
    shards: [
      { x: 220, y: 400 }, { x: 330, y: 620 }, { x: 500, y: 180 }, { x: 660, y: 300 },
      { x: 800, y: 620 }, { x: 950, y: 440 }, { x: 1080, y: 140 }, { x: 1180, y: 320 },
    ],
    mines: [
      { x: 480, y: 380, drift: 32 },
      { x: 780, y: 160, drift: 30 },
      { x: 1050, y: 420, drift: 28 },
      { x: 220, y: 180, drift: 26 },
      { x: 560, y: 620, drift: 30 },
      { x: 900, y: 560, drift: 26 },
      { x: 1180, y: 130, drift: 22 },
    ],
    pickups: [
      { x: 180, y: 260, kind: 'shield' },
      { x: 880, y: 360, kind: 'slowmo' },
    ],
    gate: { x: 640, y: 110 },
  },
];
