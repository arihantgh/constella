import { FEEDBACK_STATS } from "@/lib/feedback-stats";

function Star({ filled }: { filled: boolean }) {
  return (
    <span className={`text-sm ${filled ? "text-yellow-400" : "text-gray-600"}`}>
      ★
    </span>
  );
}

export function SatisfactionWidget() {
  const fullStars = Math.round(FEEDBACK_STATS.average);
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-200">User Satisfaction</h3>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-white">
          {FEEDBACK_STATS.average.toFixed(1)}
        </span>
        <span className="mb-1 text-xs text-gray-400">/ 5 from {FEEDBACK_STATS.count} responses</span>
      </div>
      <div className="mt-1 flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} filled={i < fullStars} />
        ))}
      </div>
    </div>
  );
}
