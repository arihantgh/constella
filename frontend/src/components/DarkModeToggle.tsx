"use client";

import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("constella-theme") : null;
    const prefersDark =
      stored === null
        ? typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        : stored !== "light";
    setDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("constella-theme", next ? "dark" : "light");
    } catch {
      // ignore
    }
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
