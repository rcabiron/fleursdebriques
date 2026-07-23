const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-button");
const mobileMenu = document.querySelector(".mobile-menu");
const revealItems = document.querySelectorAll(".reveal");
const motionAllowed = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const trackMetaEvent = (name, parameters = {}) => window.fdbAnalytics?.track(name, parameters);
const trackFunnelEvent = (name, parameters = {}) => window.fdbAnalytics?.trackInternal(name, parameters);

document.querySelectorAll(".hero .reveal").forEach((item) => item.classList.add("visible"));

const onScroll = () => {
  header.classList.toggle("scrolled", window.scrollY > 24);
};

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  mobileMenu.classList.toggle("open", !open);
});

mobileMenu.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileMenu.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -30px" },
  );
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

document.querySelectorAll("[data-scroll-to]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth" });
  });
});

const subscriptionsSection = document.querySelector("#abonnements");
if (subscriptionsSection && "IntersectionObserver" in window) {
  const subscriptionsObserver = new IntersectionObserver((entries, observer) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    trackMetaEvent("ViewContent", {
      content_name: "Abonnements Fleurs de Briques",
      content_category: "Abonnements",
      content_ids: ["ESSENTIEL", "PREMIUM"],
      content_type: "product_group",
    });
    trackFunnelEvent("offers_viewed");
    observer.disconnect();
  }, { threshold: 0.35 });
  subscriptionsObserver.observe(subscriptionsSection);
}

document.querySelectorAll(".faq-item button").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const open = item.classList.contains("is-open");

    document.querySelectorAll(".faq-item").forEach((other) => {
      other.classList.remove("is-open");
      other.querySelector("button").setAttribute("aria-expanded", "false");
    });

    if (!open) {
      item.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    }
  });
});

const premiumGallery = document.querySelector("[data-premium-gallery]");
if (premiumGallery) {
  const premiumImages = premiumGallery.querySelectorAll("[data-premium-image]");
  const premiumButtons = premiumGallery.querySelectorAll("[data-premium-view]");
  let premiumView = "large";
  let premiumTimer;

  const showPremiumView = (view) => {
    premiumView = view;
    premiumImages.forEach((image) => {
      const active = image.dataset.premiumImage === view;
      image.classList.toggle("is-active", active);
      image.setAttribute("aria-hidden", String(!active));
    });
    premiumButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.premiumView === view));
    });
  };

  const startPremiumGallery = () => {
    if (!motionAllowed) return;
    window.clearInterval(premiumTimer);
    premiumTimer = window.setInterval(() => {
      showPremiumView(premiumView === "large" ? "duo" : "large");
    }, 5200);
  };

  premiumButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPremiumView(button.dataset.premiumView);
      startPremiumGallery();
    });
  });

  premiumGallery.addEventListener("pointerenter", () => window.clearInterval(premiumTimer));
  premiumGallery.addEventListener("pointerleave", startPremiumGallery);
  startPremiumGallery();
}

const creationsCarousel = document.querySelector("[data-creations-carousel]");
if (creationsCarousel) {
  const creationSlides = [...creationsCarousel.querySelectorAll(".creation-slide")];
  const previousCreation = document.querySelector("[data-carousel-prev]");
  const nextCreation = document.querySelector("[data-carousel-next]");
  const carouselStatus = document.querySelector(".carousel-status");
  let activeCreation = 0;
  let carouselScrollTimer;

  const formatSlideNumber = (number) => String(number).padStart(2, "0");

  const updateCreationState = (index) => {
    activeCreation = Math.max(0, Math.min(index, creationSlides.length - 1));
    creationSlides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === activeCreation);
    });
    carouselStatus.innerHTML = `<strong>${formatSlideNumber(activeCreation + 1)}</strong><span>/ ${formatSlideNumber(creationSlides.length)}</span>`;
  };

  const goToCreation = (index) => {
    const wrappedIndex = (index + creationSlides.length) % creationSlides.length;
    const trackPadding = Number.parseFloat(getComputedStyle(creationsCarousel).paddingLeft) || 0;
    creationsCarousel.scrollTo({
      left: creationSlides[wrappedIndex].offsetLeft - trackPadding,
      behavior: motionAllowed ? "smooth" : "auto",
    });
    updateCreationState(wrappedIndex);
  };

  previousCreation.addEventListener("click", () => goToCreation(activeCreation - 1));
  nextCreation.addEventListener("click", () => goToCreation(activeCreation + 1));

  creationsCarousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToCreation(activeCreation - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToCreation(activeCreation + 1);
    }
  });

  creationsCarousel.addEventListener("scroll", () => {
    window.clearTimeout(carouselScrollTimer);
    carouselScrollTimer = window.setTimeout(() => {
      const trackPadding = Number.parseFloat(getComputedStyle(creationsCarousel).paddingLeft) || 0;
      const trackPosition = creationsCarousel.scrollLeft + trackPadding;
      const closestSlide = creationSlides.reduce((closest, slide, index) => {
        const distance = Math.abs(slide.offsetLeft - trackPosition);
        return distance < closest.distance ? { index, distance } : closest;
      }, { index: 0, distance: Number.POSITIVE_INFINITY });
      updateCreationState(closestSlide.index);
    }, 80);
  }, { passive: true });

  updateCreationState(0);
}

