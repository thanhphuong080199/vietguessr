import { useEffect, useRef } from "react";
import { Viewer } from "mapillary-js";
import "mapillary-js/dist/mapillary.css";

const TOKEN = import.meta.env.VITE_MAPILLARY_TOKEN;

interface PanoramaViewerProps {
  imageId: string;
  onError?: () => void;
}

export function PanoramaViewer({ imageId, onError }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  // Keep onError in a ref so the create-once effect always uses the latest callback.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  // The constructor already loads the initial imageId, so the first run of the
  // [imageId] effect must NOT call moveTo — doing so races the initial load and
  // spuriously rejects, flashing the "Ảnh lỗi" overlay before the image appears.
  const loadedIdRef = useRef(imageId);

  // Create the viewer once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    const viewer = new Viewer({
      accessToken: TOKEN,
      container: containerRef.current,
      imageId,
      component: { cover: false },
    });
    // FIX 2: surface viewer-level load failures.
    // mapillary-js emits "error" at runtime but the typed overloads don't include it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (viewer as any).on("error", () => onErrorRef.current?.());
    viewerRef.current = viewer;
    return () => {
      viewer.remove();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move to the new image whenever it changes (skip the initial id — the
  // constructor already loaded it).
  useEffect(() => {
    if (!viewerRef.current || !imageId) return;
    if (imageId === loadedIdRef.current) return;
    loadedIdRef.current = imageId;
    viewerRef.current.moveTo(imageId).catch((e) => {
      console.warn(e);
      // FIX 2: surface moveTo failures to the parent
      onErrorRef.current?.();
    });
  }, [imageId]);

  if (!TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-800 p-6 text-center text-slate-200">
        Mapillary token missing — add <code className="mx-1">VITE_MAPILLARY_TOKEN</code> to your <code className="mx-1">.env</code> file.
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
