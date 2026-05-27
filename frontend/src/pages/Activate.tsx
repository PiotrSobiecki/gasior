import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ApiValidationError, activate, type User } from "../lib/api";
import { CURRENT_USER_QUERY_KEY } from "../hooks/useCurrentUser";
import {
  AuthShell,
  errorBoxClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "../components/AuthShell";

// Minimum, które backend wymusza i tak, ale powiedzmy to userowi wcześniej.
const MIN_PASSWORD_LENGTH = 10;

export function Activate() {
  const [params] = useSearchParams();
  const routeParams = useParams<{ token?: string }>();
  // Preferujemy query (?token=...), ale akceptujemy też token z segmentu path
  // /aktywacja/:token (stary format linków, wygodne przy ręcznym klejeniu).
  const token = params.get("token") ?? routeParams.token ?? "";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <AuthShell
        badge="❌ Brak tokenu"
        title="Niepoprawny link aktywacyjny"
        subtitle="Link nie zawiera tokenu — sprawdź, czy otworzyłeś go w całości z maila."
        footer={
          <p>
            <Link to="/rejestracja" className="text-[var(--color-bordo)] hover:underline">
              Zarejestruj się ponownie
            </Link>
          </p>
        }
      >
        <p className={errorBoxClass}>
          Token aktywacyjny musi przyjść w adresie strony jako parametr{" "}
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
      const user = await activate({ token, password });
      qc.setQueryData<User | null>(CURRENT_USER_QUERY_KEY, user);
      navigate("/moje-nastawy", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiValidationError
          ? err.message
          : "Nie udało się aktywować konta";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const isValid =
    password.length >= MIN_PASSWORD_LENGTH && password === password2;

  return (
    <AuthShell
      badge="🔐 Aktywacja"
      title="Ustaw hasło"
      subtitle="To ostatni krok — po ustawieniu hasła od razu Cię zalogujemy."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="act-password" className={labelClass}>
            Nowe hasło
          </label>
          <input
            id="act-password"
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
          <label htmlFor="act-password2" className={labelClass}>
            Powtórz hasło
          </label>
          <input
            id="act-password2"
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
          {submitting ? "Aktywuję…" : "Aktywuj konto i zaloguj"}
        </button>
      </form>
    </AuthShell>
  );
}
