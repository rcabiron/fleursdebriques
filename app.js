const products = {
  "sub-classic": {
    name: "Jardin Classique",
    detail: "Dès 29,90€ / mois",
    price: 358.8,
  },
  "sub-signature": {
    name: "Jardin Signature",
    detail: "Dès 46,90€ / mois",
    price: 562.8,
  },
  "box-s": {
    name: "Petit Bouquet",
    detail: "19,90€ + 2,90€ de port",
    cadence: "Achat ponctuel",
    meta: "Sans abonnement, sans bonus surprise",
    price: 22.8,
  },
  "box-m": {
    name: "Bouquet Découverte",
    detail: "39,90€ + 2,90€ de port",
    cadence: "Achat ponctuel",
    meta: "Format proche du Classique, sans bonus",
    price: 42.8,
  },
  "box-xl": {
    name: "Grande Composition",
    detail: "59,90€ + 2,90€ de port",
    cadence: "Achat ponctuel",
    meta: "Grand set à offrir ou à exposer",
    price: 62.8,
  },
};

const THANK_YOU_STORAGE_KEY = "fleursDeBriquesLastOrder";
const CART_STORAGE_KEY = "fleursDeBriquesCart";

const PAYPAL_CONFIG = {
  clientId: "AVH9AEvVSjuXt_ckB7Pjm0qNzeS_NSTgGSQLsku8b-Xd2IbJvdJKmwb1x-eBe-5EFeSCxLX5v2qt7kSL",
  currency: "EUR",
  subscriptionPlanIds: {
    "sub-classic-1": "P-32X34523RT755773ANHYHALI",
    "sub-classic-3": "P-6YS262634J8791848NHYHBWI",
    "sub-classic-6": "P-6KC07465EM364180YNHYHCJY",
    "sub-classic-12": "P-6DA62783D9634780DNHYHCWQ",
    "sub-signature-1": "P-2LW74540ED5268102NHYHDGI",
    "sub-signature-3": "P-7679825743430362TNHYHDUY",
    "sub-signature-6": "P-66V94562YM574602CNHYHEDA",
    "sub-signature-12": "P-0RJ4507019062905FNHYHETA",
  },
};

const subscriptionPlans = {
  classic: {
    1: {
      id: "sub-classic-1",
      name: "Jardin Classique",
      detail: "Prélevé 34,90€ chaque mois, livraison incluse",
      price: 34.9,
      label: "34,90€ <small>/ mois</small>",
      note: "Prélevé 34,90€ chaque mois",
      badge: "Flex",
      durationLabel: "Mensuel",
    },
    3: {
      id: "sub-classic-3",
      name: "Jardin Classique",
      detail: "Prélevé 98,70€ tous les 3 mois, -6%",
      price: 98.7,
      label: "32,90€ <small>/ mois</small>",
      note: "Prélevé 98,70€ tous les 3 mois",
      badge: "-6%",
      durationLabel: "3 mois",
    },
    6: {
      id: "sub-classic-6",
      name: "Jardin Classique",
      detail: "Prélevé 191,40€ deux fois par an, -9%",
      price: 191.4,
      label: "31,90€ <small>/ mois</small>",
      note: "Prélevé 191,40€ deux fois par an",
      badge: "-9%",
      durationLabel: "6 mois",
    },
    12: {
      id: "sub-classic-12",
      name: "Jardin Classique",
      detail: "Prélevé 358,80€ une fois par an, -14%",
      price: 358.8,
      label: "29,90€ <small>/ mois</small>",
      note: "Prélevé 358,80€ une fois par an",
      badge: "-14%",
      durationLabel: "1 an",
    },
  },
  signature: {
    1: {
      id: "sub-signature-1",
      name: "Jardin Signature",
      detail: "Prélevé 54,90€ chaque mois, livraison incluse",
      price: 54.9,
      label: "54,90€ <small>/ mois</small>",
      note: "Prélevé 54,90€ chaque mois",
      badge: "Flex",
      durationLabel: "Mensuel",
    },
    3: {
      id: "sub-signature-3",
      name: "Jardin Signature",
      detail: "Prélevé 155,70€ tous les 3 mois, -5%",
      price: 155.7,
      label: "51,90€ <small>/ mois</small>",
      note: "Prélevé 155,70€ tous les 3 mois",
      badge: "-5%",
      durationLabel: "3 mois",
    },
    6: {
      id: "sub-signature-6",
      name: "Jardin Signature",
      detail: "Prélevé 299,40€ deux fois par an, -9%",
      price: 299.4,
      label: "49,90€ <small>/ mois</small>",
      note: "Prélevé 299,40€ deux fois par an",
      badge: "-9%",
      durationLabel: "6 mois",
    },
    12: {
      id: "sub-signature-12",
      name: "Jardin Signature",
      detail: "Prélevé 562,80€ une fois par an, -15%",
      price: 562.8,
      label: "46,90€ <small>/ mois</small>",
      note: "Prélevé 562,80€ une fois par an",
      badge: "-15%",
      durationLabel: "1 an",
    },
  },
};

