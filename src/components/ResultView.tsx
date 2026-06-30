import { RotateCcw } from "lucide-react";
import type { RoundResult } from "../types";

interface ResultViewProps {
  result: RoundResult;
  onPlayAgain: () => void;
}

export function ResultView({ result, onPlayAgain }: ResultViewProps) {
  return (
    <div className="space-y-3 rounded-lg bg-slate-800 p-4 text-slate-100">
      <div className="text-center">
        <div className="text-3xl font-bold text-emerald-400">
          {result.score.toLocaleString("vi-VN")} điểm
        </div>
        <div className="text-sm text-slate-300">
          Cách vị trí thật {result.distanceKm.toFixed(1)} km
        </div>
      </div>
      <button
        type="button"
        onClick={onPlayAgain}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow"
      >
        <RotateCcw size={18} />
        Chơi lại
      </button>
    </div>
  );
}
