import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildRecipesUrl,
  createBatch,
  fetchBatch,
  fetchCurrentUser,
  getApiBaseUrl,
  listMyBatches,
  login,
  logout,
  register,
  activate,
  requestPasswordReset,
  confirmPasswordReset,
  updateBatch,
  BatchAuthError,
  ApiValidationError,
  ApiNetworkError,
} from "./api";

const BASE = "http://api.example.com";

describe("getApiBaseUrl", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("na gasior.online używa origin strony (proxy), nie api.gasior.online", () => {
    Object.defineProperty(window, "location", {
      value: new URL("https://gasior.online/aktywacja?token=x"),
      writable: true,
      configurable: true,
    });
    expect(getApiBaseUrl()).toBe("https://gasior.online");
  });
});

describe("buildRecipesUrl", () => {
  it("returns the base /recipes path when no query is provided", () => {
    expect(buildRecipesUrl(BASE, {})).toBe(`${BASE}/api/recipes`);
  });

  it("encodes a fruit filter into the query string", () => {
    expect(buildRecipesUrl(BASE, { fruit: "wiśnia" })).toBe(
      `${BASE}/api/recipes?fruit=wi%C5%9Bnia`,
    );
  });

  it("includes category, abv range and text search together", () => {
    const url = buildRecipesUrl(BASE, {
      category: "wino",
      minAbv: 10,
      maxAbv: 14,
      q: "aronia",
      sort: "abv-asc",
    });
    expect(url).toContain("category=wino");
    expect(url).toContain("minAbv=10");
    expect(url).toContain("maxAbv=14");
    expect(url).toContain("q=aronia");
    expect(url).toContain("sort=abv-asc");
  });

  it("omits empty / undefined params instead of writing empty values", () => {
    const url = buildRecipesUrl(BASE, {
      fruit: "",
      category: undefined,
      q: "  ",
    });
    expect(url).toBe(`${BASE}/api/recipes`);
  });
});

// Wszystkie fetche w aplikacji muszą iść z `credentials: 'include'`, bo backend
// trzyma sesję w HttpOnly cookie i bez tego CORS by je odciął. Sprawdzamy to na
// wielu reprezentatywnych funkcjach, żeby zapomnienie tego w nowej funkcji
// wyłapał test, a nie produkcja.
describe("API client wysyła cookies (credentials: include)", () => {
  afterEach(() => vi.unstubAllGlobals());

  function captureFetch(response: Partial<Response>) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      ...response,
    } as Response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("fetchCurrentUser dokleja credentials", async () => {
    const fetchMock = captureFetch({
      json: async () => ({ user: null }),
    });
    await fetchCurrentUser();
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).credentials).toBe("include");
  });

  it("login dokleja credentials i parsuje user z odpowiedzi", async () => {
    const fetchMock = captureFetch({
      json: async () => ({
        user: {
          id: "u1",
          email: "ala@example.com",
          displayName: null,
          status: "active",
          createdAt: "2026-05-25T18:00:00.000Z",
        },
      }),
    });
    const user = await login({ email: "ala@example.com", password: "hasloX" });
    expect(user.id).toBe("u1");
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).credentials).toBe("include");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("createBatch dokleja credentials", async () => {
    const fetchMock = captureFetch({
      status: 201,
      json: async () => ({ batch: {} }),
    });
    await createBatch({ name: "Wino", startDate: "2026-05-20" });
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).credentials).toBe("include");
  });
});