const subscriptionCopy = {
  classic: {
    title: "Jardin Classique",
    intro: "Un modèle surprise chaque mois, avec notice papier, livraison incluse et cadeau bonus dans la première box.",
  },
  signature: {
    title: "Jardin Signature",
    intro: "Des modèles plus travaillés, plus imposants, parfois plusieurs sets, avec des bonus plus fréquents.",
  },
};

const planDurations = [1, 3, 6, 12];

const planHelp = {
  1: "Plus flexible, sans avance.",
  3: "Bon équilibre: prélevé tous les 3 mois, box envoyée chaque mois.",
  6: "Deux prélèvements par an, prix mensuel réduit.",
  12: "Meilleur prix: un prélèvement annuel, une box chaque mois.",
};

const selectedPlans = {
  classic: 1,
  signature: 1,
};

const cart = new Map();

const drawer = document.querySelector("[data-cart-drawer]");
const cartItems = document.querySelector("[data-cart-items]");
const cartEmpty = document.querySelector("[data-cart-empty]");
const cartCount = document.querySelector("[data-cart-count]");
const cartTotal = document.querySelector("[data-cart-total]");
const cartNote = document.querySelector("[data-cart-note]");
const giftToggle = document.querySelector("[data-gift-toggle]");
const giftDetails = document.querySelector("[data-gift-details]");
const checkoutSummary = document.querySelector("[data-checkout-summary]");
const paypalButtons = document.querySelector("[data-paypal-buttons]");
const paypalStatus = document.querySelector("[data-paypal-status]");
const modal = document.querySelector("[data-modal]");
const planModal = document.querySelector("[data-plan-modal]");
const replaceModal = document.querySelector("[data-replace-modal]");
const replaceCurrent = document.querySelector("[data-replace-current]");
const replaceNext = document.querySelector("[data-replace-next]");
const replaceCurrentType = document.querySelector("[data-replace-current-type]");
const replaceNextType = document.querySelector("[data-replace-next-type]");
const planEyebrow = document.querySelector("[data-plan-eyebrow]");
const planTitle = document.querySelector("[data-plan-title]");
const planIntro = document.querySelector("[data-plan-intro]");
const planOptions = document.querySelector("[data-plan-options]");
const planPrice = document.querySelector("[data-plan-price-modal]");
const planNote = document.querySelector("[data-plan-note-modal]");
const planShippingNote = document.querySelector("[data-plan-shipping-note]");
const planMonthlyShipping = document.querySelector("[data-plan-monthly-shipping]");
const toast = document.querySelector("[data-toast]");
const siteHeader = document.querySelector(".site-header");

let activePlanType = "classic";
let paypalSdkIntent = "";
let planModalGiftMode = false;
let activeBoxGiftId = "box-m";
let pendingCartReplacement = null;
let checkoutReference = "";

const getHeaderOffset = () => (siteHeader?.offsetHeight || 0) + 22;

const scrollToHash = (hash, { updateHistory = true, behavior = "smooth" } = {}) => {
  const target = hash === "#top" ? document.body : document.querySelector(hash);
  if (!target) return false;

  const top = hash === "#top" ? 0 : target.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
  window.scrollTo({ top: Math.max(0, top), behavior });

  if (updateHistory) {
    history.pushState(null, "", hash);
  }

  return true;
};

const formatPrice = (value) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const createOrderReference = () => {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `FDB-${date}-${randomPart}`;
};

const getCheckoutReference = () => {
  if (!checkoutReference) {
    checkoutReference = createOrderReference();
  }

  return checkoutReference;
};

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
};

const getCartItemType = (item) => (item.type === "subscription" || item.id?.startsWith("sub-") ? "Abonnement" : "Sans abonnement");

const isSubscriptionItem = (item) => item.type === "subscription" || item.id?.startsWith("sub-");

const normalizeQuantity = (quantity) => {
  const parsed = Number.parseInt(quantity, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), 99);
};

