const THANK_YOU_STORAGE_KEY = "fleursDeBriquesLastOrder";

const formatPrice = (value) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const params = new URLSearchParams(window.location.search);
const storedOrder = localStorage.getItem(THANK_YOU_STORAGE_KEY);
const order = storedOrder ? JSON.parse(storedOrder) : null;
const reference = order?.reference || params.get("ref") || "Confirmation PayPal";
const orderReference = order?.orderReference || params.get("order") || "Non communiqué";
const paymentType = order?.paymentType || params.get("type") || "one-time";
const isSubscription = paymentType === "subscription" || order?.mode === "subscription";

window.fdbTrack?.("thank_you_view", {
  paymentType,
  mode: order?.mode || paymentType,
  total: order?.total,
  itemCount: order?.items?.length || 0,
  isGift: order?.isGift || false,
});

const title = document.querySelector("[data-thank-title]");
const intro = document.querySelector("[data-thank-intro]");
const referenceTarget = document.querySelector("[data-thank-reference]");
const orderReferenceTarget = document.querySelector("[data-thank-order-reference]");
const summary = document.querySelector("[data-thank-summary]");
const nextSteps = document.querySelector("[data-next-steps]");
const giftConfirmation = document.querySelector("[data-gift-confirmation]");

title.textContent = isSubscription ? "Votre abonnement est confirmé." : "Votre commande est confirmée.";
intro.textContent = isSubscription
  ? "Merci. PayPal a bien créé votre abonnement Fleurs de Briques."
  : "Merci. PayPal a bien validé votre paiement Fleurs de Briques.";
referenceTarget.textContent = reference;
orderReferenceTarget.textContent = orderReference;
if (order?.isGift && giftConfirmation) {
  giftConfirmation.hidden = false;
}

if (order?.items?.length) {
  const lines = order.items
    .map(
      (item) => `
        <li>
          <div>
            <strong>${item.quantity} × ${item.name}</strong>
            <span>${item.detail}</span>
            ${item.cadence ? `<small>${item.cadence}</small>` : ""}
          </div>
          <b>${formatPrice(item.quantity * item.price)}</b>
        </li>
      `,
    )
    .join("");

  summary.innerHTML = `
    <ul>${lines}</ul>
    <p>
      <span>Total réglé maintenant</span>
      <strong>${formatPrice(order.total)}</strong>
    </p>
  `;
} else {
  summary.innerHTML = `
    <p class="thank-you-fallback">
      Le paiement a été confirmé par PayPal. Le détail complet de la transaction se trouve dans l'email de confirmation PayPal.
    </p>
  `;
}

nextSteps.innerHTML = isSubscription
  ? `
    <li>
      <strong>Confirmation</strong>
      <span>PayPal envoie l'email de confirmation de l'abonnement et de la transaction.</span>
    </li>
    <li>
      <strong>Préparation</strong>
      <span>Votre première box est intégrée à la prochaine préparation mensuelle.</span>
    </li>
    <li>
      <strong>Expédition</strong>
      <span>Les box restent envoyées chaque mois, quel que soit le rythme de prélèvement choisi.</span>
    </li>
    <li>
      <strong>Gestion</strong>
      <span>L'abonnement peut être géré depuis le compte PayPal de l'acheteur, y compris la résiliation.</span>
    </li>
  `
  : `
    <li>
      <strong>Confirmation</strong>
      <span>PayPal envoie l'email de confirmation du paiement.</span>
    </li>
    <li>
      <strong>Préparation</strong>
      <span>Votre box est préparée avec les informations confirmées dans PayPal.</span>
    </li>
    <li>
      <strong>Expédition</strong>
      <span>Vous recevez votre box à l'adresse indiquée lors du paiement.</span>
    </li>
  `;
