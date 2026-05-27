import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiValidationError, confirmPasswordReset } from "../lib/api";
import {
  AuthShell,
  errorBoxClass,
  infoBoxClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "../components/AuthShell";

const MIN_PASSWORD_LENGTH = 10;

export function PasswordResetConfirm() {
  const [params] = useSearchParams();
  const routeParams = useParams<{ token?: string }>();
  // Akceptujemy zarówno /reset-hasla?token=... (preferowany format) jak
  // i /reset-hasla/:token (wsteczna kompatybilność).
  const token = params.get("token") ?? routeParams.token ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthShell
        badge="❌ Brak tokenu"
        title="Niepoprawny link resetu"
        subtitle="Link nie zawiera tokenu — sprawdź, czy otworzyłeś go w całości z maila."
        footer={
          <p>
            <Link to="/zapomniane-haslo" className="text-[var(--color-bordo)] hover:underline">
              Poproś o nowy link
            </Link>
          </p>
        }
      >
        <p className={errorBoxClass}>
          Token resetu musi przyjść w adresie strony jako parametr{" "}
          <code className="font-mono">?token=…</code>
        </p>
      </AuthShell>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError("Hasła się nie zgadzają");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Hasło musi mieć min. ${MIN_PASSWORD_LENGTH} znaków`);
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset({ token, password });
      setDone(true);
      setTimeout(() => navigate("/logowanie", { replace: true }), 1500);
    } catch (err) {
      const message =
        err instanceof ApiValidationError
          ? err.message
          : "Nie udało się zresetować hasła";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        badge="✅ Gotowe"
        title="Hasło zmienione"
        subtitle="Za chwilę przeniesiemy Cię do logowania."
      >
        <p className={infoBoxClass}>Zaloguj się nowym hasłem.</p>
      </AuthShell>
    );
  }

  const isValid =
    password.length >= MIN_PASSWORD_LENGTH && password === password2;

  return (
    <AuthShell
      badge="🔐 Nowe hasło"
      title="Ustaw nowe hasło"
      subtitle="Po zapisaniu zaloguj się nowym hasłem."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="rc-password" className={labelClass}>
            Nowe hasło
          </label>
          <input
            id="rc-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-stone-500">
            Co najmniej {MIN_PASSWORD_LENGTH} znaków.
          </p>
        </div>

        <div>
          <label htmlFor="rc-password2" className={labelClass}>
            Powtórz hasło
          </label>
          <input
            id="rc-password2"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
            autoComplete="new-password"
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
          {submitting ? "Zapisuję…" : "Ustaw hasło"}
        </button>
      </form>
    </AuthShell>
  );
}
