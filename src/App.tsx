import { useMemo } from "react";
import { useGameStore } from "./store/gameStore";
import { PanoramaViewer } from "./components/PanoramaViewer";
import { GuessMap } from "./components/GuessMap";
import { RoundHud } from "./components/RoundHud";
import { ResultView } from "./components/ResultView";

export default function App() {
  const current = useGameStore((s) => s.current);
  const guess = useGameStore((s) => s.guess);
  const phase = useGameStore((s) => s.phase);
  const result = useGameStore((s) => s.result);
  const setGuess = useGameStore((s) => s.setGuess);
  const submitGuess = useGameStore((s) => s.submitGuess);
  const playAgain = useGameStore((s) => s.playAgain);
  // FIX 2: image error recovery
  const imageError = useGameStore((s) => s.imageError);
  const reportImageError = useGameStore((s) => s.reportImageError);
  const newRound = useGameStore((s) => s.newRound);

  // FIX 4: memoize truth so GuessMap's reveal effect only re-runs on actual image change,
  // not on every parent render. Must be before any early return (React hooks rule).
  const truth = useMemo(
    () => (current ? { lng: current.lng, lat: current.lat } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current?.id, current?.lng, current?.lat]
  );

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 text-slate-100">
        <p className="max-w-md p-6 text-center">
          Chưa có ảnh nào trong kho. Chạy <code>npm run build-pool</code> để tạo dữ liệu.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-900 md:flex-row">
      <div className="relative h-1/2 w-full md:h-full md:w-2/3">
        <PanoramaViewer imageId={current.id} onError={reportImageError} />
        {/* FIX 2: error overlay — lets user request a fresh image */}
        {imageError && (
          <button
            onClick={newRound}
            className="absolute inset-0 m-auto h-fit w-fit bg-red-600 text-white rounded px-4 py-2"
          >
            Ảnh lỗi — tải ảnh khác
          </button>
        )}
        <div className="absolute left-3 top-3 rounded bg-black/60 px-3 py-1 text-sm font-bold text-white">
          VietGuessr
        </div>
      </div>
      <div className="flex h-1/2 w-full flex-col md:h-full md:w-1/3">
        <div className="relative flex-1">
          <GuessMap phase={phase} guess={guess} truth={truth} onPick={setGuess} />
        </div>
        <div className="p-3">
          {phase === "revealed" && result ? (
            <ResultView result={result} onPlayAgain={playAgain} />
          ) : (
            <RoundHud canGuess={guess !== null} onGuess={submitGuess} />
          )}
        </div>
      </div>
    </div>
  );
}
