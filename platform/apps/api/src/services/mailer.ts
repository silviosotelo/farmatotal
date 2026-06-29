import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { emailLog, emailQueue, emailTemplates, options, tenants } from "../db/schema/index.js";

const SETTINGS_KEY = "mod_mailer";

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

export async function enqueueEmail(input: EnqueueInput) {
  const tenantId = await defaultTenantId();
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
      tenantId,
      fromEmail: "no-reply@localhost",
      fromName: "Tienda",
      toEmail: input.toEmail,
      toName: input.toName ?? "",
      subject,
      bodyHtml,
      status: "pending",
    })
    .returning();
  return row!;
}

type SendResult = { ok: boolean; error?: string };

async function sendViaProvider(cfg: MailerConfig, msg: { to: string; subject: string; html: string }): Promise<SendResult> {
  if (cfg.provider === "log") {
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

export async function processQueue(limit = 10): Promise<{ sent: number; failed: number }> {
  const cfg = await getMailerConfig(await defaultTenantId());
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
        .set({ status: giveUp ? "failed" : "pending", attempts, error: result.error ?? "error" })
        .where(eq(emailQueue.id, job.id));
      failed++;
    }
    await db.insert(emailLog).values({
      tenantId: await defaultTenantId(),
      queueId: job.id,
      toEmail: job.toEmail,
      subject: job.subject,
      status: result.ok ? "sent" : "failed",
      error: result.ok ? null : (result.error ?? null),
    });
  }
  return { sent, failed };
}

export async function pendingCount(): Promise<number> {
  const [{ c } = { c: 0 }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(emailQueue)
    .where(eq(emailQueue.status, "pending"));
  return c;
}
