import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { formatApiError, register } from "../lib/api";
import {
  AuthShell,
  AuthSuccessPanel,
  errorBoxClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "../components/AuthShell";

export function Register() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        displayName: displayName.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(formatApiError(err, "Nie udało się zarejestrować"));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const sentTo = email.trim();
    return (
      <AuthShell
        variant="success"
        badge="📩 Sprawdź skrzynkę"
        title="Wysłaliśmy link aktywacyjny"
        subtitle="Otwórz wiadomość i kliknij link, by ustawić hasło."
        footer={
          <Link to="/logowanie" className={primaryButtonClass}>
            Wróć do logowania
          </Link>
        }
      >
        <AuthSuccessPanel
          icon="📩"
          email={sentTo}
          tips={[
            "W skrzynce szukaj wiadomości od Gąsior — w temacie będzie link aktywacyjny.",
            "Link jest ważny 24 godziny. Po kliknięciu ustawisz hasło i od razu się zalogujesz.",
            "Nie widzisz maila? Sprawdź folder Spam lub Oferty — czasem ląduje tam przy pierwszej wiadomości.",
          ]}
        />
      </AuthShell>
    );
  }

  const isValid = email.trim().length > 0;

  return (
    <AuthShell
      badge="🍇 Załóż konto"
      title="Rejestracja"
      subtitle="Konto pozwoli Ci trzymać nastawy w jednym miejscu i wracać do nich z każdego urządzenia."
      footer={
        <p>
          Masz już konto?{" "}
          <Link to="/logowanie" className="font-medium text-[var(--color-bordo)] hover:underline">
            Zaloguj się
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="reg-email" className={labelClass}>
            E-mail
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="reg-display" className={labelClass}>
            Nazwa (opcjonalnie)
          </label>
          <input
            id="reg-display"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={120}
            placeholder="Jak Cię nazywać?"
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className={errorBoxClass}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!isValid || submitting}
          className={primaryButtonClass}
        >
          {submitting ? "Wysyłam…" : "Załóż konto"}
        </button>

        <p className="text-xs text-stone-500">
          Hasło ustawisz po kliknięciu linku w wiadomości, którą do Ciebie
          wyślemy.
        </p>
      </form>
    </AuthShell>
  );
}
