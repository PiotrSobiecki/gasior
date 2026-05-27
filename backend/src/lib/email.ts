// Interfejs transportu maila — pozwala podstawić in-memory transport w testach
// i unit-testach serwisów, a w runtime spiąć Resend (lub cokolwiek innego).
//
// Świadomie minimalny zestaw pól: nie potrzebujemy CC/BCC/replyTo dla
// transactional-only flow (aktywacja konta, reset hasła).

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailTransport {
  send(msg: EmailMessage): Promise<void>;
}
