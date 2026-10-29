# Portfolio · charbelkinkpe.com

Site statique (HTML, CSS, JavaScript) servi par Vercel, contenu stocké dans PostgreSQL (Neon) et lu via `/api/content`.

```
public/        site servi au navigateur (index.html, css/, js/, img/)
  js/data.js   contenu de secours, aussi utilisé pour remplir la base
api/           fonctions serverless Vercel (content.js : GET /api/content)
lib/           code serveur partagé (db.js : connexion Neon, content.js : lecture du contenu)
db/            schema.sql (tables) et seed.js (import du contenu)
scripts/       setup-db.js (création + import), dev.js (serveur local)
tests/         tests sur une base PostgreSQL en mémoire
```

## En local

```bash
npm install
npm run dev        # http://localhost:3000 — base en mémoire si .env n'a pas de DATABASE_URL
npm test
```

## Base de données (une seule fois)

1. Créer la base Neon depuis Vercel (Storage → Neon) et copier `DATABASE_URL` dans `.env` (voir `.env.example`).
2. `npm run db:setup` : crée les tables et importe le contenu de `public/js/data.js`.

`npm run db:reset` efface tout le contenu de la base puis le réimporte depuis `data.js`.

## Espace admin (/admin)

1. `npm run admin:password` : choisis ton e-mail et ton mot de passe (12 caractères minimum).
   Le script écrit dans `.env` `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (mot de passe chiffré, jamais en clair) et `JWT_SECRET`.
2. `npm run dev` puis http://localhost:3000/admin.
3. Sur Vercel : ajouter les mêmes 3 variables dans Settings → Environment Variables (valeurs sans les guillemets).

Sections modifiables : Profil (dont la photo et l'e-mail), Projets, Services, Expériences, Compétences, Contact.
Les listes se réordonnent avec ↑ ↓ ; l'ordre est celui du site. Un projet décoché « Publié » reste en brouillon.
Le site public se met à jour en moins d'une minute après un enregistrement (cache de /api/content).

Images et CV : bouton « Choisir une image » / « Choisir un PDF » dans les formulaires. Les images sont réduites
(1600 px de large, 1000 px pour la photo) et converties en WebP dans le navigateur, puis envoyées à `/api/upload`
(4 Mo maximum, type vérifié aux premiers octets). Stockage : Vercel Blob si `BLOB_READ_WRITE_TOKEN` est défini,
sinon `public/uploads/` en local (fichiers de test, ignorés par Git).

API : `/api/admin/:ressource` (lib/admin.js décrit les champs et leurs règles de validation).

Sécurité : session de 8 h dans un cookie HttpOnly, 5 essais ratés par IP et par quart d'heure,
requêtes refusées si elles viennent d'un autre site. Relancer `npm run admin:password` change le mot de passe
et déconnecte toutes les sessions.
