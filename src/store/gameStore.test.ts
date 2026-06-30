import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore, pickRandom, computeResult } from "./gameStore";
import type { GameImage } from "../types";

const POOL: GameImage[] = [
  { id: "a", lng: 106.7, lat: 10.8, isPano: true },
  { id: "b", lng: 105.85, lat: 21.02, isPano: false },
];

describe("pickRandom", () => {
  it("returns null for an empty pool", () => {
    expect(pickRandom([])).toBeNull();
  });
  it("avoids the excluded id when alternatives exist", () => {
    for (let i = 0; i < 20; i++) {
      expect(pickRandom(POOL, "a")?.id).toBe("b");
    }
  });
  it("returns the only image even if it is excluded", () => {
    expect(pickRandom([POOL[0]], "a")?.id).toBe("a");
  });
});

describe("computeResult", () => {
  it("is 5000 and ~0 km when guess equals truth", () => {
    const r = computeResult({ lng: 106.7, lat: 10.8 }, { lng: 106.7, lat: 10.8 });
    expect(r.score).toBe(5000);
    expect(r.distanceKm).toBeCloseTo(0, 5);
  });
  it("produces a positive distance and lower score when far", () => {
    const r = computeResult({ lng: 106.7, lat: 10.8 }, { lng: 105.85, lat: 21.02 });
    expect(r.distanceKm).toBeGreaterThan(1000);
    expect(r.score).toBeLessThan(5000);
  });
});

describe("useGameStore", () => {
  beforeEach(() => {
    useGameStore.setState({
      current: POOL[0],
      guess: null,
      phase: "guessing",
      result: null,
      imageError: false,
    } as Parameters<typeof useGameStore.setState>[0]);
  });

  it("setGuess stores the coordinate", () => {
    useGameStore.getState().setGuess({ lng: 106, lat: 16 });
    expect(useGameStore.getState().guess).toEqual({ lng: 106, lat: 16 });
  });

  it("submitGuess computes a result and reveals", () => {
    useGameStore.getState().setGuess({ lng: 106.7, lat: 10.8 });
    useGameStore.getState().submitGuess();
    const s = useGameStore.getState();
    expect(s.phase).toBe("revealed");
    expect(s.result?.score).toBe(5000);
  });

  it("submitGuess is a no-op without a guess", () => {
    useGameStore.getState().submitGuess();
    expect(useGameStore.getState().phase).toBe("guessing");
    expect(useGameStore.getState().result).toBeNull();
  });

  it("playAgain resets guess/result and returns to guessing", () => {
    useGameStore.getState().setGuess({ lng: 106, lat: 16 });
    useGameStore.getState().submitGuess();
    useGameStore.getState().playAgain();
    const s = useGameStore.getState();
    expect(s.phase).toBe("guessing");
    expect(s.guess).toBeNull();
    expect(s.result).toBeNull();
    expect(s.current).not.toBeNull();
  });

  // FIX 1: phase-gate — setGuess must be a no-op after reveal
  it("setGuess is ignored after submitGuess (revealed phase)", () => {
    useGameStore.getState().setGuess({ lng: 106, lat: 16 });
    useGameStore.getState().submitGuess();
    const guessAfterReveal = useGameStore.getState().guess;
    // Attempt to move the pin after reveal — must not change guess
    useGameStore.getState().setGuess({ lng: 109, lat: 12 });
    expect(useGameStore.getState().guess).toEqual(guessAfterReveal);
  });

  // FIX 2: imageError field and reportImageError action
  it("reportImageError sets imageError to true", () => {
    expect(useGameStore.getState().imageError).toBe(false);
    useGameStore.getState().reportImageError();
    expect(useGameStore.getState().imageError).toBe(true);
  });

  it("newRound resets imageError to false", () => {
    useGameStore.getState().reportImageError();
    expect(useGameStore.getState().imageError).toBe(true);
    useGameStore.getState().newRound();
    expect(useGameStore.getState().imageError).toBe(false);
  });
});
