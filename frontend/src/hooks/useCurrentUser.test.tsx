import { describe, it, expect, vi, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  CURRENT_USER_QUERY_KEY,
  useCurrentUser,
  useLogoutMutation,
} from "./useCurrentUser";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const ALICE = {
  id: "u1",
  email: "ala@example.com",
  displayName: "Ala",
  status: "active" as const,
  createdAt: "2026-05-25T18:00:00.000Z",
};

describe("useCurrentUser", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("zwraca user-a z /api/auth/me", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ user: ALICE }),
      } as Response),
    );

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(ALICE);
  });

  it("zwraca null gdy backend powie user: null (guest)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ user: null }),
      } as Response),
    );

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe("useLogoutMutation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("po wylogowaniu zeruje cache currentUser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => ({}),
      } as Response),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    client.setQueryData(CURRENT_USER_QUERY_KEY, ALICE);

    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLogoutMutation(), {
      wrapper: localWrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(client.getQueryData(CURRENT_USER_QUERY_KEY)).toBeNull();
  });
});
