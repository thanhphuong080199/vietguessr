import { describe, it, expect } from "vitest";
import {
  tileBounds,
  isInBounds,
  toGameImage,
  dedupeByProximity,
  lngLatToTile,
  tilesCovering,
  toCandidate,
  isInPolygon,
} from "./build-pool.helpers";
import type { Feature, Polygon } from "geojson";

const B = { minLng: 0, minLat: 0, maxLng: 2, maxLat: 2 };

describe("tileBounds", () => {
  it("covers the area with cells of the given step", () => {
    const cells = tileBounds(B, 1);
    expect(cells).toHaveLength(4); // 2x2 grid
    expect(cells).toContainEqual([0, 0, 1, 1]);
    expect(cells).toContainEqual([1, 1, 2, 2]);
    // FIX 7: assert all 4 expected cells
    expect(cells).toContainEqual([0, 1, 1, 2]);
    expect(cells).toContainEqual([1, 0, 2, 1]);
  });
});

describe("isInBounds", () => {
  it("accepts a point inside", () => {
    expect(isInBounds(1, 1, B)).toBe(true);
  });
  it("rejects a point outside", () => {
    expect(isInBounds(5, 5, B)).toBe(false);
  });
});

describe("toGameImage", () => {
  it("maps a spherical feature to a pano GameImage", () => {
    const g = toGameImage({
      id: "123",
      computed_geometry: { coordinates: [106.7, 10.8] },
      camera_type: "spherical",
    });
    expect(g).toEqual({ id: "123", lng: 106.7, lat: 10.8, isPano: true });
  });
  it("marks non-spherical as flat", () => {
    const g = toGameImage({
      id: "9",
      geometry: { coordinates: [105, 21] },
      camera_type: "perspective",
    });
    expect(g?.isPano).toBe(false);
  });
  it("returns null when no coordinates are present", () => {
    expect(toGameImage({ id: "x" })).toBeNull();
  });
  // FIX 7: computed_geometry wins over geometry when both are present
  it("prefers computed_geometry over geometry when both are present", () => {
    const g = toGameImage({
      id: "dual",
      computed_geometry: { coordinates: [106.7, 10.8] },
      geometry: { coordinates: [105.0, 20.0] },
      camera_type: "spherical",
    });
    expect(g).toEqual({ id: "dual", lng: 106.7, lat: 10.8, isPano: true });
  });
});

describe("lngLatToTile", () => {
  it("computes the slippy-map tile for a coordinate (HCMC, z14)", () => {
    expect(lngLatToTile(106.7, 10.77, 14)).toEqual({ x: 13048, y: 7698 });
  });
});

describe("tilesCovering", () => {
  it("returns the full rectangle of tiles spanning the bounds", () => {
    const z = 10;
    const b = { minLng: 106, minLat: 10, maxLng: 107, maxLat: 11 };
    const tiles = tilesCovering(b, z);
    const tl = lngLatToTile(b.minLng, b.maxLat, z); // top-left
    const br = lngLatToTile(b.maxLng, b.minLat, z); // bottom-right
    expect(tiles).toContainEqual({ x: tl.x, y: tl.y });
    expect(tiles).toContainEqual({ x: br.x, y: br.y });
    expect(tiles).toHaveLength((br.x - tl.x + 1) * (br.y - tl.y + 1));
    // no duplicate tiles
    const keys = new Set(tiles.map((t) => `${t.x}/${t.y}`));
    expect(keys.size).toBe(tiles.length);
  });
});

describe("toCandidate", () => {
  it("maps a sequence feature to a candidate", () => {
    expect(toCandidate({ image_id: 123, is_pano: true }, [106.7, 10.8])).toEqual({
      id: "123",
      lng: 106.7,
      lat: 10.8,
      isPano: true,
    });
  });
  it("defaults isPano to false when not spherical", () => {
    expect(toCandidate({ image_id: 5 }, [1, 2])?.isPano).toBe(false);
  });
  it("falls back to the `id` property when there is no image_id", () => {
    expect(toCandidate({ id: 9 }, [1, 2])?.id).toBe("9");
  });
  it("returns null without an image id", () => {
    expect(toCandidate({ is_pano: true }, [1, 2])).toBeNull();
  });
  it("returns null without a coordinate", () => {
    expect(toCandidate({ image_id: 5 }, undefined)).toBeNull();
  });
});

describe("isInPolygon", () => {
  const square: Feature<Polygon> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    },
  };
  it("accepts a point inside the polygon", () => {
    expect(isInPolygon(5, 5, square)).toBe(true);
  });
  it("rejects a point inside the bbox but outside the polygon", () => {
    // a notch-free square has no such gap, so test a clearly outside point
    expect(isInPolygon(15, 5, square)).toBe(false);
  });
});

describe("dedupeByProximity", () => {
  it("drops a second image within minKm of the first", () => {
    const imgs = [
      { id: "a", lng: 106.7, lat: 10.8, isPano: true },
      { id: "b", lng: 106.7001, lat: 10.8001, isPano: true }, // ~15m away
      { id: "c", lng: 105.85, lat: 21.02, isPano: false }, // far (Hanoi)
    ];
    const out = dedupeByProximity(imgs, 1);
    expect(out.map((i) => i.id)).toEqual(["a", "c"]);
  });
});
