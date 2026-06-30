import { create } from "zustand";
import { distance, point } from "@turf/turf";
import type { Coord, GameImage, Phase, RoundResult } from "../types";
import { scoreFor } from "../config/scoring";
import poolJson from "../data/pool.national.json";

const POOL = poolJson as GameImage[];

export function pickRandom(
  pool: GameImage[],
  excludeId?: string
): GameImage | null {
  if (pool.length === 0) return null;
  const candidates =
    pool.length > 1 && excludeId
      ? pool.filter((i) => i.id !== excludeId)
      : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function computeResult(truth: Coord, guess: Coord): RoundResult {
  const distanceKm = distance(
    point([truth.lng, truth.lat]),
    point([guess.lng, guess.lat]),
    { units: "kilometers" }
  );
  return { distanceKm, score: scoreFor(distanceKm) };
}

interface GameState {
  current: GameImage | null;
  guess: Coord | null;
  phase: Phase;
  result: RoundResult | null;
  imageError: boolean;
  newRound: () => void;
  setGuess: (c: Coord) => void;
  submitGuess: () => void;
  playAgain: () => void;
  reportImageError: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  current: pickRandom(POOL),
  guess: null,
  phase: "guessing",
  result: null,
  imageError: false,

  newRound: () =>
    set((s) => {
      const next = pickRandom(POOL, s.current?.id);
      return {
        current: next ?? s.current,
        guess: null,
        phase: "guessing",
        result: null,
        imageError: false,
      };
    }),

  // FIX 1: phase-gate — ignore updates unless in guessing phase
  setGuess: (c) => {
    if (get().phase !== "guessing") return;
    set({ guess: c });
  },

  submitGuess: () => {
    const { current, guess } = get();
    if (!current || !guess) return;
    const truth = { lng: current.lng, lat: current.lat };
    set({ phase: "revealed", result: computeResult(truth, guess) });
  },

  playAgain: () => get().newRound(),

  // FIX 2: report a panorama load failure
  reportImageError: () => set({ imageError: true }),
}));
