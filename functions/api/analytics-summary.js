const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

const textEncoder = new TextEncoder();

const timingSafeEqual = async (left, right) => {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);
  if (leftBytes.length !== rightBytes.length) return false;

  const leftDigest = await crypto.subtle.digest("SHA-256", leftBytes);
  const rightDigest = await crypto.subtle.digest("SHA-256", rightBytes);
  const leftArray = new Uint8Array(leftDigest);
  const rightArray = new Uint8Array(rightDigest);

  let difference = 0;
  for (let index = 0; index < leftArray.length; index += 1) {
    difference |= leftArray[index] ^ rightArray[index];
  }

  return difference === 0;
};

const getToken = (request) => {
  const authorization = request.headers.get("authorization") || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  return "";
};

const getRange = (request) => {
  const url = new URL(request.url);
  const range = Number.parseInt(url.searchParams.get("range") || "30", 10);
  if (!Number.isFinite(range)) return 30;
  return Math.min(Math.max(range, 1), 90);
};

const getDateBoundary = (range) => {
  const date = new Date();
  date.setDate(date.getDate() - range);
  return date.toISOString();
};

const summarizeRows = (rows) =>
  Object.fromEntries(rows.map((row) => [row.event, Number(row.total || 0)]));

export async function onRequestGet({ request, env }) {
  if (!env.ANALYTICS_ADMIN_TOKEN) {
    return json({ message: "Accès admin non configuré." }, 500);
  }

  const token = getToken(request);
  if (!token || !(await timingSafeEqual(token, env.ANALYTICS_ADMIN_TOKEN))) {
    return json({ message: "Accès refusé." }, 401);
  }

  if (!env.ANALYTICS_DB) {
    return json({ message: "Base analytics non configurée." }, 500);
  }

  const range = getRange(request);
  const since = getDateBoundary(range);

  const [events, products, offerTypes, giftEvents, pages, daily, recent] = await Promise.all([
    env.ANALYTICS_DB.prepare(
      `SELECT event, COUNT(*) AS total
       FROM analytics_events
       WHERE created_at >= ?
       GROUP BY event
       ORDER BY total DESC`,
    )
      .bind(since)
      .all(),
    env.ANALYTICS_DB.prepare(
      `SELECT
         COALESCE(json_extract(data, '$.productName'), json_extract(data, '$.productId'), 'Non renseigné') AS product,
         COALESCE(json_extract(data, '$.productType'), 'Non renseigné') AS type,
         COUNT(*) AS total
       FROM analytics_events
       WHERE event = 'add_to_cart' AND created_at >= ?
       GROUP BY product, type
       ORDER BY total DESC
       LIMIT 8`,
    )
      .bind(since)
      .all(),
    env.ANALYTICS_DB.prepare(
      `SELECT
         COALESCE(json_extract(data, '$.productType'), 'Non renseigné') AS type,
         COUNT(*) AS total
       FROM analytics_events
       WHERE event = 'add_to_cart' AND created_at >= ?
       GROUP BY type
       ORDER BY total DESC`,
    )
      .bind(since)
      .all(),
    env.ANALYTICS_DB.prepare(
      `SELECT
         COALESCE(json_extract(data, '$.isGift'), 0) AS is_gift,
         COUNT(*) AS total
       FROM analytics_events
       WHERE event = 'add_to_cart' AND created_at >= ?
       GROUP BY is_gift
       ORDER BY is_gift DESC`,
    )
      .bind(since)
      .all(),
    env.ANALYTICS_DB.prepare(
      `SELECT path, COUNT(*) AS total
       FROM analytics_events
       WHERE event = 'page_view' AND created_at >= ?
       GROUP BY path
       ORDER BY total DESC
       LIMIT 8`,
    )
      .bind(since)
      .all(),
    env.ANALYTICS_DB.prepare(
      `SELECT substr(created_at, 1, 10) AS day, event, COUNT(*) AS total
       FROM analytics_events
       WHERE created_at >= ?
         AND event IN ('page_view', 'add_to_cart', 'checkout_start', 'thank_you_view')
       GROUP BY day, event
       ORDER BY day ASC`,
    )
      .bind(since)
      .all(),
    env.ANALYTICS_DB.prepare(
      `SELECT event, path, data, created_at
       FROM analytics_events
       ORDER BY created_at DESC
       LIMIT 20`,
    ).all(),
  ]);

  const totals = summarizeRows(events.results || []);
  const pageViews = totals.page_view || 0;
  const checkouts = totals.checkout_start || 0;
  const confirmations = totals.thank_you_view || totals.paypal_approved || 0;

  return json({
    range,
    totals,
    funnel: [
      { key: "page_view", label: "Visites", total: pageViews },
      { key: "add_to_cart", label: "Paniers", total: totals.add_to_cart || 0 },
      { key: "checkout_start", label: "Checkouts", total: checkouts },
      { key: "thank_you_view", label: "Confirmations", total: confirmations },
    ],
    conversion: {
      pageToCart: pageViews ? Math.round(((totals.add_to_cart || 0) / pageViews) * 1000) / 10 : 0,
      cartToCheckout: totals.add_to_cart ? Math.round((checkouts / totals.add_to_cart) * 1000) / 10 : 0,
      checkoutToConfirmation: checkouts ? Math.round((confirmations / checkouts) * 1000) / 10 : 0,
    },
    products: products.results || [],
    offerTypes: offerTypes.results || [],
    gifts: giftEvents.results || [],
    pages: pages.results || [],
    daily: daily.results || [],
    recent: (recent.results || []).map((row) => ({
      ...row,
      data: JSON.parse(row.data || "{}"),
    })),
    generatedAt: new Date().toISOString(),
  });
}

export function onRequestPost() {
  return json({ message: "Méthode non autorisée." }, 405);
}
