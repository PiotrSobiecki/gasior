import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiValidationError, requestPasswordReset } from "../lib/api";
import {
  AuthShell,
  errorBoxClass,
  infoBoxClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "../components/AuthShell";

export function PasswordResetRequest() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset({ email: email.trim() });
      setDone(true);
    } catch (err) {
      const message =
        err instanceof ApiValidationError
          ? err.message
          : "Nie udało się zainicjować resetu hasła";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        badge="📩 Sprawdź skrzynkę"
        title="Jeśli konto istnieje — wysłaliśmy link"
        footer={
          <p>
            <Link to="/logowanie" className="text-[var(--color-bordo)] hover:underline">
              Wróć do logowania
            </Link>
          </p>
        }
      >
        <p className={infoBoxClass}>
          Jeśli adres <strong>{email.trim()}</strong> jest u nas zarejestrowany,
          dostaniesz wiadomość z linkiem do ustawienia nowego hasła. Link wygasa
          po 1 godzinie.
        </p>
      </AuthShell>
    );
  }

  const isValid = email.trim().length > 0;

  return (
    <AuthShell
      badge="🔓 Reset hasła"
      title="Zapomniałeś hasła?"
      subtitle="Podaj e-mail konta — wyślemy link do ustawienia nowego."
      footer={
        <p>
          <Link to="/logowanie" className="text-[var(--color-bordo)] hover:underline">
            Wróć do logowania
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="reset-email" className={labelClass}>
            E-mail
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
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
          {submitting ? "Wysyłam…" : "Wyślij link resetu"}
        </button>
      </form>
    </AuthShell>
  );
}