const dialog = document.querySelector(".plan-dialog");
const dialogTitle = dialog.querySelector("h2");
const dialogPrice = dialog.querySelector(".dialog-price");
const dialogPremiumOffer = dialog.querySelector(".dialog-premium-offer");
const dialogPromoSchedule = dialog.querySelector("[data-dialog-promo-schedule]");
const closeButtons = dialog.querySelectorAll(".dialog-close, .dialog-backdrop");
const checkoutFlow = dialog.querySelector("[data-checkout-flow]");
const checkoutSuccess = dialog.querySelector("[data-checkout-success]");
const subscriptionReference = dialog.querySelector("[data-subscription-reference]");
const paypalContainer = dialog.querySelector("[data-paypal-button-container]");
const paypalStatus = dialog.querySelector("[data-paypal-status]");
const checkoutTotal = dialog.querySelector("[data-checkout-total]");
const deliveryOptions = dialog.querySelectorAll('input[name="delivery-zone"]');
const checkoutConsent = dialog.querySelector("[data-checkout-consent]");
const successClose = dialog.querySelector("[data-success-close]");
let lastFocusedElement;
let activePlan = null;
let paypalRenderVersion = 0;
let confirmationUrl = "";

const PAYPAL_PLANS = {
  ESSENTIEL: { price: 39.9, regularPrice: 49.9, planId: "P-48D74613M42572619NJM72NY", standardPlanId: "P-9WK16435TS7356210NJM6FSY" },
  PREMIUM: { price: 59.9, regularPrice: 69.9, planId: "P-7X5243942W016041TNJM73MY", standardPlanId: "P-44N73432SR248160RNJM6GDY" },
};
const PAYPAL_RETURN_URL = "https://www.fleursdebriques.fr/merci.html?paypal_return=1";
const PAYPAL_CANCEL_URL = "https://www.fleursdebriques.fr/?paypal_cancel=1#abonnements";
const PAYPAL_SDK_URL = "https://www.paypal.com/sdk/js?client-id=AVH9AEvVSjuXt_ckB7Pjm0qNzeS_NSTgGSQLsku8b-Xd2IbJvdJKmwb1x-eBe-5EFeSCxLX5v2qt7kSL&currency=EUR&vault=true&intent=subscription&components=buttons";
let paypalSdkPromise;

const loadPayPalSdk = () => {
  if (window.paypal?.Buttons) return Promise.resolve(window.paypal);
  if (paypalSdkPromise) return paypalSdkPromise;

  paypalSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PAYPAL_SDK_URL;
    script.dataset.sdkIntegrationSource = "button-factory";
    script.addEventListener("load", () => resolve(window.paypal));
    script.addEventListener("error", () => reject(new Error("PayPal SDK unavailable")));
    document.head.append(script);
  });

  return paypalSdkPromise;
};

const formatPrice = (value) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

const selectedShipping = () => {
  const option = dialog.querySelector('input[name="delivery-zone"]:checked');
  return Number(option?.dataset.shipping || 0);
};

