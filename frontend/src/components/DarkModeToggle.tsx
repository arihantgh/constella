"use client";

import { useEffect, useState } from "react";

function getInitialDark() {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("constella-theme");
  if (stored) return stored !== "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function DarkModeToggle() {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("constella-theme", dark ? "dark" : "light");
    } catch {
      // ignore
    }
  }, [dark]);

  const toggle = () => {
    setDark((prev) => !prev);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 transition hover:bg-gray-700"
    >
      {dark ? "🌙" : "☀️"}
    </button>
  );
}
