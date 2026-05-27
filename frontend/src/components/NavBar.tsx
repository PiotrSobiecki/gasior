import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser, useLogoutMutation } from "../hooks/useCurrentUser";
import { NotificationBell } from "./NotificationBell";
import { userDisplayName, userInitial } from "../lib/userDisplay";

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition hover:text-[var(--color-bordo)] ${
    isActive ? "text-[var(--color-bordo)]" : "text-stone-500"
  }`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-4 py-3 text-base font-medium transition ${
    isActive
      ? "bg-[var(--color-bordo)]/10 text-[var(--color-bordo)]"
      : "text-stone-700 hover:bg-stone-100"
  }`;

export function NavBar() {
  const { data: user } = useCurrentUser();
  const logout = useLogoutMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  async function handleLogout() {
    await logout.mutateAsync();
    setIsMenuOpen(false);
    navigate("/", { replace: true });
  }

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-[var(--color-cream)]/95 px-4 py-2.5 shadow-sm shadow-stone-900/5 backdrop-blur sm:px-5 sm:py-3">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5 font-[var(--font-display)] text-xl font-bold text-[var(--color-bordo)]"
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
            <span className="truncate">Gąsior</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 md:hidden">
            {user && <NotificationBell />}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 text-stone-700 transition hover:bg-stone-100"
              aria-label="Otwórz menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav"
            >
              <span aria-hidden className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
              </span>
            </button>
          </div>

          <nav className="hidden items-center gap-5 md:flex lg:gap-6">
            <NavLink to="/" end className={desktopLinkClass}>
              Kreator
            </NavLink>
            <NavLink to="/receptury" className={desktopLinkClass}>
              Receptury
            </NavLink>

            {user ? (
              <>
                <NavLink to="/moje-nastawy" className={desktopLinkClass}>
                  Moje nastawy
                </NavLink>
                <NotificationBell />
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
                <NavLink to="/logowanie" className={desktopLinkClass}>
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

      {/* Panel mobilny — wysuwany z prawej, wysokość dopasowana do treści */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${
          isMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isMenuOpen}
      >
        <button
          type="button"
          tabIndex={isMenuOpen ? 0 : -1}
          onClick={closeMenu}
          className={`absolute inset-0 bg-stone-900/45 transition-opacity duration-300 ${
            isMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Zamknij menu"
        />

        <nav
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Menu nawigacji"
          className={`fixed right-4 top-[4.25rem] z-50 flex w-[min(88vw,17rem)] max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[var(--color-cream)] shadow-xl transition-transform duration-300 ease-out ${
            isMenuOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"
          }`}
        >
          <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2.5">
            <span className="text-sm font-semibold text-stone-600">Menu</span>
            <button
              type="button"
              onClick={closeMenu}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 transition hover:bg-stone-100"
              aria-label="Zamknij menu"
            >
              <span aria-hidden className="text-lg leading-none">✕</span>
            </button>
          </div>

          <div className="flex flex-col gap-0.5 overflow-y-auto p-2">
            <NavLink to="/" end className={mobileLinkClass} onClick={closeMenu}>
              Kreator
            </NavLink>
            <NavLink
              to="/receptury"
              className={mobileLinkClass}
              onClick={closeMenu}
            >
              Receptury
            </NavLink>

            {user ? (
              <>
                <NavLink
                  to="/moje-nastawy"
                  className={mobileLinkClass}
                  onClick={closeMenu}
                >
                  Moje nastawy
                </NavLink>
                <div className="mt-1 space-y-2 border-t border-stone-200 p-1 pt-2">
                  <Link
                    to="/moje-nastawy"
                    onClick={closeMenu}
                    className="inline-flex w-full items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700"
                    aria-label={`Zalogowany jako ${userDisplayName(user)}`}
                    title={user.email}
                  >
                    <span
                      aria-hidden
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bordo)] text-xs font-bold text-[var(--color-cream)]"
                    >
                      {userInitial(user)}
                    </span>
                    <span className="min-w-0 truncate">
                      {userDisplayName(user)}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={logout.isPending}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                  >
                    Wyloguj
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-1 space-y-1 border-t border-stone-200 p-1 pt-2">
                <NavLink
                  to="/logowanie"
                  className={mobileLinkClass}
                  onClick={closeMenu}
                >
                  Zaloguj
                </NavLink>
                <NavLink
                  to="/rejestracja"
                  onClick={closeMenu}
                  className="block rounded-xl bg-[var(--color-bordo)] px-4 py-2.5 text-center text-base font-medium text-[var(--color-cream)] transition hover:opacity-90"
                >
                  Załóż konto
                </NavLink>
              </div>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
