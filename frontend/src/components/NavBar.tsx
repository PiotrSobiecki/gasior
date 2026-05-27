import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCurrentUser, useLogoutMutation } from "../hooks/useCurrentUser";
import { NotificationBell } from "./NotificationBell";
import { userDisplayName, userInitial } from "../lib/userDisplay";

export function NavBar() {
  const { data: user } = useCurrentUser();
  const logout = useLogoutMutation();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition hover:text-[var(--color-bordo)] ${
      isActive ? "text-[var(--color-bordo)]" : "text-stone-500"
    }`;

  async function handleLogout() {
    await logout.mutateAsync();
    navigate("/", { replace: true });
  }

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-[var(--color-cream)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-[var(--font-display)] text-xl font-bold text-[var(--color-bordo)]"
          aria-label="Gąsior — strona główna"
        >
          <img
            src="/icon.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
            aria-hidden
          />
          <span>Gąsior</span>
        </Link>
        <nav className="flex items-center gap-6">
          <NavLink to="/" end className={linkClass}>
            Kreator
          </NavLink>
          <NavLink to="/receptury" className={linkClass}>
            Receptury
          </NavLink>

          {user ? (
            <>
              <NavLink to="/moje-nastawy" className={linkClass}>
                Moje nastawy
              </NavLink>
              <NotificationBell />
              {/* Kapsułka z awatarem-inicjałem i nazwą usera. Klikalna →
                  prowadzi do /moje-nastawy (na razie nie mamy strony profilu;
                  gdy się pojawi, wystarczy zmienić `to`). */}
              <Link
                to="/moje-nastawy"
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white py-1 pl-1 pr-3 text-sm font-medium text-stone-700 transition hover:border-[var(--color-bordo)]/40 hover:bg-stone-50"
                aria-label={`Zalogowany jako ${userDisplayName(user)}`}
                title={user.email}
              >
                <span
                  aria-hidden
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bordo)] text-xs font-bold text-[var(--color-cream)]"
                >
                  {userInitial(user)}
                </span>
                <span className="max-w-[10ch] truncate">
                  {userDisplayName(user)}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logout.isPending}
                className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                aria-label="Wyloguj"
              >
                Wyloguj
              </button>
            </>
          ) : (
            <>
              <NavLink to="/logowanie" className={linkClass}>
                Zaloguj
              </NavLink>
              <NavLink
                to="/rejestracja"
                className="rounded-full bg-[var(--color-bordo)] px-4 py-1.5 text-sm font-medium text-[var(--color-cream)] transition hover:opacity-90"
              >
                Załóż konto
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
