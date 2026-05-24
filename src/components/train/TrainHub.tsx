import OpeningTrainer from "./OpeningTrainer";
import WeaknessPuzzleTrainer from "./WeaknessPuzzleTrainer";

export default function TrainHub() {
  return (
    <div className="mt-12 space-y-4">
      <WeaknessPuzzleTrainer />
      <div id="train-openings" className="scroll-mt-28 border-t border-[rgba(255,255,255,0.06)] pt-14">
        <OpeningTrainer />
      </div>
    </div>
  );
}
