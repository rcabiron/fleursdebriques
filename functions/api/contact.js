const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });

const sanitize = (value, maxLength = 1200) => String(value || "").trim().slice(0, maxLength);

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const escapeHtml = (value) =>
  sanitize(value, 4000)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    return json({ message: "Le formulaire n'est pas encore configuré côté serveur." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: "La demande est invalide." }, 400);
  }

  if (sanitize(body.website)) {
    return json({ ok: true });
  }

  const name = sanitize(body.name, 120);
  const email = sanitize(body.email, 180);
  const topic = sanitize(body.topic, 120);
  const reference = sanitize(body.reference, 160);
  const message = sanitize(body.message, 3500);

  if (!name || !email || !topic || !message || !isEmail(email)) {
    return json({ message: "Merci de compléter les champs obligatoires." }, 400);
  }

  const subject = `Fleurs de Briques - ${topic}`;
  const text = [
    `Nom: ${name}`,
    `Email: ${email}`,
    reference ? `Référence: ${reference}` : null,
    "",
    "Message:",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <h1>Nouvelle demande Fleurs de Briques</h1>
    <p><strong>Motif:</strong> ${escapeHtml(topic)}</p>
    <p><strong>Nom:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    ${reference ? `<p><strong>Référence:</strong> ${escapeHtml(reference)}</p>` : ""}
    <hr>
    <p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "fleurs-de-briques-contact/1.0",
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO.toLowerCase()],
      reply_to: email,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const resendError = await response.json().catch(() => null);
    const detail = resendError?.message || resendError?.error || `Erreur Resend ${response.status}`;
    return json({ message: `L'email n'a pas pu être envoyé: ${detail}` }, 502);
  }

  return json({ ok: true });
}

export function onRequestGet() {
  return json({ message: "Méthode non autorisée." }, 405);
}
