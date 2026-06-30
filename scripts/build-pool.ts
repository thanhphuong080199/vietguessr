import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import type { Feature, Geometry, MultiPolygon, Polygon } from "geojson";
import { VIETNAM_BOUNDS } from "../src/config/regions";
import type { GameImage } from "../src/types";
import {
  tilesCovering,
  toCandidate,
  toGameImage,
  dedupeByProximity,
  isInPolygon,
  type MapillaryFeature,
} from "./build-pool.helpers";

const HERE = dirname(fileURLToPath(import.meta.url));
// Actual country border (a bbox over Vietnam also covers Cambodia/Laos/Thailand).
const VIETNAM = JSON.parse(
  readFileSync(join(HERE, "vietnam.border.json"), "utf8")
) as Feature<Polygon | MultiPolygon>;

// Mapillary's Graph `/images?bbox=` search 500s ("reduce the amount of data")
// for any cell that actually contains images, regardless of `limit`. Instead we
// discover candidates from vector tiles (the documented bulk-discovery path) and
// resolve each one's exact location with a cheap single-id Graph lookup.
const TOKEN = process.env.VITE_MAPILLARY_TOKEN;
const TARGET = 50; // desired pool size
const DISCOVERY_ZOOM = 6; // a few tiles cover all of Vietnam at z6
const REFINE_BUDGET = TARGET * 5; // cap on per-id Graph lookups
const MIN_SEPARATION_KM = 5;

const tileUrl = (z: number, x: number, y: number) =>
  `https://tiles.mapillary.com/maps/vtp/mly1_public/2/${z}/${x}/${y}?access_token=${TOKEN}`;

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function firstCoord(geom: Geometry): [number, number] | undefined {
  let c: number[] | undefined;
  if (geom.type === "MultiLineString") c = geom.coordinates[0]?.[0];
  else if (geom.type === "LineString") c = geom.coordinates[0];
  else if (geom.type === "Point") c = geom.coordinates;
  return c ? [c[0], c[1]] : undefined;
}

async function discoverTile(x: number, y: number): Promise<GameImage[]> {
  const res = await fetch(tileUrl(DISCOVERY_ZOOM, x, y));
  if (!res.ok) {
    console.warn(`  tile ${x}/${y} -> HTTP ${res.status}`);
    return [];
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  const tile = new VectorTile(new PbfReader(buf));
  const layer = tile.layers.sequence ?? tile.layers.image;
  if (!layer) return [];

  const out: GameImage[] = [];
  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    const coord = firstCoord(feature.toGeoJSON(x, y, DISCOVERY_ZOOM).geometry);
    const candidate = toCandidate(feature.properties, coord);
    if (candidate && isInPolygon(candidate.lng, candidate.lat, VIETNAM)) {
      out.push(candidate);
    }
  }
  return out;
}

async function refine(id: string): Promise<GameImage | null> {
  const url = new URL(`https://graph.mapillary.com/${id}`);
  url.searchParams.set("access_token", TOKEN!);
  url.searchParams.set("fields", "id,computed_geometry,geometry,camera_type");
  const res = await fetch(url);
  if (!res.ok) return null;
  const feature = (await res.json()) as MapillaryFeature;
  const img = toGameImage(feature);
  return img && isInPolygon(img.lng, img.lat, VIETNAM) ? img : null;
}

async function main() {
  if (!TOKEN) {
    console.error("Missing VITE_MAPILLARY_TOKEN in .env");
    process.exit(1);
  }

  const tiles = tilesCovering(VIETNAM_BOUNDS, DISCOVERY_ZOOM);
  console.log(`Discovering candidates across ${tiles.length} tiles (z${DISCOVERY_ZOOM})...`);
  const candidates: GameImage[] = [];
  for (const { x, y } of tiles) {
    const found = await discoverTile(x, y);
    console.log(`  tile ${x}/${y} -> ${found.length} candidates`);
    candidates.push(...found);
  }

  // Spread candidates geographically (approx tile coords), then cap the budget
  // so we only pay for a bounded number of Graph lookups.
  const spread = dedupeByProximity(shuffle(candidates), MIN_SEPARATION_KM).slice(
    0,
    REFINE_BUDGET
  );
  console.log(`\nRefining ${spread.length} candidates via Graph API...`);
  const collected: GameImage[] = [];
  for (const candidate of spread) {
    if (collected.length >= TARGET * 2) break;
    const img = await refine(candidate.id);
    if (img) collected.push(img);
  }

  // Prefer panoramas first, then fill with flat photos.
  const ordered = [
    ...collected.filter((i) => i.isPano),
    ...collected.filter((i) => !i.isPano),
  ];
  const pool = dedupeByProximity(ordered, MIN_SEPARATION_KM).slice(0, TARGET);

  const out = join(HERE, "../src/data/pool.national.json");
  writeFileSync(out, JSON.stringify(pool, null, 2) + "\n");
  console.log(
    `\nWrote ${pool.length} images (${pool.filter((i) => i.isPano).length} pano) to ${out}`
  );
}

main();
