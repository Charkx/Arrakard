# Bons et mauvais tests

Exemples génériques : les fonctions ne sont pas celles du projet.

## Bon : le comportement, par l'interface publique

```typescript
test('un panier valide donne une commande confirmée', async () => {
  const cart = createCart();
  cart.add(product);

  const result = await checkout(cart, paymentMethod);

  expect(result.status).toBe('confirmed');
});
```

Ce test :

- vérifie ce qui compte pour l'appelant ;
- n'utilise que l'API publique ;
- survit à un refactor interne ;
- décrit le quoi, pas le comment ;
- vérifie un seul résultat.

## Mauvais : couplé à l'implémentation

```typescript
test('checkout appelle paymentService.process', async () => {
  const process = vi.spyOn(paymentService, 'process');

  await checkout(cart, payment);

  expect(process).toHaveBeenCalledWith(cart.total);
});
```

Signaux d'alerte :

- on mocke un collaborateur interne ;
- on teste une fonction privée ;
- on vérifie un nombre ou un ordre d'appels ;
- le test casse à un refactor sans changement de comportement ;
- le nom du test décrit le comment ;
- on vérifie par un autre chemin que l'interface.

```typescript
// Mauvais : contourne l'interface pour vérifier
test('createUser écrit en base', async () => {
  await createUser({ name: 'Alice' });

  const row = await db.query('SELECT * FROM users WHERE name = ?', ['Alice']);

  expect(row).toBeDefined();
});

// Bon : vérifie par l'interface
test('un utilisateur créé peut être relu', async () => {
  const user = await createUser({ name: 'Alice' });

  const retrieved = await getUser(user.id);

  expect(retrieved.name).toBe('Alice');
});
```

## Mauvais : tautologique

```typescript
// Mauvais : la valeur attendue est recalculée comme le fait le code
test('le total additionne les lignes', () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, item) => sum + item.price, 0);

  expect(calculateTotal(items)).toBe(expected);
});

// Bon : la valeur attendue est un littéral connu, indépendant du code
test('le total additionne les lignes', () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```
