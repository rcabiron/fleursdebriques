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

const getOrderId = (event) =>
  event?.resource?.supplementary_data?.related_ids?.order_id ||
  event?.resource?.purchase_units?.[0]?.payments?.captures?.[0]?.supplementary_data?.related_ids?.order_id ||
  (event?.event_type === "CHECKOUT.ORDER.APPROVED" ? event?.resource?.id : "");

const getAmount = (event) => {
  const amount =
    event?.resource?.amount ||
    event?.resource?.seller_receivable_breakdown?.gross_amount ||
    event?.resource?.billing_info?.last_payment?.amount;

  if (!amount?.value) return "Non communiqué";
  return `${amount.value} ${amount.currency_code || "EUR"}`;
};

const getOrderDetails = async ({ env, event }) => {
  const orderId = getOrderId(event);
  if (!orderId) return null;

  try {
    const accessToken = await getAccessToken(env);
    const response = await fetch(`${getPayPalBase(env)}/v2/checkout/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
};

const joinAddress = (address) => {
  if (!address) return "";

  return [
    address.address_line_1,
    address.address_line_2,
    [address.postal_code, address.admin_area_2].filter(Boolean).join(" "),
    address.admin_area_1,
    address.country_code,
  ]
    .filter(Boolean)
    .join("\n");
};

const getOrderSummary = ({ event, orderDetails }) => {
  const resource = event.resource || {};
  const purchaseUnit = orderDetails?.purchase_units?.[0] || {};
  const payer = orderDetails?.payer || resource.payer || {};
  const shipping = purchaseUnit.shipping || {};
  const amount =
    resource.amount ||
    resource.seller_receivable_breakdown?.gross_amount ||
    purchaseUnit.amount ||
    resource.billing_info?.last_payment?.amount;

  const items = purchaseUnit.items?.map((item) => `${item.quantity || 1} × ${item.name}`).join(", ");
  const description = purchaseUnit.description || resource.description || items || "Non communiqué";
  const orderReference = resource.custom_id || purchaseUnit.custom_id || resource.invoice_id || "Non communiqué";
  const paypalReference = getResourceId(event);
  const orderId = orderDetails?.id || getOrderId(event) || "Non communiqué";
  const buyerName = [payer.name?.given_name, payer.name?.surname].filter(Boolean).join(" ") || payer.name?.full_name || "Non communiqué";
  const buyerEmail = payer.email_address || resource.subscriber?.email_address || "Non communiqué";
  const shippingName = shipping.name?.full_name || buyerName;
  const shippingAddress = joinAddress(shipping.address);

  return {
    eventType: event.event_type || "Événement PayPal",
    status: resource.status || orderDetails?.status || "Non communiqué",
    orderReference,
    paypalReference,
    orderId,
    amount: amount?.value ? `${amount.value} ${amount.currency_code || "EUR"}` : getAmount(event),
    description,
    buyerName,
    buyerEmail,
    shippingName,
    shippingAddress,
    date: event.create_time || new Date().toISOString(),
  };
};

const getReadableEventTitle = (eventType) => {
  const titles = {
    "BILLING.SUBSCRIPTION.ACTIVATED": "Abonnement activé",
    "BILLING.SUBSCRIPTION.CANCELLED": "Abonnement annulé",
    "BILLING.SUBSCRIPTION.EXPIRED": "Abonnement expiré",
    "BILLING.SUBSCRIPTION.PAYMENT.FAILED": "Paiement d'abonnement échoué",
    "BILLING.SUBSCRIPTION.SUSPENDED": "Abonnement suspendu",
    "BILLING.SUBSCRIPTION.UPDATED": "Abonnement modifié",
    "CHECKOUT.ORDER.APPROVED": "Commande approuvée",
    "PAYMENT.CAPTURE.COMPLETED": "Commande payée",
    "PAYMENT.CAPTURE.DENIED": "Paiement refusé",
    "PAYMENT.CAPTURE.REFUNDED": "Paiement remboursé",
    "PAYMENT.SALE.COMPLETED": "Paiement d'abonnement reçu",
  };

  return titles[eventType] || eventType || "Événement PayPal";
};

const renderInfoRow = (label, value) => `
  <tr>
    <td style="padding:10px 12px;color:#6f625b;font-weight:700;border-bottom:1px solid #eadfd3;">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;color:#1f160e;border-bottom:1px solid #eadfd3;">${escapeHtml(value || "Non communiqué").replaceAll("\n", "<br>")}</td>
  </tr>
`;

const sendWebhookEmail = async ({ env, event, orderDetails }) => {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return false;

  const summary = getOrderSummary({ event, orderDetails });
  const readableTitle = getReadableEventTitle(summary.eventType);
  const subjectReference = summary.orderReference !== "Non communiqué" ? summary.orderReference : summary.paypalReference;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO.toLowerCase()],
      subject: `${readableTitle} - ${summary.amount} - ${subjectReference}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#fffaf2;color:#1f160e;padding:24px;">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #eadfd3;border-radius:14px;overflow:hidden;">
            <div style="padding:22px 24px;background:#123b66;color:#ffffff;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#ffed4a;font-weight:800;">Fleurs de Briques</p>
              <h1 style="margin:0;font-size:28px;line-height:1.15;">${escapeHtml(readableTitle)}</h1>
              <p style="margin:10px 0 0;font-size:17px;">${escapeHtml(summary.description)}</p>
            </div>

            <div style="padding:22px 24px;">
              <p style="margin:0 0 16px;font-size:18px;">
                <strong>${escapeHtml(summary.amount)}</strong> confirmé via PayPal.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #eadfd3;border-radius:10px;overflow:hidden;">
                ${renderInfoRow("Référence FDB", summary.orderReference)}
                ${renderInfoRow("Référence PayPal", summary.paypalReference)}
                ${renderInfoRow("Commande PayPal", summary.orderId)}
                ${renderInfoRow("Statut", summary.status)}
                ${renderInfoRow("Client", `${summary.buyerName}\n${summary.buyerEmail}`)}
                ${renderInfoRow("Livraison", `${summary.shippingName}${summary.shippingAddress ? `\n${summary.shippingAddress}` : ""}`)}
                ${renderInfoRow("Date PayPal", summary.date)}
                ${renderInfoRow("Événement technique", summary.eventType)}
              </table>
              <p style="margin:18px 0 0;color:#6f625b;font-size:14px;">
                Consultez PayPal pour le reçu officiel, le moyen de paiement et les détails complets.
              </p>
            </div>
          </div>
        </div>
      `,
      text: [
        `Fleurs de Briques - ${readableTitle}`,
        `Produit: ${summary.description}`,
        `Montant: ${summary.amount}`,
        `Référence FDB: ${summary.orderReference}`,
        `Référence PayPal: ${summary.paypalReference}`,
        `Commande PayPal: ${summary.orderId}`,
        `Statut: ${summary.status}`,
        `Client: ${summary.buyerName} - ${summary.buyerEmail}`,
        `Livraison: ${summary.shippingName}${summary.shippingAddress ? ` - ${summary.shippingAddress.replaceAll("\n", ", ")}` : ""}`,
        `Date PayPal: ${summary.date}`,
        `Événement technique: ${summary.eventType}`,
        "Consultez PayPal pour le reçu officiel, le moyen de paiement et les détails complets.",
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
  const orderDetails = shouldNotify ? await getOrderDetails({ env, event }) : null;
  const emailSent = shouldNotify ? await sendWebhookEmail({ env, event, orderDetails }) : false;

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
