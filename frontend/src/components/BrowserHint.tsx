"use client";

function getBrowserName() {
  if (typeof navigator === "undefined") return "your browser";
  const ua = navigator.userAgent;
  if (ua.includes("Firefox") && !ua.includes("Seamonkey")) return "Firefox";
  if (ua.includes("Chrome") && !ua.includes("Chromium") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  return "your browser";
}

export function BrowserHint() {
  const browser = getBrowserName();
  return (
    <div className="mt-3 rounded-lg border border-blue-800 bg-blue-900/20 px-3 py-2 text-xs text-blue-200">
      <p className="font-medium">Freighter wallet not detected</p>
      <p className="mt-1 text-blue-300/80">
        Install the Freighter extension for {browser}, then refresh the page.
      </p>
      {browser === "Firefox" && (
        <p className="mt-1 text-blue-300/80">
          Firefox connectivity can be intermittent — Chrome or Edge may be more reliable.
        </p>
      )}
      <a
        href="https://www.freighter.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-blue-400 underline hover:text-blue-300"
      >
        Get Freighter →
      </a>
    </div>
  );
}