const showToast = (message) => {
  const toast = document.querySelector(".toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 4000);
};

const paypalReturnState = new URL(window.location.href);
if (paypalReturnState.searchParams.get("paypal_cancel") === "1") {
  showToast("Paiement interrompu. Aucun abonnement n’a été créé.");
  paypalReturnState.searchParams.delete("paypal_cancel");
  window.history.replaceState({}, "", `${paypalReturnState.pathname}${paypalReturnState.search}${paypalReturnState.hash}`);
}

const renderPayPalButtons = async () => {
  if (!activePlan) return;

  const renderVersion = ++paypalRenderVersion;
  const shipping = selectedShipping();
  checkoutTotal.textContent = formatPrice(activePlan.price + shipping);
  paypalContainer.replaceChildren();
  paypalStatus.classList.remove("is-error", "is-pending");
  if (!checkoutConsent.checked) {
    paypalStatus.textContent = "Acceptez les conditions pour afficher les moyens de paiement.";
    return;
  }

  if (!activePlan.planId) {
    paypalStatus.textContent = "Votre abonnement est prêt. Le paiement sera activé dès que le nouveau plan PayPal sera relié.";
    paypalStatus.classList.add("is-pending");
    return;
  }

  paypalStatus.textContent = "Chargement des moyens de paiement…";

  try {
    await loadPayPalSdk();
  } catch (error) {
    console.error("PayPal SDK error", error);
    paypalStatus.textContent = "Le paiement PayPal n’a pas pu être chargé. Vérifiez votre connexion puis actualisez la page.";
    paypalStatus.classList.add("is-error");
    return;
  }

  if (!window.paypal?.Buttons) {
    paypalStatus.textContent = "Le paiement PayPal n’a pas pu être chargé. Vérifiez votre connexion puis actualisez la page.";
    paypalStatus.classList.add("is-error");
    return;
  }

  const buttons = window.paypal.Buttons({
    style: {
      layout: "vertical",
      shape: "pill",
      color: "gold",
      label: "subscribe",
      height: 46,
    },
    createSubscription(data, actions) {
      const currentShipping = selectedShipping();
      trackMetaEvent("InitiateCheckout", {
        currency: "EUR",
        value: activePlan.price + currentShipping,
        content_name: activePlan.name,
        content_ids: [activePlan.code],
        content_type: "product",
        num_items: 1,
      });
      trackMetaEvent("AddPaymentInfo", {
        currency: "EUR",
        value: activePlan.price + currentShipping,
        content_name: activePlan.name,
        content_ids: [activePlan.code],
        content_type: "product",
      });
      trackFunnelEvent("paypal_started", {
        plan: activePlan.code,
        value: activePlan.price + currentShipping,
      });
      const returnUrl = new URL(PAYPAL_RETURN_URL);
      returnUrl.searchParams.set("plan", activePlan.code);
      returnUrl.searchParams.set("shipping", currentShipping.toFixed(2));
      const payload = {
        plan_id: activePlan.planId,
        custom_id: `FDB-${activePlan.code}-${Date.now().toString(36).toUpperCase()}`,
        application_context: {
          brand_name: "Fleurs de Briques",
          locale: "fr-FR",
          shipping_preference: "GET_FROM_FILE",
          user_action: "SUBSCRIBE_NOW",
          return_url: returnUrl.href,
          cancel_url: PAYPAL_CANCEL_URL,
        },
      };

      if (currentShipping > 0) {
        payload.shipping_amount = {
          currency_code: "EUR",
          value: currentShipping.toFixed(2),
        };
      }

      return actions.subscription.create(payload);
    },
    onApprove(data) {
      const deliveryOption = dialog.querySelector('input[name="delivery-zone"]:checked');
      const shipping = selectedShipping();
      trackFunnelEvent("subscription_approved", {
        plan: activePlan.code,
        value: activePlan.price + shipping,
      });
      const confirmation = {
        subscriptionId: data.subscriptionID,
        planCode: activePlan.code,
        planName: activePlan.name,
        planId: activePlan.planId,
        basePrice: activePlan.price,
        regularPrice: activePlan.regularPrice,
        promotionalMonths: 3,
        shipping,
        total: activePlan.price + shipping,
        deliveryZone: deliveryOption?.value || "france",
        createdAt: new Date().toISOString(),
      };

      try {
        const serializedConfirmation = JSON.stringify(confirmation);
        window.sessionStorage.setItem("fdbLastSubscription", serializedConfirmation);
        window.localStorage.setItem("fdbLastSubscription", serializedConfirmation);
      } catch (error) {
        console.warn("Confirmation locale indisponible", error);
      }

      const destination = new URL("merci.html", window.location.href);
      destination.searchParams.set("subscription", data.subscriptionID);
      destination.searchParams.set("plan", activePlan.code);
      destination.searchParams.set("shipping", shipping.toFixed(2));
      confirmationUrl = destination.href;
      checkoutFlow.hidden = true;
      checkoutSuccess.hidden = false;
      subscriptionReference.textContent = data.subscriptionID;
      dialog.querySelector("[data-success-close]").focus();

      window.setTimeout(() => {
        if (confirmationUrl) window.location.assign(confirmationUrl);
      }, 1200);
    },
    onCancel() {
      trackFunnelEvent("paypal_cancelled", { plan: activePlan?.code });
      showToast("Paiement interrompu. Aucun abonnement n’a été créé.");
    },
    onError(error) {
      console.error("PayPal subscription error", error);
      trackFunnelEvent("paypal_error", { plan: activePlan?.code });
      paypalStatus.textContent = "Une erreur est survenue avec PayPal. Réessayez dans quelques instants.";
      paypalStatus.classList.add("is-error");
    },
  });

  if (!buttons.isEligible()) {
    paypalStatus.textContent = "PayPal n’est pas disponible sur cet appareil. Essayez avec un autre navigateur.";
    paypalStatus.classList.add("is-error");
    return;
  }

  buttons.render(paypalContainer).then(() => {
    if (renderVersion === paypalRenderVersion) {
      paypalStatus.textContent = "PayPal ou carte bancaire · paiement chiffré";
      trackFunnelEvent("payment_methods_viewed", {
        plan: activePlan.code,
        value: activePlan.price + selectedShipping(),
      });
    }
  }).catch((error) => {
    console.error("PayPal button render error", error);
    if (renderVersion !== paypalRenderVersion) return;
    paypalStatus.textContent = "Le paiement PayPal n’a pas pu être affiché. Actualisez la page pour réessayer.";
    paypalStatus.classList.add("is-error");
  });
};

const closeDialog = () => {
  dialog.hidden = true;
  document.body.classList.remove("dialog-open");
  lastFocusedElement?.focus();
};

document.querySelectorAll(".choose-plan").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".plan-card");
    const plan = PAYPAL_PLANS[card.dataset.planCode];
    lastFocusedElement = button;
    activePlan = { ...plan, code: card.dataset.planCode, name: card.dataset.plan };
    trackFunnelEvent("checkout_opened", {
      plan: card.dataset.planCode,
      value: plan.price,
    });
    confirmationUrl = "";
    dialogTitle.textContent = card.dataset.plan;
    dialogPrice.innerHTML = `${card.dataset.promoPrice} <span>/ mois</span><small>Pendant 3 mois · puis ${card.dataset.price}/mois</small>`;
    dialogPromoSchedule.textContent = `${card.dataset.promoPrice} × 3, puis ${card.dataset.price}`;
    dialogPremiumOffer.hidden = false;
    checkoutFlow.hidden = false;
    checkoutSuccess.hidden = true;
    subscriptionReference.textContent = "";
    deliveryOptions[0].checked = true;
    checkoutConsent.checked = false;
    dialog.hidden = false;
    document.body.classList.add("dialog-open");
    dialog.querySelector('input[name="delivery-zone"]:checked').focus();
    renderPayPalButtons();
  });
});

deliveryOptions.forEach((option) => option.addEventListener("change", renderPayPalButtons));
checkoutConsent.addEventListener("change", renderPayPalButtons);
successClose.addEventListener("click", () => {
  if (confirmationUrl) {
    window.location.assign(confirmationUrl);
    return;
  }
  closeDialog();
});

closeButtons.forEach((button) => button.addEventListener("click", closeDialog));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !dialog.hidden) closeDialog();
});

if (motionAllowed) {
  const hero = document.querySelector("[data-parallax-root]");
  const image = document.querySelector("[data-parallax-image]");

  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    image.style.transform = `perspective(1000px) rotateY(${x * 3}deg) rotateX(${y * -3}deg)`;
  });

  hero.addEventListener("pointerleave", () => {
    image.style.transform = "";
  });

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      window.requestAnimationFrame(() => {
        const statement = document.querySelector(".statement");
        const rect = statement.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
          document.querySelector(".orbit-one").style.transform = `translateY(${progress * 80}px) rotate(${-12 + progress * 18}deg)`;
          document.querySelector(".orbit-two").style.transform = `translateY(${-progress * 90}px) rotate(${9 - progress * 18}deg)`;
        }
        ticking = false;
      });
      ticking = true;
    },
    { passive: true },
  );
}
