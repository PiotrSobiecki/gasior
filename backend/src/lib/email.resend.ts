import type { EmailMessage, EmailTransport } from "./email";

// HTTP transport do Resend API. Klucz API jest per-konto, więc sam from może
// być z dowolnej zweryfikowanej w panelu Resenda domeny — w dev używamy
// zazwyczaj `onboarding@resend.dev` albo Twojej istniejącej domeny.

export interface ResendOptions {
  apiKey: string;
  // From w formacie "Nazwa <adres@domena>" albo "adres@domena".
  from: string;
}

const ENDPOINT = "https://api.resend.com/emails";

export function createResendEmailTransport(opts: ResendOptions): EmailTransport {
  return {
    async send(msg: EmailMessage) {
      const body = {
        from: opts.from,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      };
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // Wyciągamy szczegóły z odpowiedzi do logu — Resend zwraca JSON z
        // polem `name`/`message`. Nie podajemy treści maila w błędzie (PII).
        const detail = await res.text().catch(() => "");
        throw new Error(
          `Resend send failed: HTTP ${res.status} ${res.statusText} ${detail}`,
        );
      }
    },
  };
}
