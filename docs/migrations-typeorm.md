# Migrations TypeORM — Support de cours

> Cours pratique : remplacer `synchronize: true` par un système de migrations versionnées,
> ajouter une colonne obligatoire sans casser les données existantes, et automatiser la
> vérification de non-régression des données.

---

## 1. Pourquoi sortir de `synchronize: true` ?

Au départ, le projet déclarait :

```ts
new DataSource({ /* ... */, synchronize: true })
```

Ce flag fait qu'à chaque démarrage TypeORM **compare les entités au schéma** et applique
ce qu'il faut pour les aligner. Pratique en TP, **dangereux en prod** :

| Problème | Conséquence |
|---|---|
| Pas de versioning du schéma | Impossible de savoir quel schéma tourne en prod |
| Pas de revue de code des `ALTER TABLE` | Une suppression de propriété → `DROP COLUMN` silencieux |
| Pas de backfill possible | Une colonne `NOT NULL` ajoutée sur une table peuplée → **crash** |
| Pas de rollback | Pas de retour arrière si la mise à jour casse quelque chose |

La solution standard : des **migrations**, c'est-à-dire des fichiers SQL/TypeScript
**ordonnés et signés** qui décrivent les transitions du schéma, vérifiables en revue,
rejouables en CI, réversibles.

---

## 2. Le pattern Expand → Backfill → Contract

C'est **le** pattern à connaître pour ajouter une colonne obligatoire sur une table déjà
peuplée. On découpe l'opération en trois migrations indépendantes :

```
État initial            EXPAND               BACKFILL               CONTRACT
┌────────────┐    ┌─────────────────┐    ┌────────────────┐    ┌─────────────────┐
│ product    │ →  │ + category NULL │ →  │ remplir les    │ →  │ category NOT    │
│ (sans cat) │    │ (compatible avec│    │ rows existantes│    │ NULL (verrou    │
│            │    │  l'ancien code) │    │ avec une valeur│    │  enforced)      │
└────────────┘    └─────────────────┘    └────────────────┘    └─────────────────┘
```

| Étape | Idée | Compatibilité avec l'ancien code |
|---|---|---|
| **Expand** | On ajoute la colonne en `NULL` autorisé | ✅ L'ancien code continue à tourner |
| **Backfill** | On remplit les lignes existantes (`UPDATE … WHERE category IS NULL`) | ✅ |
| **Contract** | On force `NOT NULL` une fois que tout est propre | ⚠️ Le code doit maintenant fournir `category` |

L'avantage : **chaque étape est déployable séparément**. On peut même mettre en
production les trois migrations à des moments différents pour faire un déploiement
"zéro downtime" (ce que les migrations en une seule étape interdisent).

---

## 3. Mise en place dans le projet

### 3.1 DataSource sous forme de factory

