import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Coord, Phase } from "../types";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const LINE_SOURCE = "guess-line";

interface GuessMapProps {
  phase: Phase;
  guess: Coord | null;
  truth: Coord | null;
  onPick: (c: Coord) => void;
}

export function GuessMap({ phase, guess, truth, onPick }: GuessMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const guessMarker = useRef<maplibregl.Marker | null>(null);
  const truthMarker = useRef<maplibregl.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [106, 16],
      zoom: 4.2,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("click", (e) => {
      onPickRef.current({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });
    map.on("load", () => {
      map.addSource(LINE_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: LINE_SOURCE,
        type: "line",
        source: LINE_SOURCE,
        paint: { "line-color": "#ef4444", "line-width": 2, "line-dasharray": [2, 2] },
      });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Reflect the guess marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (guess) {
      if (!guessMarker.current) {
        guessMarker.current = new maplibregl.Marker({ color: "#3b82f6" });
      }
      guessMarker.current.setLngLat([guess.lng, guess.lat]).addTo(map);
    } else {
      guessMarker.current?.remove();
      guessMarker.current = null;
    }
  }, [guess]);

  // On reveal: show truth marker, draw the line, fit bounds.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setLine = (coords: [number, number][]) => {
      const src = map.getSource(LINE_SOURCE) as maplibregl.GeoJSONSource | undefined;
      src?.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: {},
      });
    };

    if (phase === "revealed" && truth && guess) {
      if (!truthMarker.current) {
        truthMarker.current = new maplibregl.Marker({ color: "#22c55e" });
      }
      truthMarker.current.setLngLat([truth.lng, truth.lat]).addTo(map);
      setLine([
        [guess.lng, guess.lat],
        [truth.lng, truth.lat],
      ]);
      const bounds = new maplibregl.LngLatBounds(
        [guess.lng, guess.lat],
        [guess.lng, guess.lat]
      ).extend([truth.lng, truth.lat]);
      map.fitBounds(bounds, { padding: 60, maxZoom: 8, duration: 600 });
    } else {
      truthMarker.current?.remove();
      truthMarker.current = null;
      // FIX 3: reset to a valid empty FeatureCollection (not an invalid empty LineString)
      const src = map.getSource(LINE_SOURCE) as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: "FeatureCollection", features: [] });
    }
  }, [phase, truth, guess]);

  return <div ref={containerRef} className="h-full w-full" />;
}
