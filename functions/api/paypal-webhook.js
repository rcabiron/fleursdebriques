const PAYPAL_API_BASE = {
  live: "https://api-m.paypal.com",
  sandbox: "https://api-m.sandbox.paypal.com",
};

const PLAN_CATALOG = {
  "P-9WK16435TS7356210NJM6FSY": {
    code: "ESSENTIEL",
    name: "L’Essentiel",
    price: 49.9,
    contents: "une création florale de 500 à 1 000 pièces",
  },
  "P-44N73432SR248160RNJM6GDY": {
    code: "PREMIUM",
    name: "Le Premium",
    price: 69.9,
    contents: "une grande création ou deux sets différents, pour un minimum de 1 000 pièces",
  },
};

const IMPORTANT_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.SALE.REFUNDED",
  "PAYMENT.SALE.REVERSED",
]);

const CUSTOMER_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
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

const formatMoney = (value, currency = "EUR") => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Non communiqué";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "Non communiquée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "long",
  }).format(date);
};

const getPayPalBase = (env) =>
  PAYPAL_API_BASE[env.PAYPAL_ENVIRONMENT === "sandbox" ? "sandbox" : "live"];

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

const verifyWebhookSignature = async ({ env, request, event, accessToken }) => {
  const verification = {
    auth_algo: request.headers.get("PAYPAL-AUTH-ALGO"),
    cert_url: request.headers.get("PAYPAL-CERT-URL"),
    transmission_id: request.headers.get("PAYPAL-TRANSMISSION-ID"),
    transmission_sig: request.headers.get("PAYPAL-TRANSMISSION-SIG"),
    transmission_time: request.headers.get("PAYPAL-TRANSMISSION-TIME"),
    webhook_id: env.PAYPAL_WEBHOOK_ID,
    webhook_event: event,
  };

  if (Object.values(verification).some((value) => !value)) return false;

  const response = await fetch(`${getPayPalBase(env)}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(verification),
  });
  const payload = await response.json().catch(() => ({}));
  return response.ok && payload.verification_status === "SUCCESS";
};

const getSubscriptionId = (event) => {
  const resource = event?.resource || {};
  if (String(event?.event_type || "").startsWith("BILLING.SUBSCRIPTION.")) return resource.id || "";
  return resource.billing_agreement_id || resource.supplementary_data?.related_ids?.subscription_id || "";
};

const getSubscription = async ({ env, subscriptionId, accessToken }) => {
  if (!subscriptionId) return null;
  const response = await fetch(
    `${getPayPalBase(env)}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) return null;
  return response.json();
};

const joinAddress = (address) => {
  if (!address) return "Non communiquée";
  return [
    address.address_line_1,
    address.address_line_2,
    [address.postal_code, address.admin_area_2].filter(Boolean).join(" "),
    address.admin_area_1,
    address.country_code,
  ].filter(Boolean).join("\n");
};

const getSummary = ({ event, subscription }) => {
  const resource = event.resource || {};
  const details = subscription || resource;
  const subscriptionId = getSubscriptionId(event) || details.id || "Non communiqué";
  const planId = details.plan_id || resource.plan_id || "";
  const plan = PLAN_CATALOG[planId] || {
    code: "INCONNU",
    name: details.plan?.name || "Formule non reconnue",
    price: Number(details.billing_info?.last_payment?.amount?.value || resource.amount?.total || resource.amount?.value || 0),
    contents: "création florale mensuelle",
  };
  const subscriber = details.subscriber || resource.subscriber || {};
  const shipping = Number(details.shipping_amount?.value || 0);
  const total = plan.price + shipping;
  const paymentAmount = resource.amount?.total || resource.amount?.value || details.billing_info?.last_payment?.amount?.value;
  const paymentCurrency = resource.amount?.currency || resource.amount?.currency_code || details.billing_info?.last_payment?.amount?.currency_code || "EUR";
  const name = [subscriber.name?.given_name, subscriber.name?.surname].filter(Boolean).join(" ") || subscriber.name?.full_name || "Client";
  const shippingName = subscriber.shipping_address?.name?.full_name || name;

  return {
    eventId: event.id || "Non communiqué",
    eventType: event.event_type || "Événement PayPal",
    eventDate: event.create_time || new Date().toISOString(),
    status: details.status || resource.status || "Non communiqué",
    subscriptionId,
    customId: details.custom_id || resource.custom_id || "Non communiqué",
    planId,
    plan,
    name,
    email: subscriber.email_address || "",
    payerId: subscriber.payer_id || "Non communiqué",
    shippingName,
    shippingAddress: joinAddress(subscriber.shipping_address?.address),
    shipping,
    total,
    paymentAmount: paymentAmount ? formatMoney(paymentAmount, paymentCurrency) : formatMoney(total),
    nextBilling: details.billing_info?.next_billing_time || "",
    lastPayment: details.billing_info?.last_payment?.time || "",
    failedReason: details.billing_info?.last_failed_payment?.reason_code || resource.reason_code || "Non communiqué",
  };
};

