const form = document.querySelector("[data-admin-form]");
const tokenInput = document.querySelector("[data-admin-token]");
const rangeInput = document.querySelector("[data-admin-range]");
const statusTarget = document.querySelector("[data-admin-status]");
const dashboard = document.querySelector("[data-admin-dashboard]");
const cardsTarget = document.querySelector("[data-admin-cards]");
const productsTarget = document.querySelector("[data-admin-products]");
const pagesTarget = document.querySelector("[data-admin-pages]");
const funnelTarget = document.querySelector("[data-admin-funnel]");
const recentTarget = document.querySelector("[data-admin-recent]");
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

const renderMetricCard = (label, value, detail = "") => `
  <article class="admin-card">
    <span>${label}</span>
    <strong>${formatNumber(value)}</strong>
    ${detail ? `<small>${detail}</small>` : ""}
  </article>
`;

const renderList = (target, rows, emptyMessage, renderRow) => {
  if (!rows.length) {
    target.innerHTML = `<li class="admin-empty">${emptyMessage}</li>`;
    return;
  }

  target.innerHTML = rows.map(renderRow).join("");
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
    renderMetricCard("Pages vues", payload.totals.page_view, `${payload.range} derniers jours`),
    renderMetricCard("Ajouts panier", payload.totals.add_to_cart),
    renderMetricCard("Checkouts lancés", payload.totals.checkout_start),
    renderMetricCard("Confirmations", payload.totals.thank_you_view || payload.totals.paypal_approved),
  ].join("");

  funnelTarget.innerHTML = [
    renderMetricCard("Page → panier", `${payload.conversion.pageToCart}%`),
    renderMetricCard("Panier → checkout", `${payload.conversion.cartToCheckout}%`),
    renderMetricCard("Checkout → confirmation", `${payload.conversion.checkoutToConfirmation}%`),
  ].join("");

  renderList(productsTarget, payload.products, "Aucun ajout panier sur cette période.", (row) => `
    <li>
      <strong>${row.product}</strong>
      <span>${row.type}</span>
      <b>${formatNumber(row.total)}</b>
    </li>
  `);

  renderList(pagesTarget, payload.pages, "Aucune page vue sur cette période.", (row) => `
    <li>
      <strong>${row.path || "/"}</strong>
      <b>${formatNumber(row.total)}</b>
    </li>
  `);

  renderList(recentTarget, payload.recent, "Aucun événement récent.", (row) => `
    <li>
      <strong>${row.event}</strong>
      <span>${row.data.productName || row.data.productId || row.path || ""}</span>
      <time>${formatDate(row.created_at)}</time>
    </li>
  `);

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
