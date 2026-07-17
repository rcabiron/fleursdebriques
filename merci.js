const PLAN_DETAILS = {
  ESSENTIEL: { name: "L’Essentiel", price: 49.9 },
  PREMIUM: { name: "Le Premium", price: 69.9 },
};

const formatPrice = (value) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

const readStoredConfirmation = () => {
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      const stored = storage.getItem("fdbLastSubscription");
      if (stored) return JSON.parse(stored);
    } catch (error) {
      console.warn("Récapitulatif local indisponible", error);
    }
  }
  return null;
};

const params = new URLSearchParams(window.location.search);
const queryReference = params.get("subscription") || "";
const storedCandidate = readStoredConfirmation();
const stored = !queryReference || queryReference === storedCandidate?.subscriptionId ? storedCandidate : null;
const reference = /^I-[A-Z0-9-]+$/i.test(queryReference)
  ? queryReference
  : /^I-[A-Z0-9-]+$/i.test(stored?.subscriptionId || "")
    ? stored.subscriptionId
    : "";

if (stored) {
  const plan = PLAN_DETAILS[stored.planCode] || null;
  const planName = stored.planName || plan?.name;
  const basePrice = Number(stored.basePrice ?? plan?.price);
  const shipping = Number(stored.shipping || 0);
  const total = Number(stored.total ?? basePrice + shipping);

  if (planName) document.querySelector("[data-confirmation-plan]").textContent = planName;
  if (Number.isFinite(total)) document.querySelector("[data-confirmation-total]").textContent = `${formatPrice(total)} / mois`;

  const shippingLabel = document.querySelector("[data-confirmation-shipping]");
  shippingLabel.textContent = shipping > 0
    ? `Dont ${formatPrice(shipping)} de livraison en Europe`
    : "Livraison offerte en France";
}

if (reference) document.querySelector("[data-confirmation-reference]").textContent = reference;
