import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { formatApiError, requestPasswordReset } from "../lib/api";
import {
  AuthShell,
  AuthSuccessPanel,
  errorBoxClass,
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
      setError(formatApiError(err, "Nie udało się zainicjować resetu hasła"));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        variant="success"
        badge="📩 Sprawdź skrzynkę"
        title="Jeśli konto istnieje — wysłaliśmy link"
        subtitle="Gdy ten e-mail jest u nas w bazie, dostaniesz wiadomość z resetem hasła."
        footer={
          <Link to="/logowanie" className={primaryButtonClass}>
            Wróć do logowania
          </Link>
        }
      >
        <AuthSuccessPanel
          icon="🔓"
          email={email.trim()}
          tips={[
            "Jeśli konto z tym adresem istnieje, wysłaliśmy link do ustawienia nowego hasła.",
            "Link resetu jest ważny 1 godzinę — użyj go od razu po otrzymaniu maila.",
            "Brak wiadomości? Sprawdź Spam lub spróbuj ponownie za kilka minut.",
          ]}
        />
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
