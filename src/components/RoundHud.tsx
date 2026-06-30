import { MapPin } from "lucide-react";

interface RoundHudProps {
  canGuess: boolean;
  onGuess: () => void;
}

export function RoundHud({ canGuess, onGuess }: RoundHudProps) {
  return (
    <button
      type="button"
      disabled={!canGuess}
      onClick={onGuess}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-slate-500"
    >
      <MapPin size={18} />
      {canGuess ? "Đoán!" : "Ghim vị trí trên bản đồ"}
    </button>
  );
}
