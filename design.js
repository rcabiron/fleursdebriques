(() => {
  const motionAllowed = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.documentElement.classList.add("design-ready");

  if (!motionAllowed) return;

  const revealTargets = [
    ".section-heading",
    ".trust-strip > div",
    ".product-card",
    ".compact-single-offers",
    ".set-preview-grid > article",
    ".why-grid > article",
    ".delivery-timeline",
    ".review-grid > figure",
    ".faq-list > details",
    ".final-cta",
    ".gift-choice-grid > article",
    ".gift-steps li",
    ".seo-split",
    ".guide-list > article",
    ".legal-card",
    ".contact-layout",
  ].join(",");

  const targets = document.querySelectorAll(revealTargets);
  targets.forEach((target, index) => {
    target.classList.add("reveal-item");
    target.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 55}ms`);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.14,
    },
  );

  targets.forEach((target) => observer.observe(target));

  const revealPassedTargets = () => {
    targets.forEach((target) => {
      if (target.classList.contains("is-revealed")) return;
      const rect = target.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.12) {
        target.classList.add("is-revealed");
        observer.unobserve(target);
      }
    });
  };

  requestAnimationFrame(revealPassedTargets);
  window.addEventListener("hashchange", () => requestAnimationFrame(revealPassedTargets), { passive: true });
  window.addEventListener("scroll", revealPassedTargets, { passive: true });

  const heroCard = document.querySelector(".hero-card");
  const heroImage = document.querySelector(".hero-card img");

  if (heroCard && heroImage && window.matchMedia("(pointer: fine)").matches) {
    heroCard.addEventListener("pointermove", (event) => {
      const rect = heroCard.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      heroCard.style.setProperty("--tilt-x", `${y * -2.2}deg`);
      heroCard.style.setProperty("--tilt-y", `${x * 2.2}deg`);
      heroImage.style.setProperty("--image-shift-x", `${x * 10}px`);
      heroImage.style.setProperty("--image-shift-y", `${y * 10}px`);
    });

    heroCard.addEventListener("pointerleave", () => {
      heroCard.style.removeProperty("--tilt-x");
      heroCard.style.removeProperty("--tilt-y");
      heroImage.style.removeProperty("--image-shift-x");
      heroImage.style.removeProperty("--image-shift-y");
    });
  }
})();
