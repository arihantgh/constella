import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWallet } from "@/hooks/useWallet";

function createMockFreighter() {
  return {
    isConnected: vi.fn().mockResolvedValue({ isConnected: true }),
    getPublicKey: vi.fn().mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"),
    getNetwork: vi.fn().mockResolvedValue("TESTNET"),
    signTransaction: vi.fn().mockResolvedValue("signed-xdr"),
  };
}

describe("useWallet", () => {
  beforeEach(() => {
    window.freighter = createMockFreighter() as any;
  });

  it("starts in disconnected state", () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
  });

  it("connects and returns address + network", async () => {
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe("GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890");
    expect(result.current.network).toBe("TESTNET");
    expect(result.current.error).toBeNull();
  });

  it("rejects wrong network", async () => {
    window.freighter!.getNetwork = vi.fn().mockResolvedValue("PUBLIC");
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toContain("Wrong network");
  });

  it("disconnects and clears state", async () => {
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("handles missing Freighter extension", async () => {
    window.freighter = undefined as any;
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toContain("Freighter not detected");
    expect(result.current.isConnected).toBe(false);
  });
});
