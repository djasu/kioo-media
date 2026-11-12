import { esc, fmtDate, fmtTime, isoDate, truncate } from './util.mjs';

/** Contexte global rempli par build.mjs */
export const ctx = { site: {}, base: '', rubriques: [], buildTime: new Date() };

export const u = (p = '/') => (/^(https?:|mailto:|tel:|#)/.test(p) ? p : ctx.base + p);
// Adresse absolue : on ne garde que l'origine de « url » (le sous-dossier vient de BASE_PATH), pour éviter tout doublon.
export const abs = (p = '/') => {
  if (!ctx.site.url) return u(p);
  let origin = ctx.site.url.replace(/\/$/, '');
  try { origin = new URL(ctx.site.url).origin; } catch { /* adresse incomplète : on garde telle quelle */ }
  return origin + u(p);
};

export const FORMATS = [
  'Reportage',
  'Enquête',
  'Interview',
  'Portrait',
  'Témoignage',
  'Analyse',
  'Explication',
  'Journalisme de solutions',
  'Opinion',
];

export const NAV = [
  ['Accueil', '/', 'only-panel'],
  ['Actualités sociales', '/actualites-sociales/'],
  ['Reportages', '/reportages/'],
  ['Enquêtes', '/enquetes/'],
  ['Portraits', '/portraits/'],
  ['Témoignages', '/temoignages/'],
  ['Journalisme de solutions', '/journalisme-de-solutions/'],
  ['Regard en images', '/regard-en-images/'],
  ['À propos', '/a-propos/'],
];

const NAV_EXTRA = [
  ['Notre charte éthique', '/charte-ethique/'],
  ['Méthodologie et vérification', '/methodologie-verification/'],
  ['Nous contacter', '/contact/'],
  ['Soutenir KIOO Média', '/soutenir/'],
];

/* ---------- Logo (lettres du logo officiel en SVG, couleurs inchangées) ---------- */
export const logoMark = () => `<svg class="logo-mark" viewBox="80 34 840 352" aria-hidden="true" focusable="false"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="46"><path d="M110 70 V330" stroke="currentColor"/><path d="M225 150 L118 250 L232 330" stroke="currentColor"/><path d="M340 152 V330" stroke="currentColor"/><circle cx="340" cy="72" r="30" fill="#E3762B" stroke="none"/><circle cx="525" cy="240" r="90" stroke="currentColor"/><path d="M848 300 L905 372 L800 330 Z" fill="#E3762B" stroke="#E3762B" stroke-width="14"/><circle cx="785" cy="240" r="90" stroke="#E3762B"/><path d="M741 226 A46 46 0 0 1 771 196" stroke="#E3762B" stroke-width="16"/></g></svg>`;

export const brand = (extra = '') => `<a class="brand ${extra}" href="${u('/')}" aria-label="KIOO Média, retour à l’accueil">${logoMark()}<span class="brand-sub" aria-hidden="true">MÉDIA</span></a>`;

const iconSearch = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>`;

/* ---------- Réseaux sociaux : champs à compléter par l’administratrice ---------- */
const SOCIALS = [
  ['facebook', 'Facebook'],
  ['whatsapp', 'WhatsApp'],
  ['linkedin', 'LinkedIn'],
  ['youtube', 'YouTube'],
  ['instagram', 'Instagram'],
  ['x', 'X'],
];

export function socials() {
  const s = ctx.site.social || {};
  const items = SOCIALS.map(([k, label]) => {
    if (s[k]) return `<li><a class="pill" href="${esc(s[k])}" rel="noopener me" target="_blank">${label}<span class="sr-only"> (s’ouvre dans un nouvel onglet)</span></a></li>`;
    if (ctx.site.demo) return `<li><span class="pill pill--todo" title="Lien à compléter par l’administratrice">${label} <em>[lien à compléter]</em></span></li>`;
    return '';
  }).join('');
  return items ? `<ul class="pills" aria-label="Réseaux sociaux">${items}</ul>` : '';
}

/* ---------- Pièces réutilisables ---------- */
export const badge = (text, cls = '') => `<span class="badge ${cls}">${esc(text)}</span>`;

export const exemple = () => (ctx.site.demo ? badge('Exemple', 'badge--exemple') : '');

export function breadcrumbs(items) {
  const all = [['Accueil', '/'], ...items];
  const li = all
    .map(([label, href], i) =>
      i === all.length - 1
        ? `<li aria-current="page">${esc(label)}</li>`
        : `<li><a href="${u(href)}">${esc(label)}</a></li>`,
    )
    .join('');
  return `<nav class="breadcrumbs" aria-label="Fil d’Ariane"><ol>${li}</ol></nav>`;
}

export function breadcrumbLd(items) {
  const all = [['Accueil', '/'], ...items];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map(([name, href], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: abs(href),
    })),
  };
}

export const pageHeader = ({ crumbs, title, intro, kicker }) => `
<header class="page-head">
  <div class="wrap">
    ${crumbs ? breadcrumbs(crumbs) : ''}
    ${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ''}
    <h1>${esc(title)}</h1>
    ${intro ? `<p class="lead">${esc(intro)}</p>` : ''}
  </div>
</header>`;

export function newsletterForm(id = 'nl') {
  const action = ctx.site.forms?.newsletterAction || '';
  return `
<section class="newsletter" aria-labelledby="${id}-t">
  <div class="wrap newsletter-in">
    <div>
      <h2 id="${id}-t">Recevoir KIOO Média dans votre boîte mail</h2>
      <p>Nos nouvelles publications, sans publicité, quand elles sortent. Vous pouvez vous désinscrire à tout moment.</p>
    </div>
    <form class="form form--inline" data-form="newsletter" ${action ? `action="${esc(action)}" method="post"` : 'action="#" method="post"'} novalidate>
      <div class="field">
        <label for="${id}-email">Adresse e-mail</label>
        <input id="${id}-email" name="email" type="email" inputmode="email" autocomplete="email" required placeholder="vous@exemple.org">
      </div>
      <div class="field field--check">
        <input id="${id}-ok" name="consentement" type="checkbox" required>
        <label for="${id}-ok">J’accepte de recevoir la newsletter de KIOO Média. Voir la <a href="${u('/confidentialite/')}">politique de confidentialité</a>.</label>
      </div>
      <button class="btn btn--accent" type="submit">Je m’inscris</button>
      <p class="form-status" role="status" aria-live="polite" hidden></p>
    </form>
  </div>
</section>`;
}

/* ---------- Mise en page globale ---------- */
export function layout({
  title,
  description,
  path = '/',
  ogImage,
  type = 'website',
  noindex = false,
  jsonld = [],
  main,
  bodyClass = '',
  publishedTime,
  modifiedTime,
}) {
  const { site } = ctx;
  const fullTitle = path === '/' ? `${site.name} – ${site.slogan} | Journalisme social en RDC` : `${title} · ${site.name}`;
  const desc = truncate(description || site.description, 200);
  const canonical = site.url ? abs(path) : '';
  const og = ogImage ? (/^https?:/.test(ogImage) ? ogImage : abs(ogImage)) : abs('/assets/img/og-default.png');
  const robots = noindex || site.demo ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">';
  const ld = jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n');
  const navLi = (arr, cls = '') =>
    arr
      .map(
        ([label, href, c]) =>
          `<li class="${[cls, c || ''].join(' ').trim()}"><a href="${u(href)}"${path === href || (href !== '/' && path.startsWith(href)) ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`,
      )
      .join('');

  return `<!doctype html>
<html lang="fr" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
${robots}
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta name="theme-color" content="#0F4C5C">
<link rel="icon" href="${u('/favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${u('/apple-touch-icon.png')}">
<link rel="manifest" href="${u('/manifest.webmanifest')}">
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="${u('/feed.xml')}">
<link rel="preload" href="${u('/assets/fonts/inter-latin-wght-normal.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${u('/assets/css/site.css')}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="fr_FR">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title || site.name)}">
<meta property="og:description" content="${esc(desc)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
<meta property="og:image" content="${esc(og)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
${publishedTime ? `<meta property="article:published_time" content="${esc(publishedTime)}">` : ''}
${modifiedTime ? `<meta property="article:modified_time" content="${esc(modifiedTime)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title || site.name)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(og)}">
${ld}
<script>document.documentElement.className='js';try{if(localStorage.getItem('kioo-saver')==='1'||(navigator.connection&&(navigator.connection.saveData||/(^|-)2g$/.test(navigator.connection.effectiveType||''))&&localStorage.getItem('kioo-saver')!=='0'))document.documentElement.setAttribute('data-saver','1');var fs=localStorage.getItem('kioo-fs');if(fs)document.documentElement.setAttribute('data-fs',fs)}catch(e){}</script>
</head>
<body class="${bodyClass}">
<a class="skip" href="#contenu">Aller au contenu</a>
${site.demo ? `<div class="demo-bar" role="note"><div class="wrap"><strong>Version de démonstration.</strong> Les contenus marqués « Exemple » ou entre [crochets] sont à remplacer. Ce site n’est pas encore public.</div></div>` : ''}
<div class="topline"><div class="wrap"><span>${esc(site.slogan)}</span><span class="topline-r">Journalisme social · Goma, RDC</span></div></div>
<header class="site-head">
  <div class="wrap site-head-in">
    ${brand()}
    <div class="head-actions">
      <a class="search-btn" href="${u('/recherche/')}" aria-label="Rechercher sur le site">${iconSearch}<span>Rechercher</span></a>
      <a class="btn btn--accent btn--sm hide-sm" href="${u('/soutenir/')}">Soutenir</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-menu><span class="menu-ico" aria-hidden="true"></span><span class="menu-label">Menu</span></button>
    </div>
  </div>
  <nav class="main-nav" id="menu" aria-label="Navigation principale">
    <div class="wrap">
      <ul>${navLi(NAV)}${navLi(NAV_EXTRA, 'only-panel')}</ul>
    </div>
  </nav>
</header>
<main id="contenu" tabindex="-1">
${main}
</main>
<footer class="site-foot">
  <div class="foot-charte"><div class="wrap"><p><strong>Nos engagements :</strong> vérifier avant de publier, protéger les personnes vulnérables, corriger publiquement nos erreurs. <a href="${u('/charte-ethique/')}">Lire notre charte éthique</a></p></div></div>
  <div class="wrap foot-grid">
    <div class="foot-brand">
      ${brand('brand--light')}
      <p>${esc(site.slogan)}. Média indépendant de journalisme social, basé à Goma, en République démocratique du Congo.</p>
      ${socials()}
    </div>
    <nav aria-label="Rubriques">
      <h2 class="foot-h">Rubriques</h2>
      <ul>${ctx.rubriques.slice(0, 13).map((r) => `<li><a href="${u(`/rubrique/${r.slug}/`)}">${esc(r.nom)}</a></li>`).join('')}</ul>
    </nav>
    <nav aria-label="Le média">
      <h2 class="foot-h">Le média</h2>
      <ul>
        <li><a href="${u('/a-propos/')}">À propos</a></li>
        <li><a href="${u('/charte-ethique/')}">Notre charte éthique</a></li>
        <li><a href="${u('/methodologie-verification/')}">Méthodologie et vérification</a></li>
        <li><a href="${u('/contact/')}">Nous contacter</a></li>
        <li><a href="${u('/soutenir/')}">Soutenir KIOO Média</a></li>
        <li><a href="${u('/opinions/')}">Opinions</a></li>
      </ul>
      <h2 class="foot-h foot-h--2">Informations légales</h2>
      <ul>
        <li><a href="${u('/confidentialite/')}">Politique de confidentialité</a></li>
        <li><a href="${u('/mentions-legales/')}">Mentions légales</a></li>
        <li><a href="${u('/plan-du-site/')}">Plan du site</a></li>
        <li><a href="${u('/feed.xml')}">Flux RSS</a></li>
      </ul>
    </nav>
  </div>
  <div class="foot-bottom"><div class="wrap"><p>© ${ctx.buildTime.getFullYear()} ${esc(site.name)}. Tous droits réservés.</p><p><button class="linklike" type="button" data-saver-toggle aria-pressed="false">Mode économie de données : <span data-saver-state>désactivé</span></button></p></div></div>
</footer>
<script src="${u('/assets/js/site.js')}" defer></script>
</body>
</html>`;
}

/* ---------- Cartes d’articles ---------- */
export function dateLine(a, withTime = false) {
  if (a.exemple) return '<span class="meta-todo">[Date à compléter]</span>';
  return `<time datetime="${isoDate(a.date)}">${fmtDate(a.date)}${withTime ? ` à ${fmtTime(a.date)}` : ''}</time>`;
}

export function card(a, { variant = '', headingLevel = 3, showExcerpt = true, imageSizes = '(min-width: 900px) 360px, 92vw' } = {}) {
  const h = `h${headingLevel}`;
  return `
<article class="card ${variant}">
  <a class="card-media" href="${u(a.url)}" tabindex="-1" aria-hidden="true">${a.pictureHtml(imageSizes)}</a>
  <div class="card-body">
    <p class="card-tags">${exemple()}${badge(a.format, 'badge--format')}<a class="tag-link" href="${u(`/rubrique/${a.rubriqueSlug}/`)}">${esc(a.rubriqueNom)}</a></p>
    <${h} class="card-title"><a href="${u(a.url)}">${esc(a.titre)}</a></${h}>
    ${showExcerpt ? `<p class="card-excerpt">${esc(a.chapo)}</p>` : ''}
    <p class="card-meta">${dateLine(a)} · ${esc(a.auteurNom)}</p>
  </div>
</article>`;
}

export function quoteCard(a) {
  return `
<article class="qcard">
  <p class="card-tags">${exemple()}${badge(a.format, 'badge--format')}<a class="tag-link" href="${u(`/rubrique/${a.rubriqueSlug}/`)}">${esc(a.rubriqueNom)}</a></p>
  <h3 class="qcard-title"><a href="${u(a.url)}">${esc(a.titre)}</a></h3>
  <p class="qcard-text">${esc(a.chapo)}</p>
  <p class="card-meta">${dateLine(a)} · ${esc(a.auteurNom)}</p>
</article>`;
}

export function listItem(a) {
  return `
<article class="li">
  <p class="card-tags">${exemple()}${badge(a.format, 'badge--format')}<a class="tag-link" href="${u(`/rubrique/${a.rubriqueSlug}/`)}">${esc(a.rubriqueNom)}</a></p>
  <h3 class="li-title"><a href="${u(a.url)}">${esc(a.titre)}</a></h3>
  <p class="card-meta">${dateLine(a)} · ${esc(a.auteurNom)}</p>
</article>`;
}

export const emptyState = (msg = 'Aucune publication pour le moment.') => `<p class="empty">${esc(msg)}</p>`;

export const sectionHead = (id, title, href, intro) => `
<div class="sec-head">
  <div><h2 id="${id}">${esc(title)}</h2>${intro ? `<p class="sec-intro">${esc(intro)}</p>` : ''}</div>
  ${href ? `<a class="more" href="${u(href)}">Tout voir<span class="sr-only"> : ${esc(title)}</span> <span aria-hidden="true">→</span></a>` : ''}
</div>`;
