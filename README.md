# KIOO Média – Le miroir de nos réalités

Blog d'information de **KIOO Média**, média indépendant de journalisme social basé à Goma (RDC).
Site **statique** : rapide, très léger, sécurisé par nature, et presque gratuit à héberger.

## 1. Voir le site sur votre ordinateur

Il faut [Node.js](https://nodejs.org) (version 20 ou plus récente).

```bash
npm install
npm run dev
```

Ouvrez ensuite <http://localhost:4173>. Le dossier `public/` contient le site prêt à être publié.

## 2. Ce qui est déjà prêt

- **Pages** : Accueil, Actualités sociales, Reportages, Enquêtes, Portraits, Témoignages, Journalisme de solutions, Regard en images, À propos, Notre charte éthique, Méthodologie et vérification, Nous contacter, Soutenir KIOO Média, Politique de confidentialité, Mentions légales (+ Opinions, Recherche, Plan du site, 404).
- **14 rubriques** (ajoutables depuis l'administration, sans toucher au code) et **9 formats** d'articles (Reportage, Enquête, Interview, Portrait, Témoignage, Analyse, Explication, Journalisme de solutions, Opinion).
- **Page article** : rubrique, titre, chapô, image + légende + crédit, auteur, date et heure, mise à jour, intertitres, citations, blocs distincts *Faits vérifiés / Témoignage / Analyse*, sources, documents, vérification et droit de réponse, note de prudence, boutons de partage (WhatsApp, Facebook, LinkedIn, X, copier, partage du téléphone), « Signaler une erreur », « Nous contacter », articles liés.
- **Mobile d'abord** : texte lisible, gros boutons, contrastes AA, menu simple, lecteurs d'écran (textes alternatifs, structure), **mode économie de données** (images à la demande, vidéos chargées au clic) activé automatiquement sur connexion lente si le téléphone l'indique, réglage de la taille du texte.
- **Images optimisées automatiquement** (WebP en 3 tailles + repli JPEG) à chaque publication.
- **Référencement et partage** : titres et méta-descriptions par page, adresses courtes, fil d'Ariane, balises Facebook/WhatsApp/LinkedIn/X, plan du site (`sitemap.xml`), flux RSS, données structurées pour Google.
- **Contenus de démonstration** : 18 *modèles* d'articles marqués « Exemple », **sans aucun fait, chiffre, citation, nom ou organisation inventé**.

## 3. Ce qu'il reste à compléter (tout est signalé par des [crochets])

Dans l'administration (`/admin/`) → **Réglages**, ou directement dans `data/site.json` :

| À compléter | Où |
|---|---|
| Adresse e-mail officielle, numéro professionnel, adresse | Réglages → Coordonnées |
| Liens Facebook, WhatsApp, LinkedIn, YouTube, Instagram, X | Réglages → Réseaux sociaux (ne rien inventer : un réseau vide n'est pas affiché) |
| Service d'envoi des formulaires (contact, newsletter) | Réglages → Formulaires |
| Origine du média, parcours de la fondatrice, crédit de la photo | Pages du site → À propos |
| Statut juridique, hébergeur, références légales | Pages du site → Mentions légales (idéalement avec un juriste) |
| Outil d'audience, durées de conservation | Pages du site → Politique de confidentialité |
| Modalités de soutien financier | Pages du site → Soutenir KIOO Média |

**Au lancement public** : décochez « Mode démonstration » dans Réglages. Cela retire le bandeau, les badges « Exemple » et autorise Google à indexer le site. Supprimez aussi les articles `exemple-*` (voir §5).

> **Formulaire de contact (Web3Forms)** : créez une clé gratuite sur [web3forms.com](https://web3forms.com) avec l'adresse e-mail qui doit recevoir les messages, puis collez la clé dans Réglages → Formulaires → *Clé d'accès Web3Forms* (ou `forms.web3formsKey` dans `data/site.json`). La clé est publique par conception. Tant qu'elle est vide, le site indique clairement que rien n'est transmis. Les **pièces jointes** sont une option payante de Web3Forms : le champ est donc masqué (réactivable avec `forms.attachments`). Vérifiez les limites du plan gratuit au moment de l'inscription.
>
> **Newsletter** : Web3Forms n'est pas un outil de newsletter. Utilisez un service dédié (par exemple Brevo ou MailerLite, offres gratuites à vérifier) et collez son adresse d'inscription dans `forms.newsletterAction`.

## 4. Administration (`/admin/`)

L'administration utilise **Decap CMS** : une interface en français pour créer et modifier articles, pages, rubriques et auteurs.

- **Créer / modifier un article** : Articles → Nouvel article. Le contenu se compose de **blocs** (texte, intertitre, citation, témoignage, faits vérifiés, analyse, image, galerie, infographie, vidéo, audio, document).
- **Classer par rubrique** : champ *Rubrique* (liste alimentée par Réglages → Rubriques).
- **Programmer une publication** : mettez une **date future**. L'article apparaît automatiquement à cette date (le site est reconstruit toutes les heures par `deploy.yml`).
- **Brouillons** : case « Ne pas publier », ou le circuit éditorial *Brouillon → En relecture → Prêt*.
- **Gérer les auteurs** : Réglages → Auteurs et autrices.
- **Sauvegardes** : tout le contenu est un ensemble de fichiers conservés avec leur historique complet dans GitHub. Chaque modification est récupérable. Faites en plus une copie du dépôt de temps en temps (« Code → Download ZIP »).
- **Commentaires modérés** : désactivés par défaut. Pour les activer, choisissez un service de commentaires avec modération préalable, renseignez son adresse dans Réglages → Commentaires et cochez « Activer ».

### Rôles

| Rôle | Comment le donner (GitHub) | Peut faire |
|---|---|---|
| **Administratrice** | Propriétaire du dépôt | Tout : réglages, auteurs, accès, publication |
| **Correctrice / Éditrice** | Accès *Write* | Relire, corriger, publier |
| **Rédactrice** | Accès *Write* | Écrire et proposer ; la publication passe par la relecture |
| **Contributrice** | Accès *Read* + proposition via *fork* ou envoi à la rédaction | Propose des textes, ne publie pas |

Pour renforcer la règle « rien ne se publie sans relecture » : sur GitHub, *Settings → Branches → protéger `main`* et exiger une relecture avant fusion. Le circuit éditorial de l'administration crée alors une demande de relecture pour chaque article.

**Double authentification (2FA)** : elle est gérée par GitHub. Exigez-la pour toutes les personnes ayant accès (*GitHub → Settings → Password and authentication*, ou obligation au niveau de l'organisation).

### Choisir un hébergement gratuit

| Option | Atouts | À savoir |
|---|---|---|
| **GitHub Pages** (recommandé ici) | Déjà prévu dans `deploy.yml` ; la publication programmée (reconstruction toutes les heures) fonctionne ; quotas simples (environ 1 Go de site, 100 Go de trafic/mois) | Les conditions limitent certains usages commerciaux : un média sans vente ni publicité est dans le cas courant, à relire dans les conditions de GitHub |
| **Cloudflare Pages** | Généralement présenté comme très généreux en trafic ; réseau rapide | La publication programmée demande une configuration en plus (déclencheur horaire) |
| **Netlify** | Simple à brancher | Offre gratuite fondée sur des crédits mensuels, plus difficile à prévoir |

Les chiffres viennent de comparatifs tiers et changent souvent : vérifiez les pages officielles de tarifs avant de choisir.

### Mise en ligne (≈ 1 heure, sans frais d'hébergement)

1. Créez un compte GitHub (avec 2FA) et un dépôt privé ou public, puis envoyez-y le contenu de ce dossier.
2. *Settings → Pages* : source **GitHub Actions**. Le fichier `.github/workflows/deploy.yml` publie le site à chaque modification et toutes les heures.
3. *Settings → Secrets and variables → Actions → Variables* : `SITE_URL` (ex. `https://kioo-media.org`) et, si le site est dans un sous-dossier (`https://compte.github.io/depot`), `BASE_PATH` = `/depot`.
4. Dans `admin/config.yml`, renseignez `repo`, `site_url` et `display_url`.
5. **Connexion à l'administration** : Decap avec GitHub exige un petit service d'authentification (OAuth). Vérifiez l'option la plus simple au moment de la mise en place dans la [documentation de Decap CMS](https://decapcms.org/docs/backends-overview/) (hébergement Netlify ou Cloudflare, ou service OAuth gratuit à déployer). Tant que ce n'est pas fait, **vous pouvez aussi modifier directement les fichiers du dossier `content/`** sur GitHub : le résultat est identique.
6. Plus tard : nom de domaine propre (≈ 10 à 15 USD/an, à vérifier).

## 5. Passer des modèles « Exemple » aux vrais contenus

1. Dans l'administration, ouvrez un modèle `exemple-…`, remplacez tous les passages entre [crochets], ajoutez la vraie image, la vraie date, les vraies sources.
2. Dans le fichier, retirez `exemple: true`.
3. Supprimez les modèles que vous n'utilisez pas. Pour repartir de modèles neufs : `node scripts/seed-demo.mjs`.

## 6. Identité visuelle

Bleu pétrole `#0F4C5C`, orange `#E3762B`, gris ardoise `#4A5A60`, blanc. Titres : **Inter** (auto-hébergée, pas de service externe). Textes : Calibri / Arial.
Le logo n'est ni déformé ni recoloré : le logo de l'en-tête reprend les tracés officiels (version blanche sur fond sombre dans le pied de page), avec un espace libre autour. Les fichiers officiels sont dans `src/assets/img/`.

## 7. Organisation des fichiers

```
content/articles/   un fichier par article (YAML)
content/pages/      pages institutionnelles (Markdown)
content/*.yml       rubriques, auteurs
data/site.json      coordonnées, réseaux sociaux, formulaires, mode démonstration
static/uploads/     images, audios, vidéos, documents téléversés
src/assets/         style (css), scripts (js), logos, polices
lib/, build.mjs     générateur du site (HTML, SEO, recherche, plan du site, RSS)
admin/              espace d'administration (Decap CMS)
```

## 8. Limites connues (honnêtes)

- L'accès à l'administration dépend de GitHub (et d'un service d'authentification) : c'est gratuit mais demande une configuration initiale (§4, étape 5).
- Les **commentaires**, la **newsletter** et l'**envoi des formulaires** nécessitent un service externe à choisir.
- Les textes juridiques sont des **modèles** à faire valider.
- La recherche fonctionne dans le navigateur (contenu des articles et pages) ; très adaptée à un site de quelques centaines d'articles.
