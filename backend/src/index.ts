import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createRecipesApp } from "./recipes/routes";
import { createNeonRecipeRepo } from "./recipes/repo.neon";
import { createBatchesApp } from "./batches/routes";
import { createNeonBatchRepo } from "./batches/repo.neon";
import { createBatchService } from "./batches/service";
import { createMeasurementsApp } from "./measurements/routes";
import { createNeonMeasurementRepo } from "./measurements/repo.neon";
import { createMeasurementService } from "./measurements/service";
import { createJournalApp } from "./journal/routes";
import { createNeonJournalRepo } from "./journal/repo.neon";
import { createJournalService } from "./journal/service";
import { createPhotosApp } from "./storage/photoRoute";
import { createInMemoryObjectStorage } from "./storage/storage.in-memory";
import { createR2ObjectStorage } from "./storage/storage.r2";
import type { ObjectStorage } from "./storage/storage";
import { createAuthApp } from "./auth/routes";
import { createAuthContextMiddleware } from "./auth/middleware";
import type { AuthVariables } from "./auth/middleware";
import { createAuthService } from "./auth/service";
import { createNeonAuthRepo } from "./auth/repo.neon";
import { createResendEmailTransport } from "./lib/email.resend";
import { createInMemoryEmailTransport } from "./lib/email.in-memory";
import type { EmailTransport } from "./lib/email";
import { generateViewSlug } from "./lib/credentials";
import { estimateAbv } from "./lib/abv";

type R2BucketLike = Parameters<typeof createR2ObjectStorage>[0];

type Bindings = {
  DATABASE_URL: string;
  // Origin frontendu, np. "http://localhost:5173" lub domena Pages.
  // PRZY auth wymagamy konkretnego origina — przy `credentials: include`
  // CORS nie pozwala na "*".
  FRONTEND_ORIGIN?: string;
  // R2 binding (opcjonalny w dev — wtedy fallback do in-memory).
  BUCKET_PHOTOS?: R2BucketLike;
  // Bazowy URL do serwowania zdjęć (np. https://gasior-api.../api/photos).
  PHOTO_BASE_URL?: string;
  // Resend: klucz API + From (zweryfikowana domena w panelu Resenda).
  // Gdy brak — używamy in-memory transportu i logujemy maila do konsoli.
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  // Czy ciasteczko sesyjne ma być `Secure` (prod=true, dev=false).
  // Trzymamy w Bindings, żeby pełna konfiguracja siedziała w wrangler.jsonc.
  SESSION_COOKIE_SECURE?: string; // "true" / "false"
  SESSION_TTL_DAYS?: string;       // np. "30"
};

// Lokalny singleton in-memory storage — używany tylko gdy brak R2 binding.
let devStorageSingleton: ObjectStorage | null = null;
function getStorage(env: Bindings): ObjectStorage {
  if (env.BUCKET_PHOTOS) return createR2ObjectStorage(env.BUCKET_PHOTOS);
  if (!devStorageSingleton) devStorageSingleton = createInMemoryObjectStorage();
  return devStorageSingleton;
}

// In-memory email transport — fallback dla dev bez klucza Resend. Loguje
// treść maila do konsoli wraz z linkiem aktywacyjnym, więc dev może
// kliknąć "ręcznie" w terminalu.
let devEmailSingleton: EmailTransport | null = null;
function getEmail(env: Bindings): EmailTransport {
  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    return createResendEmailTransport({
      apiKey: env.RESEND_API_KEY,
      from: env.MAIL_FROM,
    });
  }
  if (!devEmailSingleton) {
    devEmailSingleton = createInMemoryEmailTransport({ logToConsole: true });
  }
  return devEmailSingleton;
}

function getPhotoBaseUrl(env: Bindings, c: { req: { url: string } }): string {
  if (env.PHOTO_BASE_URL) return env.PHOTO_BASE_URL.replace(/\/$/, "");
  const u = new URL(c.req.url);
  return `${u.origin}/api/photos`;
}

function frontendOrigin(env: Bindings): string {
  return env.FRONTEND_ORIGIN ?? "http://localhost:5173";
}