const getLineQuantity = (item) => (isSubscriptionItem(item) ? 1 : normalizeQuantity(item.quantity));

const getLineTotal = (item) => item.price * getLineQuantity(item);

const hasSubscriptionInCart = () => [...cart.values()].some((item) => isSubscriptionItem(item));

const getReplacementLabel = () => {
  const items = [...cart.values()];
  if (items.length === 0) return "";
  if (items.length === 1) return items[0].name;
  const oneTimeCount = items.filter((item) => !isSubscriptionItem(item)).length;
  if (oneTimeCount === items.length) return `${oneTimeCount} box à l'unité`;
  return `${items.length} offres`;
};

const saveCartState = () => {
  try {
    if (cart.size === 0) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items: [...cart.values()],
        isGift: giftToggle?.checked || false,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Le panier reste fonctionnel même si le stockage local est indisponible.
  }
};

const restoreCartState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "null");
    if (!saved || !Array.isArray(saved.items)) return;

    cart.clear();
    saved.items.forEach((item) => {
      if (!item?.id || typeof item.price !== "number") return;
      const type = item.type || (item.id.startsWith("sub-") ? "subscription" : "one-time");
      cart.set(item.id, {
        ...item,
        type,
        quantity: type === "subscription" ? 1 : normalizeQuantity(item.quantity),
      });
    });

    if (giftToggle) {
      giftToggle.checked = Boolean(saved.isGift);
      giftDetails?.classList.toggle("is-visible", giftToggle.checked);
    }
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
  }
};

const enableGiftMode = () => {
  if (!giftToggle) return;
  giftToggle.checked = true;
  giftDetails?.classList.add("is-visible");
  renderCart();
};

const celebrateCartAdd = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.querySelector(".cart-burst")?.remove();

  const burst = document.createElement("div");
  burst.className = "cart-burst";
  burst.setAttribute("aria-hidden", "true");

  const pieces = [
    ["flower", "#ee5aa8", "-72px", "-92px", "-28deg", "0ms", "15px"],
    ["flower", "#ffed4a", "-34px", "-118px", "22deg", "25ms", "14px"],
    ["flower", "#6fb6d9", "42px", "-106px", "34deg", "50ms", "13px"],
    ["flower", "#ee5a3f", "74px", "-70px", "-38deg", "75ms", "14px"],
    ["flower", "#8bd46a", "-94px", "-42px", "46deg", "100ms", "12px"],
    ["flower", "#123b66", "28px", "-46px", "58deg", "125ms", "13px"],
  ];

  pieces.forEach(([type, color, x, y, rotation, delay, size]) => {
    const piece = document.createElement("span");
    piece.className = `burst-piece is-${type}`;
    piece.style.setProperty("--color", color);
    piece.style.setProperty("--x", x);
    piece.style.setProperty("--y", y);
    piece.style.setProperty("--rot", rotation);
    piece.style.setProperty("--delay", delay);
    piece.style.setProperty("--size", size);
    burst.append(piece);
  });

  document.body.append(burst);
  window.setTimeout(() => burst.remove(), 1200);
};

const getTotals = () => {
  let total = 0;
  let quantity = 0;

  cart.forEach((item) => {
    const lineQuantity = getLineQuantity(item);
    quantity += lineQuantity;
    total += item.price * lineQuantity;
  });

  return { quantity, total };
};

