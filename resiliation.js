const cancellationForm = document.querySelector("[data-cancellation-form]");
const cancellationStatus = document.querySelector("[data-cancellation-status]");

const setCancellationStatus = (message, type = "info") => {
  cancellationStatus.textContent = message;
  cancellationStatus.dataset.status = type;
};

cancellationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!cancellationForm.reportValidity()) return;

  const formData = new FormData(cancellationForm);
  const reference = formData.get("reference")?.toString().trim();
  const details = formData.get("details")?.toString().trim();
  const payload = {
    name: formData.get("name")?.toString().trim(),
    email: formData.get("email")?.toString().trim(),
    topic: "Résiliation de l’abonnement",
    reference,
    message: `Je demande la résiliation de mon abonnement Fleurs de Briques et l’arrêt des prochains prélèvements.${details ? `\n\nPrécision : ${details}` : ""}`,
    website: formData.get("website")?.toString().trim(),
  };

  if (window.location.protocol === "file:") {
    setCancellationStatus("La démarche sera active sur la version publiée du site. Aucun abonnement n’a été modifié depuis cette prévisualisation locale.", "error");
    return;
  }

  const submitButton = cancellationForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setCancellationStatus("Envoi de votre demande…");

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "La demande n’a pas pu être envoyée.");
    cancellationForm.reset();
    setCancellationStatus("Votre demande de résiliation a bien été reçue. Un accusé de réception vous a été envoyé par email.", "success");
  } catch (error) {
    setCancellationStatus(error.message || "Une erreur est survenue. Vous pouvez résilier directement depuis PayPal.", "error");
  } finally {
    submitButton.disabled = false;
  }
});
