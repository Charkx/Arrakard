# Quand mocker

On ne remplace que ce qui se trouve **aux limites du système** :

- les API externes ;
- la base de données (parfois : préférer une base de test) ;
- l'horloge et le hasard ;
- le système de fichiers (parfois).

On ne mocke pas :

- ses propres modules ;
- les collaborateurs internes ;
- tout ce qu'on contrôle. Dans ce projet, le domaine ne se mocke jamais : c'est
  du code pur, on l'appelle (`docs/contributing.md`).

## Concevoir pour pouvoir mocker

**1. Injecter les dépendances externes** au lieu de les créer à l'intérieur :

```typescript
// Facile à remplacer
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Difficile à remplacer
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. Préférer une fonction par opération externe** à une fonction générique :

```typescript
// Bon : chaque fonction se remplace séparément
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// Mauvais : le mock doit contenir de la logique conditionnelle
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

Avec une fonction par opération, chaque mock renvoie une seule forme, la
préparation du test n'a pas de condition, et on voit quelles opérations un test
exerce.
