import { z } from "zod";

// Minimalne reguły hasła — 10+ znaków. Trzymamy świadomie niski próg, żeby
// nie odsyłać użytkowników, którzy używają menedżerów haseł (długie losowe
// stringi). Brak wymogów co do "klas znaków" — to udowodniony anti-pattern
// (NIST 800-63B, 2017).
export const PASSWORD_MIN_LENGTH = 10;

// E-mail: zod ma własny z.string().email() — wystarczy, plus lowercase().
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Niepoprawny e-mail");

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków`);

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Nazwa nie może być pusta")
  .max(80, "Maks. 80 znaków")
  .optional();

export const registerInputSchema = z.object({
  email: emailSchema,
  displayName: displayNameSchema,
});

export const activateInputSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1), // przy logowaniu nie chcemy gadać o długości
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
