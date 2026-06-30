export type Coord = { lng: number; lat: number };

export type Phase = "guessing" | "revealed";

export interface GameImage {
  id: string;
  lng: number;
  lat: number;
  isPano: boolean;
}

export interface RoundResult {
  distanceKm: number;
  score: number;
}
