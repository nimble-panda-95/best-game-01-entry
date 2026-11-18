// Best-score persistence. Wrapped in try/catch: storage can be unavailable
// (private mode, file:// in some browsers) and the game must not care.

const BEST_KEY = 'starlight-courier-best';

export function loadBest() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.floor(score)));
  } catch {
    // Storage unavailable: the score simply is not kept.
  }
}
