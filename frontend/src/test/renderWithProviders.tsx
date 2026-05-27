import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

type Options = {
  path?: string;
  routePattern?: string;
};

// Otacza komponent QueryClientem (bez retry, bez cache między testami) oraz
// MemoryRouterem, żeby <Link>/<useParams> działały w izolacji testu.
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { path = "/", routePattern } = options;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        {routePattern ? (
          <Routes>
            <Route path={routePattern} element={ui} />
          </Routes>
        ) : (
          ui
        )}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