const getReadableEventTitle = (eventType) => ({
  "BILLING.SUBSCRIPTION.ACTIVATED": "Nouvel abonnement activé",
  "BILLING.SUBSCRIPTION.CANCELLED": "Abonnement résilié",
  "BILLING.SUBSCRIPTION.EXPIRED": "Abonnement arrivé à expiration",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED": "Échec de paiement d’abonnement",
  "BILLING.SUBSCRIPTION.SUSPENDED": "Abonnement suspendu",
  "BILLING.SUBSCRIPTION.UPDATED": "Abonnement modifié",
  "PAYMENT.SALE.COMPLETED": "Mensualité reçue",
  "PAYMENT.SALE.REFUNDED": "Paiement remboursé",
  "PAYMENT.SALE.REVERSED": "Paiement annulé par PayPal",
}[eventType] || eventType || "Événement PayPal");

const infoRow = (label, value) => `
  <tr>
    <td style="padding:11px 13px;color:#716f68;font-weight:700;border-bottom:1px solid #ece7dd;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:11px 13px;color:#171713;border-bottom:1px solid #ece7dd;">${escapeHtml(value || "Non communiqué").replaceAll("\n", "<br>")}</td>
  </tr>`;

const sendEmail = async (env, payload) => {
  if (!env.RESEND_API_KEY || !env.CONTACT_FROM) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "fleurs-de-briques-paypal-webhook/3.0",
    },
    body: JSON.stringify(payload),
  });
  return response.ok;
};