const renderCart = () => {
  cartItems.innerHTML = "";

  cart.forEach((item, id) => {
    const quantity = getLineQuantity(item);
    const lineTotal = getLineTotal(item);
    const canChangeQuantity = !isSubscriptionItem(item);
    const line = document.createElement("article");
    line.className = "cart-line";
    line.innerHTML = `
      <div class="cart-line-main">
        <div class="cart-line-top">
          <h3>${item.name}</h3>
          <strong>${formatPrice(lineTotal)}</strong>
        </div>
        <p>${item.detail}</p>
        ${canChangeQuantity && quantity > 1 ? `<small class="cart-meta">${quantity} × ${formatPrice(item.price)} l'unité</small>` : ""}
        ${item.cadence ? `<small class="cart-meta">${item.cadence}</small>` : ""}
      </div>
      <div class="cart-line-actions">
        ${
          canChangeQuantity
            ? `<div class="quantity-control" aria-label="Quantité ${item.name}">
                <button type="button" data-qty-decrease="${id}" aria-label="Réduire la quantité de ${item.name}">−</button>
                <span>${quantity}</span>
                <button type="button" data-qty-increase="${id}" aria-label="Augmenter la quantité de ${item.name}">+</button>
              </div>`
            : ""
        }
        <button class="remove-item" type="button" data-remove="${id}" aria-label="Supprimer ${item.name} du panier">Supprimer</button>
      </div>
    `;
    cartItems.append(line);
  });

  const { quantity, total } = getTotals();
  const hasSubscription = hasSubscriptionInCart();
  const isGift = giftToggle?.checked;
  cartCount.textContent = quantity;
  cartTotal.textContent = formatPrice(total);
  if (isGift) {
    cartNote.textContent = hasSubscription
      ? "Cadeau: indiquez l'adresse du destinataire lors du paiement."
      : "Cadeau: indiquez l'adresse du destinataire lors du paiement. Vous pouvez offrir plusieurs box à l'unité.";
  } else {
    cartNote.textContent = hasSubscription
      ? "Les box restent envoyées chaque mois selon le rythme indiqué. Les achats ponctuels se commandent séparément."
      : "Vous pouvez ajouter plusieurs box à l'unité. Les frais de port sont inclus dans le total affiché.";
  }
  cartEmpty.classList.toggle("is-visible", quantity === 0);
  saveCartState();
};

const getCartPaymentMode = () => {
  const items = [...cart.entries()];
  const subscriptions = items.filter(([id]) => id.startsWith("sub-"));
  const oneTimeItems = items.filter(([id]) => !id.startsWith("sub-"));

  if (subscriptions.length && oneTimeItems.length) return "mixed";
  if (subscriptions.length > 1) return "subscription-multiple";
  if (subscriptions.length === 1) return "subscription";
  if (oneTimeItems.length) return "one-time";
  return "empty";
};

const loadPayPalSdk = (intent) =>
  new Promise((resolve, reject) => {
    if (!PAYPAL_CONFIG.clientId) {
      reject(new Error("Client ID PayPal manquant"));
      return;
    }

    if (window.paypal && paypalSdkIntent === intent) {
      resolve(window.paypal);
      return;
    }

    document.querySelector("[data-paypal-sdk]")?.remove();
    delete window.paypal;
    paypalSdkIntent = intent;

    const params = new URLSearchParams({
      "client-id": PAYPAL_CONFIG.clientId,
      currency: PAYPAL_CONFIG.currency,
      components: "buttons",
    });

    if (intent === "subscription") {
      params.set("vault", "true");
      params.set("intent", "subscription");
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.dataset.paypalSdk = intent;
    script.onload = () => resolve(window.paypal);
    script.onerror = () => reject(new Error("Impossible de charger PayPal"));
    document.head.append(script);
  });

const saveOrderSnapshot = ({ paymentType, reference, orderReference }) => {
  const { total } = getTotals();
  const mode = getCartPaymentMode();
  const items = [...cart.values()].map((item) => ({
    name: item.name,
    detail: item.detail,
    cadence: item.cadence,
    meta: item.meta,
    quantity: getLineQuantity(item),
    price: item.price,
  }));

  localStorage.setItem(
    THANK_YOU_STORAGE_KEY,
    JSON.stringify({
      paymentType,
      mode,
      reference,
      orderReference,
      total,
      items,
      isGift: giftToggle?.checked || false,
      createdAt: new Date().toISOString(),
    }),
  );
};

const completePaidOrder = ({ paymentType, reference, orderReference }) => {
  saveOrderSnapshot({ paymentType, reference, orderReference });
  cart.clear();
  checkoutReference = "";
  localStorage.removeItem(CART_STORAGE_KEY);
  renderCart();
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  window.location.href = `merci.html?type=${encodeURIComponent(paymentType)}&ref=${encodeURIComponent(reference)}&order=${encodeURIComponent(orderReference)}`;
};

const renderPayPalArea = () => {
  if (!paypalButtons || !paypalStatus) return;

  paypalButtons.innerHTML = "";
  paypalButtons.classList.remove("is-loading");

  const mode = getCartPaymentMode();
  const { total } = getTotals();

  if (mode === "empty") {
    paypalStatus.textContent = "Ajoutez une offre au panier pour afficher le paiement.";
    return;
  }

  if (mode === "mixed") {
    paypalStatus.textContent =
      "PayPal ne peut pas valider un abonnement et une box à l'unité dans le même paiement. Gardez une seule formule dans le panier.";
    return;
  }

  if (mode === "subscription-multiple") {
    paypalStatus.textContent = "Gardez un seul abonnement dans le panier pour finaliser avec PayPal.";
    return;
  }

  if (!PAYPAL_CONFIG.clientId) {
    paypalStatus.textContent =
      "Configuration à compléter: ajoutez le Client ID PayPal dans PAYPAL_CONFIG.clientId, puis les boutons apparaîtront ici.";
    return;
  }

  paypalButtons.classList.add("is-loading");

  if (mode === "subscription") {
    const [cartId, item] = [...cart.entries()][0];
    const planId = PAYPAL_CONFIG.subscriptionPlanIds[cartId];
    const orderReference = getCheckoutReference();

    if (!planId) {
      paypalButtons.classList.remove("is-loading");
      paypalStatus.textContent = `Configuration à compléter: ajoutez l'ID du plan PayPal pour ${item.name} (${item.detail}).`;
      return;
    }

    paypalStatus.textContent = "Le paiement PayPal ouvrira l'abonnement choisi. Les box seront envoyées chaque mois.";
    loadPayPalSdk("subscription")
      .then((paypal) => {
        paypalButtons.classList.remove("is-loading");
        paypal
          .Buttons({
            style: { layout: "vertical", shape: "pill", label: "subscribe" },
            createSubscription: (data, actions) =>
              actions.subscription.create({
                plan_id: planId,
                custom_id: orderReference,
              }),
            onApprove: (data) =>
              completePaidOrder({
                paymentType: "subscription",
                reference: data.subscriptionID,
                orderReference,
              }),
            onError: () => showToast("Le paiement PayPal n'a pas pu être lancé"),
          })
          .render(paypalButtons);
      })
      .catch((error) => {
        paypalButtons.classList.remove("is-loading");
        paypalStatus.textContent = error.message;
      });
    return;
  }

  const oneTimeItems = [...cart.values()].map((item) => ({
    name: item.name,
    quantity: String(getLineQuantity(item)),
    unit_amount: {
      currency_code: PAYPAL_CONFIG.currency,
      value: item.price.toFixed(2),
    },
  }));
  const itemTotal = oneTimeItems.reduce(
    (sum, item) => sum + Number(item.unit_amount.value) * Number(item.quantity),
    0,
  );
  const oneTimeSummary = oneTimeItems.map((item) => `${item.quantity} × ${item.name}`).join(", ");
  const orderReference = getCheckoutReference();

  paypalStatus.textContent = "Payez vos box à l'unité avec PayPal ou carte bancaire.";
  loadPayPalSdk("capture")
    .then((paypal) => {
      paypalButtons.classList.remove("is-loading");
      paypal
        .Buttons({
          style: { layout: "vertical", shape: "pill", label: "pay" },
          createOrder: (data, actions) =>
            actions.order.create({
              purchase_units: [
                {
                  description: oneTimeSummary || "Fleurs de Briques - Box à l'unité",
                  custom_id: orderReference,
                  items: oneTimeItems,
                  amount: {
                    currency_code: PAYPAL_CONFIG.currency,
                    value: total.toFixed(2),
                    breakdown: {
                      item_total: {
                        currency_code: PAYPAL_CONFIG.currency,
                        value: itemTotal.toFixed(2),
                      },
                    },
                  },
                },
              ],
            }),
          onApprove: (data, actions) =>
            actions.order.capture().then((details) =>
              completePaidOrder({
                paymentType: "one-time",
                reference: details.id || data.orderID,
                orderReference,
              }),
            ),
          onError: () => showToast("Le paiement PayPal n'a pas pu être lancé"),
        })
        .render(paypalButtons);
    })
    .catch((error) => {
      paypalButtons.classList.remove("is-loading");
      paypalStatus.textContent = error.message;
    });
};

