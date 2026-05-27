import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

type Props = {
  children: ReactNode;
};

// Guard dla prywatnych ścieżek (np. /moje-nastawy, /nastawy/nowy).
// - dopóki nie znamy odpowiedzi z /api/auth/me — pokazujemy lekkie placeholder,
//   bo przekierowanie zalogowanego usera na /logowanie tylko po to, żeby zaraz
//   wrócił, jest gorsze UX niż chwilowy spinner;
// - gdy guest → redirect na /logowanie i zapamiętujemy w `state.from`, gdzie
//   chciał trafić (Login może użyć tego później do powrotu, ale na razie i tak
//   wszyscy lądują na /moje-nastawy).
export function RequireAuth({ children }: Props) {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="bg-[var(--color-cream)] py-24 text-center text-sm text-stone-500">
        Sprawdzam sesję…
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/logowanie"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}
