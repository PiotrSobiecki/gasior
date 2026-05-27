import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ApiValidationError, login, type User } from "../lib/api";
import { CURRENT_USER_QUERY_KEY } from "../hooks/useCurrentUser";
import {
  AuthShell,
  errorBoxClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "../components/AuthShell";

export function Login() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      qc.setQueryData<User | null>(CURRENT_USER_QUERY_KEY, user);
      navigate("/moje-nastawy", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiValidationError
          ? err.message
          : "Nie udało się zalogować";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const isValid = email.trim().length > 0 && password.length > 0;

  return (
    <AuthShell
      badge="🔑 Konto"
      title="Zaloguj się"
      subtitle="Otwórz swoją listę nastawów i wracaj do edycji etapów."
      footer={
        <div className="space-y-2">
          <p>
            Nie masz konta?{" "}
            <Link to="/rejestracja" className="font-medium text-[var(--color-bordo)] hover:underline">
              Załóż je
            </Link>
          </p>
          <p>
            <Link
              to="/zapomniane-haslo"
              className="text-stone-500 hover:underline"
            >
              Zapomniałem hasła
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className={labelClass}>
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="login-password" className={labelClass}>
            Hasło
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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
          {submitting ? "Loguję…" : "Zaloguj się"}
        </button>
      </form>
    </AuthShell>
  );
}
