# Paiements PayPal

Le site utilise les boutons PayPal côté navigateur pour lancer le paiement, puis une Function Cloudflare peut recevoir les notifications PayPal côté serveur.

## Ce qui fonctionne déjà

- Les abonnements utilisent les `plan_id` PayPal configurés dans `app.js`.
- Les box à l'unité créent une commande PayPal au montant du panier.
- Après validation PayPal, le client arrive sur `merci.html` avec le récapitulatif enregistré dans son navigateur.

## Pourquoi ajouter le webhook

La redirection vers `merci.html` confirme l'expérience client, mais le webhook sert de confirmation serveur.

Il permet de recevoir une notification quand PayPal confirme, modifie, suspend ou annule un paiement ou un abonnement.

Endpoint à utiliser dans PayPal :

```text
https://fleursdebriques.pages.dev/api/paypal-webhook
```

## Variables Cloudflare nécessaires

Dans Cloudflare Pages > `fleursdebriques` > Settings > Variables and Secrets, ajouter :

```text
PAYPAL_ENVIRONMENT=live
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
```

Pour tester avec un compte sandbox, utiliser :

```text
PAYPAL_ENVIRONMENT=sandbox
```

## Événements PayPal à cocher

Pour démarrer, cocher au minimum :

- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.SUSPENDED`
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.REFUNDED`

## Ce que fait le webhook actuellement

- Il vérifie la signature PayPal.
- Il ignore les appels non authentifiés.
- Il envoie un email interne via Resend pour les événements importants.
- Il ne stocke pas encore les commandes en base de données.

## Prochaine évolution utile

Quand le volume de commandes augmentera, ajouter une base Cloudflare D1 pour conserver :

- la référence PayPal,
- le type d'offre,
- le statut,
- la date,
- le montant,
- l'état cadeau ou non.
