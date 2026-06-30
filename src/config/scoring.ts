export const SCORE_DECAY_KM = 300;
const MAX_SCORE = 5000;

export function scoreFor(distanceKm: number): number {
  const raw = MAX_SCORE * Math.exp(-distanceKm / SCORE_DECAY_KM);
  return Math.round(Math.max(0, Math.min(MAX_SCORE, raw)));
}