describe("auth API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("register POST i bez body w sukcesie (204)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await register({ email: "ala@example.com", displayName: "Ala" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/auth/register");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("register rzuca ApiValidationError dla 400 z komunikatem z backendu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Niepoprawny e-mail" }),
      } as Response),
    );
    await expect(register({ email: "x" })).rejects.toBeInstanceOf(
      ApiValidationError,
    );
  });

  it("activate rzuca ApiNetworkError gdy fetch pada (CORS / sieć)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")),
    );
    await expect(
      activate({ token: "abc", password: "haslohaslo12" }),
    ).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it("activate zwraca user przy 200", async () => {
    const user = {
      id: "u1",
      email: "ala@example.com",
      displayName: "Ala",
      status: "active" as const,
      createdAt: "2026-05-25T18:00:00.000Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user }),
      } as Response),
    );
    const got = await activate({ token: "abc", password: "haslohaslo" });
    expect(got).toEqual(user);
  });

  it("login rzuca ApiValidationError dla 401 (zły email/hasło)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Niepoprawny e-mail lub hasło" }),
      } as Response),
    );
    await expect(
      login({ email: "ala@example.com", password: "zle" }),
    ).rejects.toBeInstanceOf(ApiValidationError);
  });

  it("logout zawsze POST /api/auth/logout", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await logout();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/auth/logout");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("requestPasswordReset i confirmPasswordReset trafiają w odpowiednie ścieżki", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await requestPasswordReset({ email: "ala@example.com" });
    await confirmPasswordReset({ token: "tok", password: "noweHaslo123" });

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/auth/password-reset/request",
    );
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/api/auth/password-reset/confirm",
    );
  });

  it("fetchCurrentUser zwraca null przy braku sesji", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: null }),
      } as Response),
    );
    expect(await fetchCurrentUser()).toBeNull();
  });
});

describe("batches API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("createBatch wysyła POST i zwraca samego batcha (bez editCode)", async () => {
    const json = {
      batch: {
        id: "b1",
        viewSlug: "slug1234567890",
        userId: "u1",
        name: "Wino",
        stage: "fermentacja-burzliwa" as const,
        startDate: "2026-05-20",
        recipeId: null,
        instructionSteps: [],
        checkedStepIndices: [],
        isDemo: false,
        createdAt: "2026-05-25T18:00:00.000Z",
      },
    };
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => json,
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await createBatch({
      name: "Wino",
      startDate: "2026-05-20",
    });

    expect(result).toEqual(json);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/batches");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("createBatch rzuca BatchAuthError dla 401 (brak sesji)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response),
    );
    await expect(
      createBatch({ name: "Wino", startDate: "2026-05-20" }),
    ).rejects.toBeInstanceOf(BatchAuthError);
  });

  it("fetchBatch zwraca BatchPublic", async () => {
    const batch = {
      id: "b1",
      viewSlug: "slug1234567890",
      userId: "u1",
      name: "Wino",
      stage: "dojrzewanie" as const,
      startDate: "2026-05-20",
      recipeId: null,
      instructionSteps: [],
      checkedStepIndices: [],
      isDemo: false,
      createdAt: "2026-05-25T18:00:00.000Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => batch,
      } as Response),
    );

    expect(await fetchBatch("slug1234567890")).toEqual(batch);
  });

  it("listMyBatches woła GET /api/batches?mine=true i zwraca tablicę", async () => {
    const batches = [
      {
        id: "b1",
        viewSlug: "slug1",
        userId: "u1",
        name: "Wino",
        stage: "fermentacja-burzliwa" as const,
        startDate: "2026-05-20",
        recipeId: null,
        instructionSteps: [],
        checkedStepIndices: [],
        isDemo: false,
        createdAt: "2026-05-25T18:00:00.000Z",
      },
    ];
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ batches }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await listMyBatches();

    expect(result).toEqual(batches);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/batches?mine=true");
  });

  it("listMyBatches rzuca BatchAuthError dla 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response),
    );
    await expect(listMyBatches()).rejects.toBeInstanceOf(BatchAuthError);
  });

  it("updateBatch wysyła PATCH bez nagłówka X-Edit-Code (autoryzacja po sesji)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await updateBatch("slug1234567890", { stage: "dojrzewanie" });

    const [, init] = fetchMock.mock.calls[0];
    const headers = ((init as RequestInit).headers ?? {}) as Record<
      string,
      string
    >;
    expect((init as RequestInit).method).toBe("PATCH");
    expect(headers["X-Edit-Code"]).toBeUndefined();
    expect((init as RequestInit).credentials).toBe("include");
  });

  it("updateBatch rzuca BatchAuthError dla 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response),
    );
    await expect(updateBatch("slug", {})).rejects.toBeInstanceOf(
      BatchAuthError,
    );
  });

  it("updateBatch rzuca BatchAuthError dla 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      } as Response),
    );
    await expect(
      updateBatch("slug", { stage: "dojrzewanie" }),
    ).rejects.toBeInstanceOf(BatchAuthError);
  });
});
