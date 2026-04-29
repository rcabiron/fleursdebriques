const ALLOWED_EVENTS = new Set([
  "page_view",
  "open_plan_modal",
  "select_plan_duration",
  "open_gift_box_modal",
  "select_gift_box",
  "add_to_cart",
  "increase_quantity",
  "decrease_quantity",
  "remove_from_cart",
  "open_cart",
  "set_gift_mode",
  "replace_cart_prompt",
  "replace_cart_confirm",
  "replace_cart_cancel",
  "checkout_start",
  "paypal_render",
  "paypal_approved",
  "paypal_error",
  "contact_submit",
  "contact_success",
  "contact_error",
  "thank_you_view",
]);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

const sanitizeText = (value, maxLength = 160) => String(value || "").trim().slice(0, maxLength);

const sanitizeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const sanitizeData = (data = {}) => {
  const output = {};
  Object.entries(data).forEach(([key, value]) => {
    const cleanKey = sanitizeText(key, 40).replace(/[^\w-]/g, "");
    if (!cleanKey) return;

    if (typeof value === "number") {
      output[cleanKey] = sanitizeNumber(value);
      return;
    }

    if (typeof value === "boolean") {
      output[cleanKey] = value;
      return;
    }

    output[cleanKey] = sanitizeText(value);
  });

  return output;
};

export async function onRequestPost({ request, env }) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 6000) return json({ ok: false }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }

  const event = sanitizeText(body.event, 80);
  if (!ALLOWED_EVENTS.has(event)) {
    return json({ ok: true });
  }

  const record = {
    event,
    path: sanitizeText(body.path, 220),
    page: sanitizeText(body.page, 180),
    session_id: sanitizeText(body.sessionId, 80),
    data: sanitizeData(body.data),
    user_agent: sanitizeText(request.headers.get("user-agent"), 260),
    created_at: new Date().toISOString(),
  };

  console.log("FDB_ANALYTICS", JSON.stringify(record));

  if (env.ANALYTICS_DB) {
    await env.ANALYTICS_DB.prepare(
      `INSERT INTO analytics_events (event, path, page, session_id, data, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        record.event,
        record.path,
        record.page,
        record.session_id,
        JSON.stringify(record.data),
        record.user_agent,
        record.created_at,
      )
      .run();
  }

  return json({ ok: true });
}

export function onRequestGet() {
  return json({ message: "Méthode non autorisée." }, 405);
}
