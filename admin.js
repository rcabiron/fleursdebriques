const form = document.querySelector("[data-admin-form]");
const tokenInput = document.querySelector("[data-admin-token]");
const rangeInput = document.querySelector("[data-admin-range]");
const statusTarget = document.querySelector("[data-admin-status]");
const dashboard = document.querySelector("[data-admin-dashboard]");
const cardsTarget = document.querySelector("[data-admin-cards]");
const productsTarget = document.querySelector("[data-admin-products]");
const pagesTarget = document.querySelector("[data-admin-pages]");
const funnelTarget = document.querySelector("[data-admin-funnel]");
const conversionTarget = document.querySelector("[data-admin-conversion]");
const breakdownTarget = document.querySelector("[data-admin-breakdown]");
const recentTarget = document.querySelector("[data-admin-recent]");
const insightTarget = document.querySelector("[data-admin-insight]");
const refreshButton = document.querySelector("[data-admin-refresh]");
const logoutButton = document.querySelector("[data-admin-logout]");

const TOKEN_KEY = "fdbAnalyticsAdminToken";

const formatNumber = (value) => new Intl.NumberFormat("fr-FR").format(Number(value || 0));

const formatDate = (value) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const setStatus = (message, type = "info") => {
  statusTarget.textContent = message;
  statusTarget.dataset.status = type;
};

const getToken = () => tokenInput.value.trim() || sessionStorage.getItem(TOKEN_KEY) || "";

const formatPercent = (value) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(Number(value || 0))}%`;

const eventLabels = {
  page_view: "Page vue",
  open_plan_modal: "Choix abonnement ouvert",
  select_plan_duration: "Durée choisie",
  open_gift_box_modal: "Choix cadeau ouvert",
  select_gift_box: "Box cadeau choisie",
  add_to_cart: "Ajout panier",
  increase_quantity: "Quantité augmentée",
  decrease_quantity: "Quantité réduite",
  remove_from_cart: "Suppression panier",
  open_cart: "Panier ouvert",
  set_gift_mode: "Mode cadeau",
  replace_cart_prompt: "Remplacement proposé",
  replace_cart_confirm: "Remplacement confirmé",
  replace_cart_cancel: "Remplacement annulé",
  checkout_start: "Checkout lancé",
  paypal_render: "PayPal affiché",
  paypal_approved: "Paiement approuvé",
  paypal_error: "Erreur PayPal",
  contact_submit: "Contact envoyé",
  contact_success: "Contact reçu",
  contact_error: "Erreur contact",
  thank_you_view: "Page merci",
};

const typeLabels = {
  subscription: "Abonnements",
  "one-time": "Box à l'unité",
  true: "Cadeaux",
  false: "Sans cadeau",
  1: "Cadeaux",
  0: "Sans cadeau",
  "Non renseigné": "Non renseigné",
};

const renderMetricCard = (label, value, detail = "", tone = "") => `
  <article class="admin-card">
    <span>${label}</span>
    <strong>${detail === "%" ? formatPercent(value) : formatNumber(value)}</strong>
    ${detail ? `<small>${detail}</small>` : ""}
    ${tone ? `<em>${tone}</em>` : ""}
  </article>
`;

const getShare = (value, total) => (total ? Math.round((Number(value || 0) / total) * 1000) / 10 : 0);

const renderList = (target, rows, emptyMessage, renderRow) => {
  if (!rows.length) {
    target.innerHTML = `<li class="admin-empty">${emptyMessage}</li>`;
    return;
  }

  target.innerHTML = rows.map(renderRow).join("");
};

const renderFunnel = (payload) => {
  const max = Math.max(...payload.funnel.map((step) => Number(step.total || 0)), 1);
  funnelTarget.innerHTML = payload.funnel
    .map((step, index) => {
      const previous = index === 0 ? step.total : payload.funnel[index - 1].total;
      const rate = index === 0 ? 100 : getShare(step.total, previous);
      const width = Math.max((Number(step.total || 0) / max) * 100, step.total ? 12 : 3);
      return `
        <article class="funnel-step">
          <div>
            <span>${step.label}</span>
            <strong>${formatNumber(step.total)}</strong>
          </div>
          <div class="funnel-bar" aria-hidden="true">
            <i style="width:${width}%"></i>
          </div>
          <small>${index === 0 ? "Base de départ" : `${formatPercent(rate)} de l'étape précédente`}</small>
        </article>
      `;
    })
    .join("");
};

const renderBreakdown = (payload) => {
  const addTotal = payload.totals.add_to_cart || 0;
  const typeRows = payload.offerTypes.map((row) => ({
    label: typeLabels[row.type] || row.type,
    total: row.total,
    share: getShare(row.total, addTotal),
  }));
  const giftRows = payload.gifts.map((row) => ({
    label: typeLabels[row.is_gift] || "Non renseigné",
    total: row.total,
    share: getShare(row.total, addTotal),
  }));

  const rows = [...typeRows, ...giftRows];
  if (!rows.length) {
    breakdownTarget.innerHTML = `<p class="admin-empty">Pas encore assez d'ajouts panier pour analyser la répartition.</p>`;
    return;
  }

  breakdownTarget.innerHTML = rows
    .map(
      (row) => `
        <div class="breakdown-row">
          <span>${row.label}</span>
          <strong>${formatNumber(row.total)}</strong>
          <div aria-hidden="true"><i style="width:${Math.max(row.share, row.total ? 8 : 0)}%"></i></div>
          <small>${formatPercent(row.share)}</small>
        </div>
      `,
    )
    .join("");
};

