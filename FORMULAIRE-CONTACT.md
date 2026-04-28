# Formulaire de contact

Le formulaire `contact.html` envoie les demandes vers la Function Cloudflare `functions/api/contact.js`.

## Variables Cloudflare à configurer

Dans Cloudflare Pages, ajouter ces variables d'environnement:

- `RESEND_API_KEY`: clé API Resend.
- `CONTACT_TO`: adresse qui reçoit les demandes, par exemple `contact@fleursdebriques.fr`.
- `CONTACT_FROM`: expéditeur validé dans Resend, par exemple `Fleurs de Briques <contact@fleursdebriques.fr>`.

## À vérifier avant mise en production

- Le domaine d'envoi doit être validé dans Resend.
- Faire un test depuis l'URL Cloudflare publiée, pas depuis le fichier local `file://`.
- Vérifier que le bouton répond bien avec le message de succès sur la page contact.
