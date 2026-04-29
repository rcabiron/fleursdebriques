(function () {
  const endpoint = "/api/track";
  const sessionKey = "fleursDeBriquesAnalyticsSession";
  const enabled = window.location.protocol === "https:" || window.location.hostname === "127.0.0.1";

  const getSessionId = () => {
    try {
      const existing = sessionStorage.getItem(sessionKey);
      if (existing) return existing;

      const generated = crypto.randomUUID();
      sessionStorage.setItem(sessionKey, generated);
      return generated;
    } catch {
      return "session-unavailable";
    }
  };

  const cleanValue = (value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "number" || typeof value === "boolean") return value;
    return String(value).slice(0, 160);
  };

  const cleanPayload = (payload = {}) =>
    Object.fromEntries(
      Object.entries(payload)
        .map(([key, value]) => [key, cleanValue(value)])
        .filter(([, value]) => value !== undefined && value !== ""),
    );

  const track = (eventName, payload = {}) => {
    if (!enabled || !eventName) return;

    const body = JSON.stringify({
      event: String(eventName).slice(0, 80),
      path: window.location.pathname,
      page: document.title,
      sessionId: getSessionId(),
      data: cleanPayload(payload),
    });

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      if (sent) return;
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  };

  window.fdbTrack = track;

  window.addEventListener("load", () => {
    track("page_view", {
      referrer: document.referrer ? new URL(document.referrer, window.location.href).hostname : "direct",
    });
  });
})();