const renderCheckoutSummary = () => {
  const { quantity, total } = getTotals();

  if (quantity === 0) {
    checkoutSummary.innerHTML = "";
    return;
  }

  const lines = [...cart.values()]
    .map(
      (item) => {
        const quantity = getLineQuantity(item);
        const lineTotal = getLineTotal(item);
        return `
        <li>
          <span>${quantity > 1 ? `${quantity} × ` : ""}${item.name}</span>
          <strong>${formatPrice(lineTotal)}</strong>
          <small>${item.detail}</small>
          ${quantity > 1 ? `<small>${formatPrice(item.price)} l'unité</small>` : ""}
          ${item.cadence ? `<small>${item.cadence}</small>` : ""}
          ${item.meta ? `<small>${item.meta}</small>` : ""}
        </li>
      `;
      },
    )
    .join("");
  const paymentMode = getCartPaymentMode();
  const isGift = giftToggle?.checked;
  const orderReference = getCheckoutReference();
  const checkoutNote =
    isGift
      ? "Cadeau: l'adresse du destinataire sera confirmée dans PayPal."
      : paymentMode === "subscription"
      ? "Le montant correspond au rythme de prélèvement choisi. Les box restent envoyées chaque mois."
      : "L'adresse et les informations de paiement seront confirmées dans PayPal.";

  checkoutSummary.innerHTML = `
    <strong>Récapitulatif</strong>
    <ul>${lines}</ul>
    <p>
      <span>Référence commande</span>
      <strong>${orderReference}</strong>
    </p>
    <p>
      <span>Total à régler maintenant</span>
      <strong>${formatPrice(total)}</strong>
    </p>
    <small>${checkoutNote}</small>
  `;
};

const commitCartItem = (item, message) => {
  cart.clear();
  cart.set(item.id, {
    ...item,
    quantity: isSubscriptionItem(item) ? 1 : normalizeQuantity(item.quantity),
  });
  checkoutReference = "";

  renderCart();
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  celebrateCartAdd();
  showToast(message || `${item.name} ajouté au panier`);
};

const closeReplacementModal = () => {
  pendingCartReplacement = null;
  replaceModal?.classList.remove("is-open");
  replaceModal?.setAttribute("aria-hidden", "true");
};

const requestCartReplacement = (item) => {
  const current = [...cart.values()][0];
  if (!current || cart.has(item.id)) {
    commitCartItem(item, cart.has(item.id) ? `${item.name} est déjà dans votre panier` : undefined);
    return;
  }

  if (!replaceModal) {
    commitCartItem(item, `${item.name} remplace l'offre précédente`);
    return;
  }

  pendingCartReplacement = { item };
  if (replaceCurrent) replaceCurrent.textContent = getReplacementLabel();
  if (replaceNext) replaceNext.textContent = item.name;
  if (replaceCurrentType) replaceCurrentType.textContent = getCartItemType(current);
  if (replaceNextType) replaceNextType.textContent = getCartItemType(item);
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  replaceModal?.classList.add("is-open");
  replaceModal?.setAttribute("aria-hidden", "false");
};

const addToCart = (id) => {
  const product = products[id];
  if (!product) return;

  const item = {
    id,
    ...product,
    type: "one-time",
    quantity: 1,
  };

  if (hasSubscriptionInCart()) {
    requestCartReplacement(item);
    return;
  }

  const existing = cart.get(id);
  checkoutReference = "";

  if (existing) {
    cart.set(id, {
      ...existing,
      quantity: normalizeQuantity(normalizeQuantity(existing.quantity) + 1),
    });
    renderCart();
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    celebrateCartAdd();
    showToast(`${product.name} ajouté en quantité ${cart.get(id).quantity}`);
    return;
  }

  cart.set(id, item);
  renderCart();
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  celebrateCartAdd();
  showToast(`${product.name} ajouté au panier`);
};

const addPlanToCart = (type) => {
  const duration = selectedPlans[type];
  const plan = subscriptionPlans[type]?.[duration];
  if (!plan) return;

  requestCartReplacement({
    id: plan.id,
    name: plan.name,
    detail: plan.note,
    cadence: "1 box envoyée chaque mois",
    meta: planHelp[duration],
    price: plan.price,
    type: "subscription",
    quantity: 1,
  });
};

const syncPlanModal = () => {
  if (activePlanType === "gift-box") {
    const product = products[activeBoxGiftId];
    if (!product) return;
    planOptions.querySelectorAll("[data-gift-box-choice]").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.giftBoxChoice === activeBoxGiftId);
    });
    planPrice.innerHTML = formatPrice(product.price);
    planNote.textContent = `${product.detail}. ${product.cadence}.`;
    planShippingNote.classList.add("is-hidden");
    planMonthlyShipping.classList.add("is-hidden");
    return;
  }

  const plan = subscriptionPlans[activePlanType]?.[selectedPlans[activePlanType]];
  if (!plan) return;
  const needsShippingClarification = selectedPlans[activePlanType] !== 1;
  planPrice.innerHTML = plan.label;
  planNote.textContent = plan.note;
  planShippingNote.classList.toggle("is-hidden", !needsShippingClarification);
  planMonthlyShipping.classList.toggle("is-hidden", !needsShippingClarification);
  planOptions.querySelectorAll("[data-plan]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.plan === `${activePlanType}-${selectedPlans[activePlanType]}`);
  });
};

