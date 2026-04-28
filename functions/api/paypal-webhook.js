const PAYPAL_API_BASE = {
  live: "https://api-m.paypal.com",
  sandbox: "https://api-m.sandbox.paypal.com",
};

const IMPORTANT_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "CHECKOUT.ORDER.APPROVED",
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.SALE.COMPLETED",
]);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getPayPalBase = (env) => {
  const mode = env.PAYPAL_ENVIRONMENT === "sandbox" ? "sandbox" : "live";
  return PAYPAL_API_BASE[mode];
};

const getAccessToken = async (env) => {
  const response = await fetch(`${getPayPalBase(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Token PayPal indisponible");
  }

  return payload.access_token;
};

const verifyWebhookSignature = async ({ env, request, rawBody }) => {
  const accessToken = await getAccessToken(env);
  const verificationPayload = `{
    "auth_algo": ${JSON.stringify(request.headers.get("PAYPAL-AUTH-ALGO"))},
    "cert_url": ${JSON.stringify(request.headers.get("PAYPAL-CERT-URL"))},
    "transmission_id": ${JSON.stringify(request.headers.get("PAYPAL-TRANSMISSION-ID"))},
    "transmission_sig": ${JSON.stringify(request.headers.get("PAYPAL-TRANSMISSION-SIG"))},
    "transmission_time": ${JSON.stringify(request.headers.get("PAYPAL-TRANSMISSION-TIME"))},
    "webhook_id": ${JSON.stringify(env.PAYPAL_WEBHOOK_ID)},
    "webhook_event": ${rawBody}
  }`;

  const response = await fetch(`${getPayPalBase(env)}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: verificationPayload,
  });

  const payload = await response.json().catch(() => ({}));
  return response.ok && payload.verification_status === "SUCCESS";
};

const getResourceId = (event) =>
  event?.resource?.id ||
  event?.resource?.billing_agreement_id ||
  event?.resource?.supplementary_data?.related_ids?.order_id ||
  "Non communiqué";

const getAmount = (event) => {
  const amount =
    event?.resource?.amount ||
    event?.resource?.seller_receivable_breakdown?.gross_amount ||
    event?.resource?.billing_info?.last_payment?.amount;

  if (!amount?.value) return "Non communiqué";
  return `${amount.value} ${amount.currency_code || "EUR"}`;
};

const sendWebhookEmail = async ({ env, event }) => {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return false;

  const resourceId = getResourceId(event);
  const amount = getAmount(event);
  const eventType = event.event_type || "Événement PayPal";
  const eventTime = event.create_time || new Date().toISOString();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO.toLowerCase()],
      subject: `PayPal - ${eventType}`,
      html: `
        <h1>Notification PayPal</h1>
        <p>Un événement PayPal important vient d'être reçu par le site Fleurs de Briques.</p>
        <ul>
          <li><strong>Type :</strong> ${escapeHtml(eventType)}</li>
          <li><strong>Référence :</strong> ${escapeHtml(resourceId)}</li>
          <li><strong>Montant :</strong> ${escapeHtml(amount)}</li>
          <li><strong>Date :</strong> ${escapeHtml(eventTime)}</li>
        </ul>
        <p>Consultez PayPal pour le détail complet de la transaction ou de l'abonnement.</p>
      `,
      text: [
        "Notification PayPal",
        `Type: ${eventType}`,
        `Référence: ${resourceId}`,
        `Montant: ${amount}`,
        `Date: ${eventTime}`,
        "Consultez PayPal pour le détail complet de la transaction ou de l'abonnement.",
      ].join("\n"),
    }),
  });

  return response.ok;
};

export async function onRequestPost({ request, env }) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET || !env.PAYPAL_WEBHOOK_ID) {
    return json({ message: "Webhook PayPal non configuré." }, 500);
  }

  const rawBody = await request.text();
  let event;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ message: "Payload PayPal invalide." }, 400);
  }

  try {
    const isVerified = await verifyWebhookSignature({ env, request, rawBody });
    if (!isVerified) {
      return json({ message: "Signature PayPal invalide." }, 401);
    }
  } catch (error) {
    return json({ message: `Vérification PayPal impossible: ${error.message}` }, 502);
  }

  const shouldNotify = IMPORTANT_EVENTS.has(event.event_type);
  const emailSent = shouldNotify ? await sendWebhookEmail({ env, event }) : false;

  return json({
    ok: true,
    received: event.event_type || null,
    notified: emailSent,
  });
}

export async function onRequestGet() {
  return json({
    ok: true,
    message: "Endpoint webhook PayPal actif. Les notifications doivent être envoyées en POST par PayPal.",
  });
}
