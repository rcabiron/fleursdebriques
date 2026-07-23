const PLAN_DETAILS = {
  ESSENTIEL: { name: "L’Essentiel", price: 39.9, regularPrice: 49.9 },
  PREMIUM: { name: "Le Premium", price: 59.9, regularPrice: 69.9 },
};

const formatPrice = (value) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

const formatDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);

const formatDeliveryWindow = (date) => {
  const monthAndYear = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
  return `Du 10 au 15 ${monthAndYear}`;
};

const addMonths = (date, months) => {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), lastDay));
  return next;
};

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
const queryReference = params.get("subscription") || params.get("subscription_id") || "";
const queryPlanCode = (params.get("plan") || "").toUpperCase();
const queryShippingValue = Number(params.get("shipping"));
const queryShipping = queryShippingValue === 4.99 ? 4.99 : 0;
const storedCandidate = readStoredConfirmation();
const stored = !queryReference || queryReference === storedCandidate?.subscriptionId ? storedCandidate : null;
const reference = /^I-[A-Z0-9-]+$/i.test(queryReference)
  ? queryReference
  : /^I-[A-Z0-9-]+$/i.test(stored?.subscriptionId || "")
    ? stored.subscriptionId
    : "";

const storedCreationDate = stored?.createdAt ? new Date(stored.createdAt) : null;
const subscriptionDate = storedCreationDate && !Number.isNaN(storedCreationDate.getTime())
  ? storedCreationDate
  : new Date();
const firstDeliveryMonth = new Date(
  subscriptionDate.getFullYear(),
  subscriptionDate.getMonth() + (subscriptionDate.getDate() > 10 ? 1 : 0),
  10,
);

document.querySelectorAll("[data-timeline-charge-date]").forEach((element, index) => {
  const chargeDate = addMonths(subscriptionDate, index);
  element.textContent = index === 0 ? `Aujourd’hui · ${formatDate(chargeDate)}` : formatDate(chargeDate);
});

document.querySelectorAll("[data-timeline-delivery]").forEach((element, index) => {
  element.textContent = formatDeliveryWindow(addMonths(firstDeliveryMonth, index));
});

const plan = PLAN_DETAILS[stored?.planCode] || PLAN_DETAILS[queryPlanCode] || null;

if (plan) {
  const planName = stored?.planName || plan.name;
  const basePrice = Number(stored?.basePrice ?? plan.price);
  const regularPrice = Number(stored?.regularPrice ?? plan.regularPrice);
  const shipping = Number(stored?.shipping ?? queryShipping);
  const total = Number(stored?.total ?? basePrice + shipping);
  const regularTotal = regularPrice + shipping;

  if (planName) document.querySelector("[data-confirmation-plan]").textContent = planName;

  if (Number.isFinite(total) && Number.isFinite(regularTotal)) {
    document.querySelectorAll('[data-timeline-price="promo"]').forEach((element) => {
      element.textContent = `${formatPrice(total)} prélevés`;
    });
    document.querySelector('[data-timeline-price="regular"]').textContent = `${formatPrice(regularTotal)} / mois`;
  }
}

if (reference) document.querySelector("[data-confirmation-reference]").textContent = reference;

if (reference && plan) {
  const confirmedPlanCode = stored?.planCode || queryPlanCode;
  const confirmedBasePrice = Number(stored?.basePrice ?? plan.price);
  const confirmedShipping = Number(stored?.shipping ?? queryShipping);
  window.fdbAnalytics?.trackInternal("subscription_confirmed", {
    plan: confirmedPlanCode,
    value: confirmedBasePrice + confirmedShipping,
  });

  const subscribeEventKey = `fdbMetaSubscribe:${reference}`;
  let alreadyTracked = false;
  try {
    alreadyTracked = window.localStorage.getItem(subscribeEventKey) === "1";
  } catch (error) {
    alreadyTracked = false;
  }

  if (!alreadyTracked) {
    const tracked = window.fdbAnalytics?.track("Subscribe", {
      currency: "EUR",
      value: confirmedBasePrice + confirmedShipping,
      content_name: stored?.planName || plan.name,
      content_ids: [confirmedPlanCode],
      content_type: "product",
      predicted_ltv: (Number(stored?.regularPrice ?? plan.regularPrice) + confirmedShipping) * 6,
    });

    const rememberSubscribeEvent = () => {
      try {
        window.localStorage.setItem(subscribeEventKey, "1");
      } catch (error) {
        console.warn("Le suivi de confirmation n’a pas pu être mémorisé.", error);
      }
    };

    if (tracked) {
      rememberSubscribeEvent();
    } else if (window.fdbAnalytics?.getConsent() === null) {
      window.addEventListener("fdb:analytics-consent-granted", rememberSubscribeEvent, { once: true });
    }
  }
}
