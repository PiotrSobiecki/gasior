import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiValidationError, register } from "../lib/api";
import {
  AuthShell,
  errorBoxClass,
  infoBoxClass,
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
      const message =
        err instanceof ApiValidationError
          ? err.message
          : "Nie udało się zarejestrować";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        badge="📩 Sprawdź skrzynkę"
        title="Wysłaliśmy link aktywacyjny"
        subtitle="Otwórz wiadomość i kliknij link, by ustawić hasło."
        footer={
          <p>
            <Link to="/logowanie" className="text-[var(--color-bordo)] hover:underline">
              Wróć do logowania
            </Link>
          </p>
        }
      >
        <p className={infoBoxClass}>
          Na adres <strong>{email.trim()}</strong> wysłaliśmy link aktywacyjny.
          Wygasa po 24 godzinach. Jeśli go nie widzisz — zerknij do folderu
          „Spam".
        </p>
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
