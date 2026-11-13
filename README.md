# Selia Pro (web)

Espace professionnel Selia : agenda, clients, avis, caisse, réglages et statistiques du salon.
Next.js 16 (App Router), React 19, Tailwind CSS 4. Les données viennent de l'API REZA (`RezaBackend`).

## Démarrer

```bash
cp .env.example .env.local   # puis renseigner les valeurs
npm install
npm run dev                  # http://localhost:3000
```

Le backend doit tourner (`RezaBackend`, `npm run dev`, port 5000). Compte de démonstration : `demo.pro@reza.ma` / `demo1234`.

| Script | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` / `npm start` | build et serveur de production |
| `npm test` | tests unitaires (Vitest) |
| `npm run typecheck` | vérification TypeScript |
| `npm run lint` | ESLint |

## Variables d'environnement

| Nom | Description |
| --- | --- |
| `BACKEND_API_URL` | URL de l'API REZA, avec `/api` (https en production). Côté serveur uniquement. |
| `BFF_SHARED_SECRET` | Même valeur que `BFF_SHARED_SECRET` du backend : permet de limiter les tentatives de connexion par IP réelle du navigateur. |

## Architecture

```
navigateur ──> Next.js (BFF) ──> API REZA (Express)
               /api/session         /api/auth/login, /me, switch-salon
               /api/auth/[action]   inscription, mot de passe, email
               /api/backend/...     ressources du tableau de bord (liste blanche)
```

- **BFF** : le navigateur ne parle qu'à Next.js. Le jeton JWT est stocké dans un cookie `httpOnly`, `SameSite=Lax`, `Secure` en production : aucun script de la page ne peut le lire.
- **`proxy.ts`** : protège `/dashboard` côté serveur (redirection vers `/login` sans session valide).
- **`lib/api/client.ts`** : client HTTP unique (singleton `ApiClient`), délai maximal, erreurs normalisées en `ApiError` avec messages en français, déconnexion automatique sur 401.
- **`lib/api/services/*`** : un service par domaine (rendez vous, clients, avis, factures, statistiques...), seuls points de contact avec l'API.
- **`hooks/useApiQuery`** : chargement avec annulation des requêtes obsolètes ; `useSettingsForm` pour les pages de réglages ; `useUrlState` pour les filtres partagés par la barre latérale et la page (dans l'URL).
- **`lib/*.ts`** : logique pure et testée (agenda, caisse, formats, validation, CSV).

## Sécurité

- Jeton en cookie `httpOnly`, jamais exposé au JavaScript.
- Protection CSRF : en tête `x-selia-request` obligatoire et contrôle de l'origine sur toute écriture.
- Liste blanche des routes relayées par le BFF (pas d'accès aux routes super admin ni publiques), segments de chemin validés.
- En têtes : CSP stricte, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, HSTS en production.
- Redirections après connexion limitées aux chemins internes ; liens de notifications filtrés.
- Export CSV protégé contre l'injection de formules.
- Les rôles non administrateurs n'ont pas accès à la section Admin (le backend reste l'autorité).

## Identité

Logo officiel Selia (vectoriel) dans `public/brand`, thème strictement noir et blanc, titres en Futura, texte en Red Hat Display.
