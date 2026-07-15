export interface DebugEntry {
  id: string;
  timestamp: number;
  action: string;
  message: string;
  status: "error" | "success";
}

const STORAGE_KEY = "constella_tx_debug_log";
const MAX_ENTRIES = 50;

export function addDebugEntry(entry: Omit<DebugEntry, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  try {
    const prev = getDebugLog();
    const next: DebugEntry[] = [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: Date.now(), ...entry },
      ...prev,
    ].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export function getDebugLog(): DebugEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as DebugEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearDebugLog(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