function sessionTtlDays(env: Bindings): number {
  const n = Number(env.SESSION_TTL_DAYS);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function sessionCookieSecure(env: Bindings): boolean {
  // Domyślnie tylko w prod ustawiamy Secure (CF Workers w prod jadą po HTTPS).
  return env.SESSION_COOKIE_SECURE === "true";
}

const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

// CORS z credentials — przy cookie sesyjnym nie możemy `*`. Origin musi
// być konkretny (FRONTEND_ORIGIN); brak ustawienia → fallback do dev URL.
app.use("/api/*", (c, next) =>
  cors({
    origin: frontendOrigin(c.env),
    credentials: true,
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })(c, next),
);

// Middleware kontekstu auth — wczytuje sesję z cookie i wstawia `currentUser`
// do `c`. Stosujemy globalnie dla /api/*, żeby każdy route mógł sprawdzić
// `c.get("currentUser")`. Bez sesji → null (publiczne endpointy działają dalej).
app.use("/api/*", (c, next) => {
  const service = createAuthService({
    repo: createNeonAuthRepo(c.env.DATABASE_URL),
    mail: getEmail(c.env),
    frontendOrigin: frontendOrigin(c.env),
    mailFrom: c.env.MAIL_FROM ?? "Bimbrownik <noreply@example>",
    sessionTtlDays: sessionTtlDays(c.env),
  });
  return createAuthContextMiddleware(() => service)(c, next);
});

app.get("/", (c) => c.json({ name: "gasior-api", status: "ok" }));

// Konta — rejestracja / aktywacja / login / logout / reset hasła / /me.
app.route(
  "/api/auth",
  createAuthApp(
    (c) =>
      createAuthService({
        repo: createNeonAuthRepo(c.env.DATABASE_URL),
        mail: getEmail(c.env),
        frontendOrigin: frontendOrigin(c.env),
        mailFrom: c.env.MAIL_FROM ?? "Bimbrownik <noreply@example>",
        sessionTtlDays: sessionTtlDays(c.env),
      }),
    (c) => ({
      sessionCookieSecure: sessionCookieSecure(c.env),
      sessionCookieMaxAgeSeconds: sessionTtlDays(c.env) * 24 * 60 * 60,
    }),
  ),
);

// Receptury — odczyt publiczny + tworzenie szkiców przez zalogowanego usera.
app.route(
  "/api/recipes",
  createRecipesApp((c) => createNeonRecipeRepo(c.env.DATABASE_URL)),
);

// Tracker nastawów — tworzenie i edycja po sesji (cookie HttpOnly).
app.route(
  "/api/batches",
  createBatchesApp((c) => {
    const recipeRepo = createNeonRecipeRepo(c.env.DATABASE_URL);
    return createBatchService({
      repo: createNeonBatchRepo(c.env.DATABASE_URL),
      generateViewSlug,
      verifyRecipeExists: async (id) =>
        (await recipeRepo.getById(id)) !== null,
      getRecipeSteps: async (id) => {
        const recipe = await recipeRepo.getById(id);
        return recipe?.steps ?? null;
      },
    });
  }),
);

// Pomiary nastawu — sub-route /api/batches/:viewSlug/measurements.
// GET publiczny, POST za sesją właściciela (lub isDemo=true).
app.route(
  "/api/batches/:viewSlug/measurements",
  createMeasurementsApp((c) => ({
    service: createMeasurementService({
      batchRepo: createNeonBatchRepo(c.env.DATABASE_URL),
      measurementRepo: createNeonMeasurementRepo(c.env.DATABASE_URL),
    }),
    viewSlug: c.req.param("viewSlug")!,
  })),
);

// Dziennik nastawu — sub-route /api/batches/:viewSlug/journal.
// GET publiczny, POST (multipart) za sesją właściciela; opcjonalny upload zdjęcia.
app.route(
  "/api/batches/:viewSlug/journal",
  createJournalApp((c) => ({
    service: createJournalService({
      batchRepo: createNeonBatchRepo(c.env.DATABASE_URL),
      journalRepo: createNeonJournalRepo(c.env.DATABASE_URL),
      storage: getStorage(c.env),
      photoBaseUrl: getPhotoBaseUrl(c.env, c),
      generateKey: (batchId, ext) =>
        `batches/${batchId}/photos/${crypto.randomUUID()}.${ext}`,
    }),
    viewSlug: c.req.param("viewSlug")!,
  })),
);

// Serwowanie zdjęć z bucketu (publiczne, długi cache).
app.route(
  "/api/photos",
  createPhotosApp((c) => ({ storage: getStorage(c.env) })),
);

// Pomocniczy kalkulator ABV (bez zapisu).
app.post(
  "/api/estimate-abv",
  zValidator("json", z.object({ sugarKg: z.number(), waterL: z.number() })),
  (c) => {
    const { sugarKg, waterL } = c.req.valid("json");
    return c.json({ abv: estimateAbv(sugarKg, waterL) });
  },
);

export default app;
