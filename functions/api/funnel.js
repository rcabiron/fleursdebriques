// Cloudflare Pages bindings requis :
// - FUNNEL_METRICS : espace KV conservant les évènements anonymes pendant 90 jours.
// - FUNNEL_REPORT_KEY : secret utilisé uniquement pour consulter le rapport agrégé.
const FUNNEL_EVENTS = new Set([
  "page_view",
  "offers_viewed",
  "checkout_opened",
  "payment_methods_viewed",
  "paypal_started",
  "paypal_cancelled",
  "paypal_error",
  "subscription_approved",
  "subscription_confirmed",
]);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

const cleanLabel = (value, maxLength) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);

const cleanPath = (value) => {
  const path = String(value || "/").split("?")[0].slice(0, 120);
  return path.startsWith("/") ? path : "/";
};

const parisDay = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const isSameOrigin = (request) => {
  const origin = request.headers.get("Origin");
  if (!origin) return request.headers.get("Sec-Fetch-Site") === "same-origin";
  return origin === new URL(request.url).origin;
};

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ message: "Origine non autorisée." }, 403);
  if (!env.FUNNEL_METRICS) return json({ message: "Mesure interne non configurée." }, 503);

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 2000) return json({ message: "Requête trop volumineuse." }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: "Requête invalide." }, 400);
  }

  const event = cleanLabel(body.event, 40);
  if (!FUNNEL_EVENTS.has(event)) return json({ message: "Évènement inconnu." }, 400);

  const recordedAt = new Date();
  const record = {
    event,
    plan: cleanLabel(body.plan, 24),
    path: cleanPath(body.path),
    source: cleanLabel(body.source, 48),
    medium: cleanLabel(body.medium, 48),
    campaign: cleanLabel(body.campaign, 80),
    value: Number.isFinite(Number(body.value)) ? Math.max(0, Math.min(Number(body.value), 10000)) : 0,
    recordedAt: recordedAt.toISOString(),
  };

  const key = `funnel:${parisDay(recordedAt)}:${event}:${crypto.randomUUID()}`;
  await env.FUNNEL_METRICS.put(key, "", {
    expirationTtl: 60 * 60 * 24 * 90,
    metadata: record,
  });
  return json({ ok: true }, 202);
}

const authorized = (request, env) => {
  if (!env.FUNNEL_REPORT_KEY) return false;
  return request.headers.get("Authorization") === `Bearer ${env.FUNNEL_REPORT_KEY}`;
};

const listRecords = async (namespace) => {
  const records = [];
  let cursor;
  do {
    const page = await namespace.list({ prefix: "funnel:", cursor, limit: 1000 });
    records.push(...page.keys.map(({ metadata }) => metadata).filter(Boolean));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor && records.length < 10000);
  return records;
};

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ message: "Introuvable." }, 404);
  if (!env.FUNNEL_METRICS) return json({ message: "Mesure interne non configurée." }, 503);

  const requestedDays = Number(new URL(request.url).searchParams.get("days") || 7);
  const days = Math.max(1, Math.min(Number.isFinite(requestedDays) ? requestedDays : 7, 90));
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const records = (await listRecords(env.FUNNEL_METRICS))
    .filter(({ recordedAt }) => new Date(recordedAt).getTime() >= since);

  const totals = {};
  const plans = {};
  const sources = {};
  const paths = {};
  const campaigns = {};
  for (const record of records) {
    totals[record.event] = (totals[record.event] || 0) + 1;
    if (record.plan) {
      plans[record.plan] ||= {};
      plans[record.plan][record.event] = (plans[record.plan][record.event] || 0) + 1;
    }
    if (record.source) sources[record.source] = (sources[record.source] || 0) + 1;
    if (record.path) {
      paths[record.path] ||= {};
      paths[record.path][record.event] = (paths[record.path][record.event] || 0) + 1;
    }
    if (record.campaign) campaigns[record.campaign] = (campaigns[record.campaign] || 0) + 1;
  }

  return json({
    periodDays: days,
    generatedAt: new Date().toISOString(),
    totals,
    plans,
    sources,
    paths,
    campaigns,
  });
}
