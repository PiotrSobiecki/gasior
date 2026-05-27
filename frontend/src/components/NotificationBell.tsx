import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import type { Notification, NotificationUrgency } from "../lib/notifications";

// Bez Radixa: prosty dropdown na useState + click-outside przez ref.
// Działa też z klawiaturą (Esc zamyka, focus-trap pomijamy świadomie — to
// ledwie kilka linków, nie modal).

const URGENCY_DOT: Record<NotificationUrgency, string> = {
  overdue: "bg-red-500",
  today: "bg-amber-500",
  soon: "bg-emerald-500",
};

const URGENCY_LABEL: Record<NotificationUrgency, string> = {
  overdue: "Zaległe",
  today: "Dziś",
  soon: "Wkrótce",
};

function formatEta(notification: Notification): string {
  if (notification.overdue) return "zaległe";
  if (notification.etaDays === 0) return "dziś";
  if (notification.etaDays === 1) return "jutro";
  return `za ${notification.etaDays} dni`;
}

function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onOutside: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOutside();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [enabled, onOutside, ref]);
}

export function NotificationBell() {
  const { notifications, isLoading, isError } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapperRef, () => setOpen(false), open);

  const count = notifications.length;
  const hasUrgent = notifications.some(
    (n) => n.urgency === "overdue" || n.urgency === "today",
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          count > 0
            ? `Powiadomienia (${count})`
            : "Powiadomienia (brak nowych)"
        }
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-bordo)]/30"
      >
        <span aria-hidden className="text-base leading-none">
          🔔
        </span>
        {count > 0 && (
          <span
            className={`absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow ${
              hasUrgent ? "bg-red-500" : "bg-emerald-500"
            }`}
            aria-hidden
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-stone-200 bg-white p-2 shadow-xl"
        >
          <div className="px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Powiadomienia
            </p>
          </div>

          {isLoading && (
            <p className="px-3 py-4 text-sm text-stone-500">Sprawdzam…</p>
          )}

          {isError && (
            <p className="px-3 py-4 text-sm text-red-700">
              Nie udało się pobrać powiadomień.
            </p>
          )}

          {!isLoading && !isError && count === 0 && (
            <p className="px-3 py-4 text-sm text-stone-600">
              Wszystko cacy — żadna akcja Cię nie goni 🍷
            </p>
          )}

          {count > 0 && (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.batchId}>
                  <Link
                    to={`/nastaw/${n.viewSlug}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 transition hover:bg-stone-50"
                    role="menuitem"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[n.urgency]}`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-stone-800">
                          {n.batchName}
                        </p>
                        <p className="text-xs text-stone-600">
                          {n.actionLabel}
                        </p>
                        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-stone-500">
                          {URGENCY_LABEL[n.urgency]} · {formatEta(n)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