const renderInsight = (payload) => {
  const totalEvents = Object.values(payload.totals).reduce((sum, value) => sum + Number(value || 0), 0);
  if (totalEvents < 20) {
    insightTarget.textContent =
      "Les données sont encore faibles. Les tendances deviendront plus fiables après quelques dizaines de visites et d'ajouts panier.";
    return;
  }

  const topProduct = payload.products[0]?.product;
  const checkoutRate = payload.conversion.cartToCheckout;
  insightTarget.textContent = topProduct
    ? `${topProduct} génère le plus d'ajouts panier sur cette période. Le passage panier vers checkout est à ${formatPercent(checkoutRate)}.`
    : `Le passage panier vers checkout est à ${formatPercent(checkoutRate)} sur cette période.`;
};

const loadStats = async () => {
  const token = getToken();
  if (!token) {
    setStatus("Entrez le code admin pour afficher les statistiques.", "info");
    return;
  }

  setStatus("Chargement des statistiques...", "info");

  const response = await fetch(`/api/analytics-summary?range=${rangeInput.value}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Impossible de charger les statistiques.");
  }

  sessionStorage.setItem(TOKEN_KEY, token);
  dashboard.hidden = false;
  cardsTarget.innerHTML = [
    renderMetricCard("Visites", payload.totals.page_view, `${payload.range} derniers jours`),
    renderMetricCard("Ajouts panier", payload.totals.add_to_cart, "", "Intention"),
    renderMetricCard("Checkouts", payload.totals.checkout_start, "", "Paiement lancé"),
    renderMetricCard("Confirmations", payload.totals.thank_you_view || payload.totals.paypal_approved, "", "Commandes"),
  ].join("");

  renderFunnel(payload);

  conversionTarget.innerHTML = [
    renderMetricCard("Visite → panier", payload.conversion.pageToCart, "%"),
    renderMetricCard("Panier → checkout", payload.conversion.cartToCheckout, "%"),
    renderMetricCard("Checkout → confirmation", payload.conversion.checkoutToConfirmation, "%"),
  ].join("");

  renderList(productsTarget, payload.products, "Aucun ajout panier sur cette période.", (row) => `
    <li>
      <strong>${row.product}</strong>
      <span>${typeLabels[row.type] || row.type} · ${formatPercent(getShare(row.total, payload.totals.add_to_cart))}</span>
      <b>${formatNumber(row.total)}</b>
    </li>
  `);

  renderBreakdown(payload);

  renderList(pagesTarget, payload.pages, "Aucune page vue sur cette période.", (row) => `
    <li>
      <strong>${row.path || "/"}</strong>
      <b>${formatNumber(row.total)}</b>
    </li>
  `);

  renderList(recentTarget, payload.recent, "Aucun événement récent.", (row) => `
    <li>
      <strong>${eventLabels[row.event] || row.event}</strong>
      <span>${row.data.productName || row.data.productId || row.path || ""}</span>
      <time>${formatDate(row.created_at)}</time>
    </li>
  `);

  renderInsight(payload);

  setStatus(`Statistiques mises à jour à ${formatDate(payload.generatedAt)}.`, "success");
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await loadStats();
  } catch (error) {
    dashboard.hidden = true;
    setStatus(error.message, "error");
  }
});

refreshButton?.addEventListener("click", async () => {
  try {
    await loadStats();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

logoutButton?.addEventListener("click", () => {
  sessionStorage.removeItem(TOKEN_KEY);
  tokenInput.value = "";
  dashboard.hidden = true;
  setStatus("Accès admin fermé sur cet appareil.", "info");
});

const savedToken = sessionStorage.getItem(TOKEN_KEY);
if (savedToken) {
  tokenInput.value = savedToken;
  loadStats().catch((error) => setStatus(error.message, "error"));
}
