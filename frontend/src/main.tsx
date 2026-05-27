import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { App } from "./App";
import { Landing } from "./pages/Landing";
import { RecipeList } from "./pages/RecipeList";
import { RecipeDetail } from "./pages/RecipeDetail";
import { NewRecipe } from "./pages/NewRecipe";
import { NewBatch } from "./pages/NewBatch";
import { BatchView } from "./pages/BatchView";
import { MyBatches } from "./pages/MyBatches";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Activate } from "./pages/Activate";
import { PasswordResetRequest } from "./pages/PasswordResetRequest";
import { PasswordResetConfirm } from "./pages/PasswordResetConfirm";
import { RequireAuth } from "./components/RequireAuth";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route path="/" element={<Landing />} />
            <Route path="receptury" element={<RecipeList />} />
            <Route path="receptury/:id" element={<RecipeDetail />} />
            <Route
              path="receptury/nowa"
              element={
                <RequireAuth>
                  <NewRecipe />
                </RequireAuth>
              }
            />

            {/* Auth — dostępne dla guest. */}
            <Route path="logowanie" element={<Login />} />
            <Route path="rejestracja" element={<Register />} />
            {/* Token preferujemy z query (?token=...), ale dla wstecznej
                kompatybilności (i wygody przy ręcznym klejeniu linków)
                akceptujemy też formę path-style. */}
            <Route path="aktywacja" element={<Activate />} />
            <Route path="aktywacja/:token" element={<Activate />} />
            <Route path="zapomniane-haslo" element={<PasswordResetRequest />} />
            <Route path="reset-hasla" element={<PasswordResetConfirm />} />
            <Route path="reset-hasla/:token" element={<PasswordResetConfirm />} />

            {/* Strony wymagające zalogowania. */}
            <Route
              path="nastawy/nowy"
              element={
                <RequireAuth>
                  <NewBatch />
                </RequireAuth>
              }
            />
            <Route
              path="moje-nastawy"
              element={
                <RequireAuth>
                  <MyBatches />
                </RequireAuth>
              }
            />

            <Route path="nastaw/:viewSlug" element={<BatchView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
