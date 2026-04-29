# Tracking simple

Le site envoie uniquement des événements techniques utiles à la conversion:

- pages vues;
- ouverture du panier;
- ajout au panier;
- choix d'un abonnement ou d'une box;
- début de finalisation;
- retour sur la page merci;
- succès ou erreur du formulaire de contact.

Les événements ne contiennent pas de nom, email, adresse, moyen de paiement ou message client.

## Option 1: logs Cloudflare

Sans configuration supplémentaire, les événements sont visibles dans les logs de Pages Functions sous le préfixe `FDB_ANALYTICS`.

Cloudflare Web Analytics peut être activé en parallèle dans le tableau de bord Cloudflare pour suivre les pages vues globales. Les clics importants du tunnel d'achat passent par `/api/track`, car Web Analytics ne suffit pas pour les événements métier du panier.

## Option 2: stockage D1

Pour garder un historique consultable:

1. Créer une base D1 dans Cloudflare, par exemple `fleursdebriques-analytics`.
2. Exécuter le SQL du fichier `analytics-schema.sql` dans la console D1.
3. Ajouter un binding Pages Functions nommé `ANALYTICS_DB` vers cette base.
4. Ajouter un secret Pages Functions nommé `ANALYTICS_ADMIN_TOKEN`.
5. Redéployer le site.
6. Ouvrir `/admin.html` et saisir le code admin choisi.

La page admin n'est pas liée dans le menu public et n'est pas indexable, mais elle doit quand même rester protégée par un code solide.

Exemples de requêtes utiles:

```sql
SELECT event, COUNT(*) AS total
FROM analytics_events
GROUP BY event
ORDER BY total DESC;

SELECT json_extract(data, '$.productId') AS produit, COUNT(*) AS total
FROM analytics_events
WHERE event = 'add_to_cart'
GROUP BY produit
ORDER BY total DESC;
```
