"use client";

export function FeedbackPrompt() {
  return (
    <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/30 p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-200">Help us improve</h3>
      <p className="text-xs text-gray-400">
        If you rated the product but skipped the details, tell us what would make constella even better.
      </p>
      <a
        href="https://docs.google.com/forms/d/e/1FAIpQLSdlWq1o723XapPdiOq9h1viVGqY-x-c7yRv9ntwJrZpYq7sEg/viewform"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs font-medium text-blue-400 hover:text-blue-300"
      >
        Share more feedback →
      </a>
    </div>
  );
}