const sendMerchantEmail = async ({ env, summary }) => {
  if (!env.CONTACT_TO) return false;
  const title = getReadableEventTitle(summary.eventType);
  const deliveryCost = summary.shipping > 0 ? formatMoney(summary.shipping) : "Offerte en France";
  return sendEmail(env, {
    from: env.CONTACT_FROM,
    to: [env.CONTACT_TO.toLowerCase()],
    reply_to: summary.email || env.CONTACT_TO.toLowerCase(),
    subject: `${title} — ${summary.plan.name} — ${summary.subscriptionId}`,
    text: [
      `Fleurs de Briques — ${title}`,
      `Formule: ${summary.plan.name}`,
      `Montant mensuel: ${formatMoney(summary.total)}`,
      `Dernier paiement lié: ${summary.paymentAmount}`,
      `Livraison: ${deliveryCost}`,
      `Référence PayPal: ${summary.subscriptionId}`,
      `Référence FDB: ${summary.customId}`,
      `Statut: ${summary.status}`,
      `Client: ${summary.name} — ${summary.email || "Non communiqué"}`,
      `Adresse: ${summary.shippingName} — ${summary.shippingAddress.replaceAll("\n", ", ")}`,
      `Prochaine échéance: ${formatDate(summary.nextBilling)}`,
      `Motif d’échec éventuel: ${summary.failedReason}`,
      `Événement: ${summary.eventType} (${summary.eventId})`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;background:#f3efe7;color:#171713;padding:24px;">
        <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e7e0d5;">
          <div style="padding:24px;background:#171713;color:#fff;"><p style="margin:0 0 8px;color:#f5c654;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Fleurs de Briques · PayPal</p><h1 style="margin:0;font-size:27px;">${escapeHtml(title)}</h1></div>
          <div style="padding:24px;"><p style="margin:0 0 18px;font-size:18px;"><strong>${escapeHtml(summary.plan.name)}</strong> · ${escapeHtml(formatMoney(summary.total))} par mois</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #ece7dd;">
              ${infoRow("Référence PayPal", summary.subscriptionId)}
              ${infoRow("Référence FDB", summary.customId)}
              ${infoRow("Statut", summary.status)}
              ${infoRow("Client", `${summary.name}\n${summary.email || "Non communiqué"}`)}
              ${infoRow("Livraison", `${summary.shippingName}\n${summary.shippingAddress}\n${deliveryCost}`)}
              ${infoRow("Prochaine échéance", formatDate(summary.nextBilling))}
              ${infoRow("Paiement lié", summary.paymentAmount)}
              ${infoRow("Motif d’échec éventuel", summary.failedReason)}
              ${infoRow("Événement technique", `${summary.eventType}\n${summary.eventId}`)}
            </table>
          </div>
        </div>
      </div>`,
  });
};

const customerEmailContent = ({ env, summary }) => {
  const siteUrl = String(env.SITE_URL || "https://fleursdebriques.fr").replace(/\/$/, "");
  const firstName = summary.name === "Client" ? "" : ` ${summary.name.split(" ")[0]}`;
  const nextBilling = summary.nextBilling ? formatDate(summary.nextBilling) : "à la date anniversaire de votre commande";
  const delivery = summary.shipping > 0
    ? `${formatMoney(summary.shipping)} par box pour la livraison en Europe`
    : "livraison offerte en France";
  const commonFooter = `
    <p style="margin:26px 0 0;color:#716f68;font-size:13px;line-height:1.6;">Vous pouvez gérer ou résilier votre abonnement à tout moment depuis <a href="https://www.paypal.com/myaccount/autopay/" style="color:#5043bb;font-weight:700;">PayPal</a> ou depuis notre <a href="${siteUrl}/resiliation.html" style="color:#5043bb;font-weight:700;">page de résiliation</a>.</p>
    <p style="margin:12px 0 0;color:#716f68;font-size:12px;"><a href="${siteUrl}/conditions-generales.html" style="color:#5043bb;">Conditions générales</a> · <a href="${siteUrl}/livraison-retours.html" style="color:#5043bb;">Livraison et retours</a> · <a href="${siteUrl}/confidentialite.html" style="color:#5043bb;">Confidentialité</a></p>`;

  if (summary.eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
    return {
      subject: `Bienvenue — votre abonnement ${summary.plan.name} est confirmé`,
      preview: "Votre première création Fleurs de Briques se prépare.",
      title: "Votre collection commence ici.",
      body: `
        <p>Bonjour${escapeHtml(firstName)},</p>
        <p>Votre abonnement <strong>${escapeHtml(summary.plan.name)}</strong> est maintenant actif. Chaque mois, vous recevrez ${escapeHtml(summary.plan.contents)}.</p>
        <div style="margin:24px 0;padding:20px;border-radius:16px;background:#f3efe7;">
          <p style="margin:0 0 8px;"><strong>Montant mensuel :</strong> ${escapeHtml(formatMoney(summary.total))}</p>
          <p style="margin:0 0 8px;"><strong>Livraison :</strong> ${escapeHtml(delivery)}</p>
          <p style="margin:0 0 8px;"><strong>Prochaine échéance :</strong> ${escapeHtml(nextBilling)}</p>
          <p style="margin:0;"><strong>Référence PayPal :</strong> ${escapeHtml(summary.subscriptionId)}</p>
        </div>
        <p>Les box sont expédiées aux alentours du 10 de chaque mois afin d’arriver, dans la mesure du possible, avant le 15. Votre création sera toujours accompagnée de sachets numérotés et d’une notice illustrée.</p>
        ${commonFooter}`,
      text: [
        `Bonjour${firstName},`,
        `Votre abonnement ${summary.plan.name} est maintenant actif.`,
        `Contenu: ${summary.plan.contents}.`,
        `Montant mensuel: ${formatMoney(summary.total)} (${delivery}).`,
        `Prochaine échéance: ${nextBilling}.`,
        `Référence PayPal: ${summary.subscriptionId}.`,
        "Les box sont expédiées aux alentours du 10 afin d’arriver, dans la mesure du possible, avant le 15.",
        `Gérer dans PayPal: https://www.paypal.com/myaccount/autopay/`,
        `Résilier: ${siteUrl}/resiliation.html`,
      ].join("\n\n"),
    };
  }

  if (["BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.EXPIRED"].includes(summary.eventType)) {
    return {
      subject: "Votre abonnement Fleurs de Briques est résilié",
      preview: "La résiliation de votre abonnement a bien été enregistrée.",
      title: "Résiliation confirmée.",
      body: `<p>Bonjour${escapeHtml(firstName)},</p><p>La résiliation de votre abonnement <strong>${escapeHtml(summary.plan.name)}</strong> a bien été enregistrée. Vous ne serez plus prélevé pour de nouvelles échéances.</p><p>Une box correspondant à une mensualité déjà payée reste préparée et expédiée normalement.</p><p style="margin-top:24px;color:#716f68;font-size:13px;">Référence PayPal : ${escapeHtml(summary.subscriptionId)}</p>`,
      text: `Bonjour${firstName},\n\nLa résiliation de votre abonnement ${summary.plan.name} a bien été enregistrée. Vous ne serez plus prélevé pour de nouvelles échéances.\n\nUne box correspondant à une mensualité déjà payée reste préparée et expédiée normalement.\n\nRéférence PayPal: ${summary.subscriptionId}`,
    };
  }

  return {
    subject: "Action requise — problème de paiement sur votre abonnement",
    preview: "PayPal n’a pas pu traiter la dernière échéance.",
    title: "Un paiement demande votre attention.",
    body: `<p>Bonjour${escapeHtml(firstName)},</p><p>PayPal n’a pas pu traiter la dernière échéance de votre abonnement <strong>${escapeHtml(summary.plan.name)}</strong>. Votre abonnement peut être temporairement suspendu tant que le paiement n’est pas régularisé.</p><p>Vérifiez votre moyen de paiement dans votre compte PayPal pour éviter l’interruption des prochaines box.</p><p style="margin:24px 0;"><a href="https://www.paypal.com/myaccount/autopay/" style="display:inline-block;padding:14px 20px;border-radius:999px;color:#fff;background:#171713;text-decoration:none;font-weight:700;">Vérifier mon paiement</a></p><p style="color:#716f68;font-size:13px;">Référence PayPal : ${escapeHtml(summary.subscriptionId)}</p>`,
    text: `Bonjour${firstName},\n\nPayPal n’a pas pu traiter la dernière échéance de votre abonnement ${summary.plan.name}. Vérifiez votre moyen de paiement dans votre compte PayPal: https://www.paypal.com/myaccount/autopay/\n\nRéférence PayPal: ${summary.subscriptionId}`,
  };
};

