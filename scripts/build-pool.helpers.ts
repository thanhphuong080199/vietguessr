import { booleanPointInPolygon, distance, point } from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { GameImage } from "../src/types";

export interface Bounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface MapillaryFeature {
  id: string;
  computed_geometry?: { coordinates: [number, number] };
  geometry?: { coordinates: [number, number] };
  camera_type?: string;
}

/** Slippy-map tile XY for a coordinate at the given zoom. */
export function lngLatToTile(
  lng: number,
  lat: number,
  z: number
): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/** Every tile (at zoom z) needed to cover the bounds. */
export function tilesCovering(
  b: Bounds,
  z: number
): Array<{ x: number; y: number }> {
  // Top-left is (minLng, maxLat); bottom-right is (maxLng, minLat) in tile space.
  const tl = lngLatToTile(b.minLng, b.maxLat, z);
  const br = lngLatToTile(b.maxLng, b.minLat, z);
  const tiles: Array<{ x: number; y: number }> = [];
  for (let x = tl.x; x <= br.x; x++) {
    for (let y = tl.y; y <= br.y; y++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

/** Vector-tile feature properties from Mapillary's `sequence`/`image` layers. */
export type TileProps = Record<string, boolean | number | string>;

/**
 * Turn a vector-tile sequence/image feature into a pool candidate.
 * Returns null when it lacks an image id or a coordinate. The coordinate and
 * `is_pano` here are approximate (tile-simplified); refine via the Graph API by id.
 */
export function toCandidate(
  props: TileProps,
  coord: [number, number] | undefined
): GameImage | null {
  const imageId = props.image_id ?? props.id;
  if (coord === undefined || imageId === undefined || imageId === "") {
    return null;
  }
  return {
    id: String(imageId),
    lng: coord[0],
    lat: coord[1],
    isPano: props.is_pano === true,
  };
}

export function tileBounds(
  b: Bounds,
  stepDeg: number
): Array<[number, number, number, number]> {
  const cells: Array<[number, number, number, number]> = [];
  for (let lng = b.minLng; lng < b.maxLng; lng += stepDeg) {
    for (let lat = b.minLat; lat < b.maxLat; lat += stepDeg) {
      cells.push([
        lng,
        lat,
        Math.min(lng + stepDeg, b.maxLng),
        Math.min(lat + stepDeg, b.maxLat),
      ]);
    }
  }
  return cells;
}

export function isInBounds(lng: number, lat: number, b: Bounds): boolean {
  return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
}

/**
 * True when the point lies inside the polygon. A rectangular bbox over Vietnam
 * also covers Cambodia, Laos, Thailand and the Gulf, so the actual country
 * border is needed to keep neighbouring-country imagery out of the pool.
 */
export function isInPolygon(
  lng: number,
  lat: number,
  poly: Feature<Polygon | MultiPolygon>
): boolean {
  return booleanPointInPolygon(point([lng, lat]), poly);
}

export function toGameImage(f: MapillaryFeature): GameImage | null {
  const coords = f.computed_geometry?.coordinates ?? f.geometry?.coordinates;
  if (!coords) return null;
  const [lng, lat] = coords;
  return { id: f.id, lng, lat, isPano: f.camera_type === "spherical" };
}

export function dedupeByProximity(
  images: GameImage[],
  minKm: number
): GameImage[] {
  const kept: GameImage[] = [];
  for (const img of images) {
    const tooClose = kept.some(
      (k) =>
        distance(point([k.lng, k.lat]), point([img.lng, img.lat]), {
          units: "kilometers",
        }) < minKm
    );
    if (!tooClose) kept.push(img);
  }
  return kept;
}
