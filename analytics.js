(function () {
  "use strict";

  const META_PIXEL_ID = "209354772094276";
  const CONSENT_KEY = "fdbCookieConsentV1";
  const CONSENT_DURATION = 1000 * 60 * 60 * 24 * 183;
  const pendingEvents = [];
  let pixelInitialized = false;

  const readConsent = () => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(CONSENT_KEY) || "null");
      if (!stored || !["accepted", "refused"].includes(stored.choice) || stored.expiresAt <= Date.now()) {
        window.localStorage.removeItem(CONSENT_KEY);
        return null;
      }
      return stored.choice;
    } catch (error) {
      return null;
    }
  };

  const saveConsent = (choice) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify({
        choice,
        updatedAt: Date.now(),
        expiresAt: Date.now() + CONSENT_DURATION,
      }));
    } catch (error) {
      console.warn("Le choix de confidentialité n’a pas pu être mémorisé.", error);
    }
  };

  const installMetaPixel = () => {
    if (pixelInitialized || readConsent() !== "accepted") return;
    pixelInitialized = true;

    if (!window.fbq) {
      const fbq = function () {
        fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];
      window.fbq = fbq;
      window._fbq = fbq;

      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }

    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");
    pendingEvents.splice(0).forEach(({ name, parameters, options }) => {
      window.fbq("track", name, parameters, options);
    });
  };

  const track = (name, parameters = {}, options = {}) => {
    const consent = readConsent();
    if (consent === "refused") return false;
    if (consent !== "accepted") {
      pendingEvents.push({ name, parameters, options });
      return false;
    }
    installMetaPixel();
    window.fbq("track", name, parameters, options);
    return true;
  };

  const removeBanner = () => document.querySelector("[data-cookie-banner]")?.remove();

  const showBanner = () => {
    removeBanner();
    const banner = document.createElement("section");
    banner.className = "cookie-banner";
    banner.dataset.cookieBanner = "";
    banner.setAttribute("aria-labelledby", "cookie-title");
    banner.tabIndex = -1;
    banner.innerHTML = `
      <div class="cookie-copy">
        <strong id="cookie-title">Votre vie privée, simplement.</strong>
        <p>Avec votre accord, Meta nous aide à mesurer les visites et les abonnements issus de nos publicités. Aucun cookie publicitaire n’est déposé avant votre choix.</p>
        <a href="confidentialite.html#cookies">En savoir plus</a>
      </div>
      <div class="cookie-actions">
        <button type="button" data-cookie-choice="refused">Tout refuser</button>
        <button type="button" data-cookie-choice="accepted">Accepter la mesure</button>
      </div>
    `;

    banner.querySelectorAll("[data-cookie-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const choice = button.dataset.cookieChoice;
        saveConsent(choice);
        removeBanner();
        if (choice === "accepted") {
          if (pixelInitialized && window.fbq) {
            window.fbq("consent", "grant");
            window.fbq("track", "PageView");
          } else {
            installMetaPixel();
          }
          window.dispatchEvent(new CustomEvent("fdb:analytics-consent-granted"));
        } else {
          pendingEvents.length = 0;
          if (window.fbq) window.fbq("consent", "revoke");
        }
      });
    });

    document.body.appendChild(banner);
    banner.focus();
  };

  const addSettingsControl = () => {
    const footer = document.querySelector(".footer-bottom, .legal-footer");
    if (!footer || footer.querySelector("[data-cookie-settings]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cookie-settings-link";
    button.dataset.cookieSettings = "";
    button.textContent = "Gérer mes cookies";
    button.addEventListener("click", showBanner);
    footer.appendChild(button);
  };

  window.fdbAnalytics = {
    pixelId: META_PIXEL_ID,
    getConsent: readConsent,
    showSettings: showBanner,
    track,
  };

  if (readConsent() === "accepted") installMetaPixel();

  const initializeConsentInterface = () => {
    addSettingsControl();
    if (!readConsent()) showBanner();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeConsentInterface, { once: true });
  } else {
    initializeConsentInterface();
  }
})();
