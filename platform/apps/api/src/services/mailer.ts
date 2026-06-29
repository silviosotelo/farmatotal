import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { emailLog, emailQueue, emailTemplates, options, tenants } from "../db/schema/index.js";

const SETTINGS_KEY = "mod_mailer";

/**
 * NOTA multitenant: la config `mod_mailer` vive en `options` (scopeada por tenant),
 * pero las tablas `email_queue` / `email_templates` / `email_log` son GLOBALES (no
 * tienen tenant_id todavía). Por eso el worker procesa una cola única y usa la config
 * del tenant por defecto. Hacer la cola multitenant requiere migración de schema
 * (agregar tenant_id a esas 3 tablas) y threadear el tenant en cada `enqueueEmail`.
 */
async function defaultTenantId(): Promise<string> {
  const slug = process.env.DEFAULT_TENANT ?? "default";
  const [t] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (!t) throw new Error(`Tenant '${slug}' no existe (mailer)`);
  return t.id;
}

export type MailerConfig = {
  provider: "log" | "sendgrid" | "smtp";
  fromName: string;
  fromEmail: string;
  sendgridApiKey?: string;
  smtp?: { host?: string; port?: number; user?: string; pass?: string; secure?: boolean };
};

const DEFAULTS: MailerConfig = { provider: "log", fromName: "Tienda", fromEmail: "no-reply@localhost" };

export async function getMailerConfig(tenantId: string): Promise<MailerConfig> {
  const [row] = await db
    .select()
    .from(options)
    .where(and(eq(options.tenantId, tenantId), eq(options.name, SETTINGS_KEY)))
    .limit(1);
  return { ...DEFAULTS, ...((row?.value as Partial<MailerConfig>) ?? {}) };
}

/** Reemplaza {{var}} por data[var]. */
export function render(tpl: string, data: Record<string, unknown> = {}): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k: string) => {
    const v = data[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

type EnqueueInput = {
  toEmail: string;
  toName?: string;
  subject?: string;
  bodyHtml?: string;
  templateKey?: string;
  data?: Record<string, unknown>;
};

/** Encola un email. Si se pasa templateKey, renderiza desde la plantilla. */
export async function enqueueEmail(input: EnqueueInput) {
  let subject = input.subject ?? "";
  let bodyHtml = input.bodyHtml ?? "";
  if (input.templateKey) {
    const [tpl] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.type, input.templateKey))
      .limit(1);
    if (tpl) {
      subject = render(tpl.subject, input.data);
      bodyHtml = render(tpl.bodyHtml, input.data);
    }
  }
  const [row] = await db
    .insert(emailQueue)
    .values({
      toEmail: input.toEmail,
      toName: input.toName ?? null,
      subject,
      bodyHtml,
      templateKey: input.templateKey ?? null,
      data: input.data ?? null,
      status: "pending",
    })
    .returning();
  return row!;
}

type SendResult = { ok: boolean; error?: string };

async function sendViaProvider(cfg: MailerConfig, msg: { to: string; subject: string; html: string }): Promise<SendResult> {
  if (cfg.provider === "log") {
    // Dev: no envía de verdad, solo registra como enviado.
    return { ok: true };
  }
  if (cfg.provider === "sendgrid") {
    if (!cfg.sendgridApiKey) return { ok: false, error: "Falta SendGrid API key" };
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.sendgridApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: msg.to }] }],
          from: { email: cfg.fromEmail, name: cfg.fromName },
          subject: msg.subject,
          content: [{ type: "text/html", value: msg.html }],
        }),
      });
      if (res.status >= 200 && res.status < 300) return { ok: true };
      return { ok: false, error: `SendGrid HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
    } catch (e) {
      return { ok: false, error: String(e).slice(0, 300) };
    }
  }
  if (cfg.provider === "smtp") {
    try {
      // nodemailer es opcional: import dinámico (specifier por variable para que tsc
      // no falle si el paquete no está instalado).
      const pkg = "nodemailer";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nm: any = await import(pkg).catch(() => null);
      if (!nm) return { ok: false, error: "nodemailer no instalado (SMTP no disponible)" };
      const t = nm.createTransport({
        host: cfg.smtp?.host,
        port: cfg.smtp?.port ?? 587,
        secure: cfg.smtp?.secure ?? false,
        auth: cfg.smtp?.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined,
      });
      await t.sendMail({ from: `${cfg.fromName} <${cfg.fromEmail}>`, to: msg.to, subject: msg.subject, html: msg.html });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e).slice(0, 300) };
    }
  }
  return { ok: false, error: "Provider desconocido" };
}

const MAX_ATTEMPTS = 3;

/** Procesa hasta `limit` emails pendientes. Devuelve cuántos envió/falló. */
export async function processQueue(limit = 10): Promise<{ sent: number; failed: number }> {
  // Cola global → usa la config del tenant por defecto (ver NOTA arriba).
  const cfg = await getMailerConfig(await defaultTenantId());
  // Comparar contra now() de la DB (evita skew de reloj app↔DB).
  const pending = await db
    .select()
    .from(emailQueue)
    .where(and(eq(emailQueue.status, "pending"), lte(emailQueue.scheduledAt, sql`now()`)))
    .limit(limit);

  let sent = 0;
  let failed = 0;
  for (const job of pending) {
    await db.update(emailQueue).set({ status: "sending" }).where(eq(emailQueue.id, job.id));
    const result = await sendViaProvider(cfg, { to: job.toEmail, subject: job.subject, html: job.bodyHtml });
    const attempts = job.attempts + 1;
    if (result.ok) {
      await db
        .update(emailQueue)
        .set({ status: "sent", sentAt: new Date(), attempts })
        .where(eq(emailQueue.id, job.id));
      sent++;
    } else {
      const giveUp = attempts >= MAX_ATTEMPTS;
      await db
        .update(emailQueue)
        .set({ status: giveUp ? "failed" : "pending", attempts, lastError: result.error ?? "error" })
        .where(eq(emailQueue.id, job.id));
      failed++;
    }
    await db.insert(emailLog).values({
      queueId: job.id,
      toEmail: job.toEmail,
      subject: job.subject,
      status: result.ok ? "sent" : "failed",
      provider: cfg.provider,
      error: result.ok ? null : (result.error ?? null),
    });
  }
  return { sent, failed };
}

/** Cuenta de pendientes (para badges). */
export async function pendingCount(): Promise<number> {
  const [{ c } = { c: 0 }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(emailQueue)
    .where(eq(emailQueue.status, "pending"));
  return c;
}