const openPlanModal = (type, options = {}) => {
  activePlanType = type;
  planModalGiftMode = Boolean(options.giftMode);
  planOptions.classList.remove("is-box-choice");
  if (planEyebrow) planEyebrow.textContent = planModalGiftMode ? "Abonnement cadeau" : "Abonnement";
  const copy = subscriptionCopy[type];
  if (!copy) return;
  selectedPlans[type] = options.duration || 1;

  planTitle.textContent = copy.title;
  planIntro.textContent = copy.intro;
  planOptions.innerHTML = planDurations
    .map((duration) => {
      const plan = subscriptionPlans[type][duration];
      return `
        <button type="button" data-plan="${type}-${duration}">
          ${plan.durationLabel}
          <span>${planModalGiftMode && duration === 3 ? `Recommandé · ${plan.badge}` : plan.badge}</span>
          <small>${duration === 1 ? "Plus flexible" : "Box chaque mois"}</small>
        </button>
      `;
    })
    .join("");

  syncPlanModal();
  planModal.classList.add("is-open");
  planModal.setAttribute("aria-hidden", "false");
};

const openGiftBoxModal = () => {
  activePlanType = "gift-box";
  activeBoxGiftId = "box-m";
  planOptions.classList.add("is-box-choice");
  if (planEyebrow) planEyebrow.textContent = "Cadeau à l'unité";
  planTitle.textContent = "Choisir une box";
  planIntro.textContent = "Sélectionnez la taille de box à offrir. L'adresse du destinataire sera confirmée dans PayPal.";
  planOptions.innerHTML = ["box-s", "box-m", "box-xl"]
    .map((id) => {
      const product = products[id];
      return `
        <button type="button" data-gift-box-choice="${id}">
          ${product.name}
          <span>${product.detail}</span>
          <small>${product.meta}</small>
        </button>
      `;
    })
    .join("");

  syncPlanModal();
  planModal.classList.add("is-open");
  planModal.setAttribute("aria-hidden", "false");
};

