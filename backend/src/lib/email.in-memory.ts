import type { EmailMessage, EmailTransport } from "./email";

// Test-only transport: kolejkuje maile w pamięci do asercji w testach.
// Również użyteczny dla `wrangler dev` bez prawdziwego klucza Resend (logi do
// konsoli, zero realnych wysyłek).

export interface InMemoryEmailTransport extends EmailTransport {
  readonly sent: EmailMessage[];
  reset(): void;
}

export function createInMemoryEmailTransport(opts: {
  logToConsole?: boolean;
} = {}): InMemoryEmailTransport {
  const sent: EmailMessage[] = [];
  return {
    sent,
    async send(msg) {
      sent.push(msg);
      if (opts.logToConsole) {
        // Dev convenience: w terminalu chcemy widzieć link aktywacyjny/resetu
        // tak żeby dało się go skopiować bez czytania całego tekstu maila.
        // Wyłuskujemy pierwszy URL z treści i wypisujemy go wybijająco.
        const link = msg.text.match(/https?:\/\/\S+/)?.[0];
        // eslint-disable-next-line no-console
        console.log(
          `\n=== [mail:in-memory] ===\n` +
            `to:      ${msg.to}\n` +
            `subject: ${msg.subject}\n` +
            (link ? `link:    ${link}\n` : "") +
            `--- treść ---\n${msg.text}` +
            `========================\n`,
        );
      }
    },
    reset() {
      sent.length = 0;
    },
  };
}