const sendCustomerEmail = async ({ env, summary }) => {
  if (!summary.email) return false;
  const content = customerEmailContent({ env, summary });
  return sendEmail(env, {
    from: env.CONTACT_FROM,
    to: [summary.email.toLowerCase()],
    reply_to: env.CONTACT_TO?.toLowerCase(),
    subject: content.subject,
    text: content.text,
    html: `
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preview)}</div>
      <div style="font-family:Arial,sans-serif;background:#f3efe7;color:#171713;padding:24px;">
        <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:22px;overflow:hidden;border:1px solid #e7e0d5;">
          <div style="padding:28px;background:#171713;color:#fff;"><p style="margin:0 0 8px;color:#f5c654;font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;">Fleurs de Briques</p><h1 style="margin:0;font-size:30px;line-height:1.15;">${escapeHtml(content.title)}</h1></div>
          <div style="padding:28px;font-size:15px;line-height:1.7;">${content.body}</div>
        </div>
      </div>`,
  });
};

const alreadyProcessed = async (env, eventId) => {
  if (!eventId || !env.PAYPAL_EVENTS?.get) return false;
  return Boolean(await env.PAYPAL_EVENTS.get(eventId));
};

const rememberEvent = async (env, event, summary) => {
  if (!event.id || !env.PAYPAL_EVENTS?.put) return;
  await env.PAYPAL_EVENTS.put(
    event.id,
    JSON.stringify({ eventType: event.event_type, subscriptionId: summary.subscriptionId, processedAt: new Date().toISOString() }),
    { expirationTtl: 60 * 60 * 24 * 180 },
  );
};

export async function onRequestPost({ request, env }) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET || !env.PAYPAL_WEBHOOK_ID) {
    return json({ message: "Webhook PayPal non configuré." }, 500);
  }

  let event;
  try {
    event = await request.json();
  } catch {
    return json({ message: "Payload PayPal invalide." }, 400);
  }

  let accessToken;
  try {
    accessToken = await getAccessToken(env);
    const verified = await verifyWebhookSignature({ env, request, event, accessToken });
    if (!verified) return json({ message: "Signature PayPal invalide." }, 401);
  } catch (error) {
    return json({ message: `Vérification PayPal impossible: ${error.message}` }, 502);
  }

  if (await alreadyProcessed(env, event.id)) {
    return json({ ok: true, duplicate: true, received: event.event_type || null });
  }

  if (!IMPORTANT_EVENTS.has(event.event_type)) {
    return json({ ok: true, ignored: true, received: event.event_type || null });
  }

  const subscriptionId = getSubscriptionId(event);
  const subscription = await getSubscription({ env, subscriptionId, accessToken }).catch(() => null);
  const summary = getSummary({ event, subscription });
  const results = await Promise.allSettled([
    sendMerchantEmail({ env, summary }),
    CUSTOMER_EVENTS.has(event.event_type) ? sendCustomerEmail({ env, summary }) : Promise.resolve(false),
  ]);
  const merchantNotified = results[0].status === "fulfilled" && results[0].value;
  const customerNotified = results[1].status === "fulfilled" && results[1].value;

  await rememberEvent(env, event, summary).catch(() => {});

  return json({
    ok: true,
    received: event.event_type,
    subscription: summary.subscriptionId,
    merchantNotified,
    customerNotified,
  });
}

export function onRequestGet() {
  return json({
    ok: true,
    message: "Endpoint webhook PayPal actif. Les notifications doivent être envoyées en POST par PayPal.",
  });
}
