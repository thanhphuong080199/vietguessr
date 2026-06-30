import { describe, it, expect } from "vitest";
import { scoreFor, SCORE_DECAY_KM } from "./scoring";

describe("scoreFor", () => {
  it("gives the maximum at distance 0", () => {
    expect(scoreFor(0)).toBe(5000);
  });

  it("decreases monotonically as distance grows", () => {
    expect(scoreFor(10)).toBeGreaterThan(scoreFor(100));
    expect(scoreFor(100)).toBeGreaterThan(scoreFor(1000));
  });

  it("never returns below 0 and never above 5000", () => {
    expect(scoreFor(99999)).toBeGreaterThanOrEqual(0);
    expect(scoreFor(0)).toBeLessThanOrEqual(5000);
  });

  it("returns an integer", () => {
    expect(Number.isInteger(scoreFor(37.5))).toBe(true);
  });

  it("matches the decay formula at one decay length", () => {
    // exp(-1) * 5000 ≈ 1839.4 -> rounds to 1839
    expect(scoreFor(SCORE_DECAY_KM)).toBe(1839);
  });
});
