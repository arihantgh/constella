import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWallet } from "@/hooks/useWallet";
import * as freighterApi from "@stellar/freighter-api";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

const mockAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

describe("useWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(freighterApi.isConnected).mockResolvedValue({
      isConnected: true,
    });
    vi.mocked(freighterApi.requestAccess).mockResolvedValue({
      address: mockAddress,
    });
    vi.mocked(freighterApi.getAddress).mockResolvedValue({
      address: mockAddress,
    });
    vi.mocked(freighterApi.getNetwork).mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });
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
    expect(result.current.address).toBe(mockAddress);
    expect(result.current.network).toBe("TESTNET");
    expect(result.current.error).toBeNull();
  });

  it("rejects wrong network", async () => {
    vi.mocked(freighterApi.getNetwork).mockResolvedValue({
      network: "PUBLIC",
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    });
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
    vi.mocked(freighterApi.isConnected).mockResolvedValue({
      isConnected: false,
    });
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toContain("Freighter not detected");
    expect(result.current.isConnected).toBe(false);
  });
});