const closePlanModal = () => {
  planModal.classList.remove("is-open");
  planModal.setAttribute("aria-hidden", "true");
  planModalGiftMode = false;
  activePlanType = "classic";
  planOptions.classList.remove("is-box-choice");
};

const setTimelineStep = (step) => {
  document.querySelectorAll("[data-timeline-step]").forEach((item) => {
    item.classList.toggle("is-active", Number(item.dataset.timelineStep) === step);
  });
  document.querySelectorAll("[data-timeline-item]").forEach((item) => {
    item.classList.toggle("is-active", Number(item.dataset.timelineItem) === step);
  });
};

document.addEventListener("click", (event) => {
  const anchorLink = event.target.closest('a[href^="#"]');
  const addButton = event.target.closest("[data-add]");
  const addPlanButton = event.target.closest("[data-add-plan]");
  const openPlanButton = event.target.closest("[data-open-plan]");
  const giftPlanButton = event.target.closest("[data-gift-plan]");
  const giftBoxButton = event.target.closest("[data-gift-box]");
  const giftBoxPanelButton = event.target.closest("[data-gift-box-panel]");
  const giftBoxChoiceButton = event.target.closest("[data-gift-box-choice]");
  const planButton = event.target.closest("[data-plan]");
  const timelineButton = event.target.closest("[data-timeline-step]");
  const timelineItem = event.target.closest("[data-timeline-item]");
  const removeButton = event.target.closest("[data-remove]");
  const quantityDecreaseButton = event.target.closest("[data-qty-decrease]");
  const quantityIncreaseButton = event.target.closest("[data-qty-increase]");
  const replaceCancelButton = event.target.closest("[data-replace-cancel]");
  const replaceConfirmButton = event.target.closest("[data-replace-confirm]");

  if (anchorLink) {
    const hash = anchorLink.getAttribute("href");
    if (scrollToHash(hash)) {
      event.preventDefault();
    }
  }

  if (openPlanButton) {
    openPlanModal(openPlanButton.dataset.openPlan);
  }

  if (giftPlanButton) {
    enableGiftMode();
    openPlanModal(giftPlanButton.dataset.giftPlan, { giftMode: true, duration: 3 });
  }

  if (giftBoxPanelButton) {
    enableGiftMode();
    openGiftBoxModal();
  }

  if (giftBoxButton) {
    enableGiftMode();
    addToCart(giftBoxButton.dataset.giftBox);
  }

  if (giftBoxChoiceButton) {
    activeBoxGiftId = giftBoxChoiceButton.dataset.giftBoxChoice;
    syncPlanModal();
  }

  if (timelineButton) {
    setTimelineStep(Number(timelineButton.dataset.timelineStep));
  }

  if (timelineItem) {
    setTimelineStep(Number(timelineItem.dataset.timelineItem));
  }

  if (planButton) {
    const [type, duration] = planButton.dataset.plan.split("-");
    selectedPlans[type] = Number(duration);

    const group = planButton.closest("[data-billing]");
    group?.querySelectorAll("[data-plan]").forEach((button) => {
      button.classList.toggle("is-selected", button === planButton);
    });

    const priceTarget = document.querySelector(`[data-plan-price="${type}"]`);
    const noteTarget = document.querySelector(`[data-plan-note="${type}"]`);
    const plan = subscriptionPlans[type][duration];
    if (priceTarget) priceTarget.innerHTML = plan.label;
    if (noteTarget) noteTarget.textContent = `${plan.note}. Box envoyée chaque mois.`;
    if (type === activePlanType) syncPlanModal();
  }

  if (addPlanButton) {
    addPlanToCart(addPlanButton.dataset.addPlan);
  }

  if (event.target.closest("[data-confirm-plan]")) {
    if (activePlanType === "gift-box") {
      enableGiftMode();
      addToCart(activeBoxGiftId);
    } else {
      addPlanToCart(activePlanType);
    }
    closePlanModal();
  }

  if (addButton) {
    addToCart(addButton.dataset.add);
  }

  if (removeButton) {
    cart.delete(removeButton.dataset.remove);
    checkoutReference = "";
  }

  if (quantityDecreaseButton) {
    const item = cart.get(quantityDecreaseButton.dataset.qtyDecrease);
    if (item && !isSubscriptionItem(item)) {
      item.quantity = normalizeQuantity(item.quantity) > 1 ? normalizeQuantity(item.quantity) - 1 : 1;
      checkoutReference = "";
    }
  }

  if (quantityIncreaseButton) {
    const item = cart.get(quantityIncreaseButton.dataset.qtyIncrease);
    if (item && !isSubscriptionItem(item)) {
      item.quantity = normalizeQuantity(normalizeQuantity(item.quantity) + 1);
      checkoutReference = "";
    }
  }

  if (removeButton || quantityDecreaseButton || quantityIncreaseButton) {
    renderCart();
  }

  if (replaceCancelButton) {
    closeReplacementModal();
  }

  if (replaceConfirmButton && pendingCartReplacement) {
    const { item } = pendingCartReplacement;
    commitCartItem(item, `${item.name} remplace l'offre précédente`);
    closeReplacementModal();
  }
});