Le DataSource doit être paramétrable (la DB de test n'est pas la DB de dev). On expose
une fonction `buildDataSourceOptions` qu'on peut appeler avec des `overrides`.

```ts
// src/config/db.config.ts
export const buildDataSourceOptions = (overrides = {}) => ({
    type: 'postgres',
    host: process.env.DB_HOST,
    /* … */
    entities: [Product, Order],
    migrations: [__dirname + '/../migrations/*.{ts,js}'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,        // <-- la règle d'or
    migrationsRun: false,      // exécution explicite
    ...overrides,
});
```

> Pourquoi une factory ? Parce que sinon les tests doivent ruser (`Object.assign` sur
> l'instance globale) pour pointer vers le container de test. Avec une factory, chaque
> test peut créer son propre `DataSource` proprement.

### 3.2 Scripts CLI TypeORM

```json
"typeorm": "typeorm-ts-node-commonjs -d src/config/db.config.ts",
"migration:create": "npm run typeorm -- migration:create",
"migration:generate": "npm run typeorm -- migration:generate",
"migration:run": "npm run typeorm -- migration:run",
"migration:revert": "npm run typeorm -- migration:revert",
"migration:show": "npm run typeorm -- migration:show"
```

- `migration:create` : crée un fichier vide (on écrit le SQL).
- `migration:generate` : compare entités ↔ DB et génère les `ALTER TABLE` automatiquement.
- `migration:run` : applique toutes les migrations non appliquées.
- `migration:revert` : annule la dernière migration appliquée.

### 3.3 Migration baseline

La toute première migration **crée le schéma existant**. On ne part pas d'une base vide
en prod : il faut que le système de migration sache que les tables existent déjà.

```ts
// src/migrations/1700000000000-InitialSchema.ts
export class InitialSchema1700000000000 implements MigrationInterface {
    public async up(q: QueryRunner): Promise<void> {
        await q.query(`CREATE TABLE "product" (
            "id" SERIAL PRIMARY KEY,
            "price" double precision,
            "title" varchar(255) NOT NULL,
            "description" text
        )`);
    }
    public async down(q: QueryRunner): Promise<void> {
        await q.query(`DROP TABLE "product"`);
    }
}
```

> Sur une vraie prod où le schéma existe déjà, on **insert manuellement** une ligne
> dans `typeorm_migrations` pour signaler "celle-là est déjà passée" — ce qui évite
> de relancer un `CREATE TABLE` qui exploserait.

### 3.4 Les trois migrations `category`

```ts
// 1700000001000-AddCategoryNullable.ts  — EXPAND
public async up(q) {
    await q.query(`ALTER TABLE "product" ADD COLUMN "category" varchar(100)`);
}
public async down(q) {
    await q.query(`ALTER TABLE "product" DROP COLUMN "category"`);
}
```

```ts
// 1700000002000-BackfillCategory.ts  — BACKFILL
public async up(q) {
    await q.query(`UPDATE "product" SET "category" = 'uncategorized' WHERE "category" IS NULL`);
}
public async down(q) {
    // no-op : impossible de distinguer les lignes backfillées des autres
}
```

```ts
// 1700000003000-MakeCategoryNotNull.ts  — CONTRACT
public async up(q) {
    await q.query(`ALTER TABLE "product" ALTER COLUMN "category" SET NOT NULL`);
}
public async down(q) {
    await q.query(`ALTER TABLE "product" ALTER COLUMN "category" DROP NOT NULL`);
}
```

---

## 4. Tester que les migrations ne cassent pas les données

C'est **la valeur ajoutée** par rapport à un simple `migration:run`. Faire passer les
migrations sur une DB vide ne prouve rien — ce qui compte c'est qu'elles passent
sur une DB **qui ressemble à la prod**.

### 4.1 Stratégie

```
1. Démarrer un Postgres vierge (TestContainers)
2. Appliquer SEULEMENT la baseline       ← état "prod" initial
3. Insérer des fixtures représentatives  ← des produits comme en prod
4. SNAPSHOT avant
5. Appliquer les 3 migrations category   ← ce qu'on est sur le point de déployer
6. SNAPSHOT après
7. Comparer : aucune ligne perdue, toutes les valeurs (id, title, price, description)
   identiques, et category bien remplie partout
8. Vérifier le schéma final via information_schema (la colonne EST en NOT NULL)
9. Tester le rollback : 3 reverts successifs, schéma initial restauré, données intactes
```

### 4.2 Pourquoi TestContainers ?

- Une vraie DB Postgres (pas SQLite) → les `ALTER COLUMN … SET NOT NULL` ont le bon
  comportement, les types `varchar(100)` sont fidèles, etc.
- Un container neuf à chaque exécution → pas d'effet de bord entre tests.
- Détruit après le test → 0 maintenance.

### 4.3 Squelette du test

```ts
const container = await new PostgreSqlContainer('postgres:16').start();
const ds = new DataSource(buildDataSourceOptions({
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
}));
await ds.initialize();

// Étape 1 : baseline uniquement
await ds.query(`CREATE TABLE "product" ( … )`);

// Étape 2 : fixtures représentatives
await ds.query(`INSERT INTO product (title, price, description) VALUES
    ('switch 2', 500, 'console'),
    ('clavier', 80, NULL),
    ('A'.repeat(255), 9999.99, 'edge case titre max')`);

const before = await ds.query(`SELECT id, title, price, description FROM product ORDER BY id`);

// Étape 3 : migrations category
await ds.runMigrations();

const after = await ds.query(`SELECT id, title, price, description, category FROM product ORDER BY id`);

// Assertions : pas de perte
expect(after).toHaveLength(before.length);
after.forEach((row, i) => {
    expect(row.title).toBe(before[i].title);
    expect(row.price).toBe(before[i].price);
    expect(row.description).toBe(before[i].description);
    expect(row.category).toBe('uncategorized');
});

// Schéma : NOT NULL bien posé
const cols = await ds.query(`
    SELECT is_nullable FROM information_schema.columns
    WHERE table_name = 'product' AND column_name = 'category'
`);
expect(cols[0].is_nullable).toBe('NO');
```

### 4.4 Test de rollback

```ts
await ds.undoLastMigration();  // contract → expand
await ds.undoLastMigration();  // backfill no-op
await ds.undoLastMigration();  // expand → DROP COLUMN

// La colonne n'existe plus, les autres données sont intactes
```

Lancer : `npm run test:migration`.

---

## 5. Procédure de déploiement en prod

| Étape | Quand | Risque |
|---|---|---|
| 1. `migration:run` (Expand) | Avant de déployer le code applicatif | ✅ aucun |
| 2. Déployer le code (qui sait écrire `category` mais ne l'exige pas) | Après #1 | ✅ aucun |
| 3. `migration:run` (Backfill) | Quand on est sûr qu'aucun nouveau row n'arrive sans category | ✅ idempotent |
| 4. `migration:run` (Contract) | Quand 100% des rows ont une category | ⚠️ échoue si backfill incomplet — d'où le test |
| 5. Déployer le code qui exige `category` | Après #4 | ✅ |

En cas de problème à l'étape 4 → `migration:revert` ramène en `NULL` autorisé,
le code continue de tourner, on diagnostique.

---

## 6. Ce qu'on a appris

1. **`synchronize: true` ne dépasse pas le TP.** Toute prod doit utiliser des migrations.
2. **Le pattern Expand/Backfill/Contract** est la réponse standard à "ajouter une colonne
   obligatoire à une table peuplée" — il découple le déploiement du schéma de celui du code.
3. **Tester les migrations sur une DB peuplée** est aussi important que tester le code.
   TestContainers + Postgres réel + fixtures représentatives = filet de sécurité.
4. **Une migration doit toujours avoir une `down()`** (sauf le backfill, où c'est inutile)
   — c'est ça qui permet le rollback.

---

## 7. Pour aller plus loin

- **Migrations en plusieurs étapes pour un rename de colonne** : ajouter la nouvelle,
  dual-write depuis le code, backfill, switch read, supprimer l'ancienne. Même logique.
- **Migrations long-running** (modification d'une table à 50M de lignes) : passer par
  `pg_repack` ou des `UPDATE` paginés plutôt qu'un `ALTER TABLE` unique.
- **Tests de performance des migrations** : sur une DB de la taille de la prod (volume
  de données, pas de prod réelle), mesurer le temps que prend chaque migration.
