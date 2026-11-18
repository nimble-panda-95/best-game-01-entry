// Starlight Courier — tuning constants and palette.
// One place for every number that shapes how the game feels.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 64;

// Play area: the whole canvas below the HUD bar.
export const PLAY = {
  left: 16,
  top: HUD_H + 8,
  right: VIEW_W - 16,
  bottom: VIEW_H - 16,
};

export const PALETTE = {
  spaceTop: '#0b1030',
  spaceBottom: '#04050f',
  hudBar: 'rgba(6, 8, 24, 0.72)',
  hudLine: 'rgba(140, 170, 255, 0.25)',
  text: '#eef2ff',
  textDim: '#9aa7d0',
  accent: '#ffd166',
  accent2: '#6ee7ff',
  danger: '#ff5d73',
  good: '#7dffb2',
  shipCore: '#ffffff',
  shipGlow: '#6ee7ff',
  shard: '#ffd166',
  gateOpen: '#7dffb2',
  gateClosed: '#5a6a9e',
  mine: '#ff5d73',
  shield: '#6ee7ff',
  slowmo: '#c792ff',
  heart: '#ff5d73',
};

export const TUNE = {
  // Ship flight.
  thrust: 430,
  maxSpeed: 345,
  drag: 0.14,
  brake: 3.4,
  shipRadius: 13,
  turnRate: 9,
  // Gravity: accel = gravityK / dist^2, faded out past gravityRange.
  gravityK: 1350000,
  gravityMax: 250,
  gravityRange: 265,
  gravityFade: 115,
  // Damage and recovery.
  maxHearts: 3,
  invulnTime: 1.6,
  crashBounce: 0.55,
  shakeOnHit: 14,
  // Pickups and combo.
  comboWindow: 3.0,
  comboMax: 5,
  shardScore: 100,
  levelBonus: 500,
  slowmoTime: 5.0,
  slowmoScale: 0.45,
  // Feel.
  trailRate: 0.016,
  shakeDecay: 26,
  flashDecay: 2.2,
};

export const GAME_NAME = 'Starlight Courier';
export const GAME_TAGLINE = 'Carry the light home.';
