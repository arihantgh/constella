import type { ContractConfig } from "./types";
import { DEFAULT_CONTRACTS } from "./constants";

export function getConfig(): ContractConfig {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("contracts");
      if (stored) return JSON.parse(stored) as ContractConfig;
    } catch {
      // fall through
    }
  }
  return DEFAULT_CONTRACTS;
}

export function setConfig(config: ContractConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("contracts", JSON.stringify(config));
  }
}