document.querySelector("[data-cart-open]").addEventListener("click", () => {
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
});

document.querySelector("[data-cart-close]").addEventListener("click", () => {
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
});

giftToggle?.addEventListener("change", () => {
  giftDetails?.classList.toggle("is-visible", giftToggle.checked);
  renderCart();
});

drawer.addEventListener("click", (event) => {
  if (event.target === drawer) {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
  }
});

document.querySelector("[data-checkout]").addEventListener("click", () => {
  if (getTotals().quantity === 0) {
    showToast("Ajoutez d'abord une offre au panier");
    return;
  }

  renderCheckoutSummary();
  renderPayPalArea();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
});

document.querySelector("[data-modal-close]").addEventListener("click", () => {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
});

document.querySelector("[data-plan-close]").addEventListener("click", closePlanModal);

planModal.addEventListener("click", (event) => {
  if (event.target === planModal) {
    closePlanModal();
  }
});

replaceModal?.addEventListener("click", (event) => {
  if (event.target === replaceModal) {
    closeReplacementModal();
  }
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    closePlanModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    closePlanModal();
    closeReplacementModal();
  }
});

restoreCartState();
renderCart();
setTimelineStep(0);

window.addEventListener("load", () => {
  if (window.location.hash) {
    window.setTimeout(() => {
      scrollToHash(window.location.hash, { updateHistory: false, behavior: "auto" });
    }, 80);
  }
});

window.addEventListener("hashchange", () => {
  if (window.location.hash) {
    window.setTimeout(() => {
      scrollToHash(window.location.hash, { updateHistory: false, behavior: "auto" });
    }, 80);
  }
});
