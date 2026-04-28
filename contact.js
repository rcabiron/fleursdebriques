const form = document.querySelector("[data-contact-form]");
const statusTarget = document.querySelector("[data-contact-status]");

const setStatus = (message, type = "info") => {
  statusTarget.textContent = message;
  statusTarget.dataset.status = type;
};

const getPayload = () => {
  const data = new FormData(form);
  return {
    name: data.get("name")?.toString().trim(),
    email: data.get("email")?.toString().trim(),
    topic: data.get("topic")?.toString().trim(),
    reference: data.get("reference")?.toString().trim(),
    message: data.get("message")?.toString().trim(),
    website: data.get("website")?.toString().trim(),
  };
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  if (window.location.protocol === "file:") {
    setStatus("L'envoi direct sera actif sur la version Cloudflare publiée du site.", "error");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setStatus("Envoi de votre demande...", "info");

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(getPayload()),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || "La demande n'a pas pu être envoyée.");
    }

    form.reset();
    setStatus("Votre demande a bien été envoyée. Nous vous répondrons par email.", "success");
  } catch (error) {
    setStatus(error.message || "Une erreur est survenue pendant l'envoi.", "error");
  } finally {
    submitButton.disabled = false;
  }
});
