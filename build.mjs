/**
 * KIOO Média – générateur de site statique.
 * Lit content/ + data/ et produit le dossier public/ (HTML, CSS, JS, images optimisées, SEO).
 * Usage : npm run build
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import sharp from 'sharp';
import {
  esc, slugify, fmtDate, fmtTime, isoDate, readFront, readYaml, readJson,
  ensureDir, writeFile, copyDir, truncate, stripHtml,
} from './lib/util.mjs';
import {
  ctx, u, abs, layout, card, quoteCard, listItem, emptyState, sectionHead, badge, exemple,
  breadcrumbs, breadcrumbLd, pageHeader, newsletterForm, dateLine, socials,
} from './lib/layout.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'public');
const PAGE_SIZE = 12;

/* =========================================================================
   1. Chargement des données
   ========================================================================= */
const site = readJson(path.join(ROOT, 'data/site.json'));
if (process.env.KIOO_DEMO === '0') site.demo = false;
if (process.env.SITE_URL) site.url = process.env.SITE_URL;
const base = (process.env.BASE_PATH ?? site.basePath ?? '').replace(/\/$/, '');
const rubriques = readYaml(path.join(ROOT, 'content/rubriques.yml')).rubriques;
const auteurs = readYaml(path.join(ROOT, 'content/auteurs.yml')).auteurs;
ctx.site = site;
ctx.base = base;
ctx.rubriques = rubriques;
ctx.buildTime = new Date();
const NOW = ctx.buildTime;

const rubByNom = (n) => rubriques.find((r) => r.nom === n || r.slug === n);
const autBySlug = (s) => auteurs.find((a) => a.slug === s);

marked.use({
  gfm: true,
  renderer: {
    link(href, title, text) {
      const ext = /^https?:/.test(href);
      return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' rel="noopener noreferrer"' : ''}>${text}</a>`;
    },
  },
});
const md = (s = '') => marked.parse(String(s));

/* =========================================================================
   2. Nettoyage + ressources statiques
   ========================================================================= */
fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(OUT);
copyDir(path.join(SRC, 'assets'), path.join(OUT, 'assets'), (f) => !path.basename(f).startsWith('_') && !/\.(png)$/i.test(f));
copyDir(path.join(ROOT, 'admin'), path.join(OUT, 'admin'));
ensureDir(path.join(OUT, 'assets/fonts'));
const fontDir = path.join(ROOT, 'node_modules/@fontsource-variable/inter/files');
for (const f of ['inter-latin-wght-normal.woff2', 'inter-latin-ext-wght-normal.woff2']) {
  fs.copyFileSync(path.join(fontDir, f), path.join(OUT, 'assets/fonts', f));
}
fs.copyFileSync(path.join(SRC, 'assets/img/kioo-icone.svg'), path.join(OUT, 'favicon.svg'));

// Icônes + image de partage par défaut (réseaux sociaux)
const iconPng = path.join(SRC, 'assets/img/kioo-icone.png');
await sharp(iconPng).resize(180, 180).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'apple-touch-icon.png'));
await sharp(iconPng).resize(192, 192).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'assets/img/icon-192.png'));
await sharp(iconPng).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'assets/img/icon-512.png'));
{
  const logo = await sharp(path.join(SRC, 'assets/img/kioo-logo-fond-sombre.png')).resize({ width: 900, height: 420, fit: 'inside' }).toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#0F4C5C' } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(OUT, 'assets/img/og-default.png'));
}
// Photo de la fondatrice : version web légère
const vero = path.join(SRC, 'assets/img/_vero-original.jpg');
await sharp(vero).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 74 }).toFile(path.join(OUT, 'assets/img/fondatrice.webp'));
await sharp(vero).resize({ width: 640, withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true }).toFile(path.join(OUT, 'assets/img/fondatrice.jpg'));
// Logos officiels : PNG allégés pour le web
for (const f of ['kioo-logo.png', 'kioo-logo-fond-blanc.png', 'kioo-logo-fond-sombre.png']) {
  await sharp(path.join(SRC, 'assets/img', f)).resize({ width: 800 }).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, 'assets/img', f));
}

writeFile(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: site.name, short_name: 'KIOO', description: site.description, lang: 'fr',
  start_url: `${base}/`, scope: `${base}/`, display: 'standalone', background_color: '#FFFFFF', theme_color: '#0F4C5C',
  icons: [
    { src: `${base}/assets/img/icon-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${base}/assets/img/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
}, null, 2));
if (fs.existsSync(path.join(ROOT, 'static/_headers'))) fs.copyFileSync(path.join(ROOT, 'static/_headers'), path.join(OUT, '_headers'));

/* =========================================================================
   3. Images téléversées : optimisation automatique (webp, plusieurs largeurs)
   ========================================================================= */
const imgInfo = {};
const upDir = path.join(ROOT, 'static/uploads');
if (fs.existsSync(upDir)) {
  ensureDir(path.join(OUT, 'uploads/_opt'));
  for (const f of fs.readdirSync(upDir)) {
    if (!/\.(jpe?g|png|webp)$/i.test(f)) {
      if (fs.statSync(path.join(upDir, f)).isFile()) fs.copyFileSync(path.join(upDir, f), path.join(OUT, 'uploads', f)); // PDF, audio, vidéo…
      continue;
    }
    const inPath = path.join(upDir, f);
    const meta = await sharp(inPath).metadata();
    const baseName = f.replace(/\.[^.]+$/, '');
    const widths = [...new Set([480, 800, 1200].filter((w) => w < meta.width).concat(Math.min(meta.width, 1200)))].sort((a, b) => a - b);
    const variants = [];
    for (const w of widths) {
      const out = `uploads/_opt/${baseName}-${w}.webp`;
      await sharp(inPath).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 72 }).toFile(path.join(OUT, out));
      variants.push({ w, url: `/${out}` });
    }
    const fb = `uploads/${baseName}.jpg`;
    await sharp(inPath).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true }).toFile(path.join(OUT, fb));
    const m2 = await sharp(path.join(OUT, fb)).metadata();
    imgInfo[`/uploads/${f}`] = { variants, fallback: `/${fb}`, w: m2.width, h: m2.height };
  }
}

/* =========================================================================
   4. Articles
   ========================================================================= */
const PLACEHOLDER = '/assets/img/placeholder.svg';

function pictureHtml(img = {}, { sizes = '100vw', decorative = false, eager = false } = {}) {
  const info = img.src ? imgInfo[img.src] : null;
  if (!info) {
    return `<span class="media media--ph"><img src="${u(PLACEHOLDER)}" alt="${decorative ? '' : esc(img.alt || 'Photographie à remplacer')}" width="1280" height="800" loading="lazy" decoding="async"></span>`;
  }
  const srcset = info.variants.map((v) => `${u(v.url)} ${v.w}w`).join(', ');
  return `<span class="media" data-media><picture><source type="image/webp" srcset="${srcset}" sizes="${sizes}"><img src="${u(info.fallback)}" alt="${decorative ? '' : esc(img.alt || '')}" width="${info.w}" height="${info.h}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"></picture><button class="media-show" type="button" hidden>Afficher l’image</button></span>`;
}

function loadArticles() {
  const dir = path.join(ROOT, 'content/articles');
  if (!fs.existsSync(dir)) return [];
  const list = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const { data: d } = readFront(path.join(dir, f));
    const slug = d.slug || f.replace(/\.md$/, '');
    if (d.brouillon === true) continue;
    const date = new Date(d.date || NOW);
    if (date > NOW && !d.exemple) continue; // publication programmée : visible à partir de sa date
    const rub = rubByNom(d.rubrique) || rubriques[0];
    const aut = autBySlug(d.auteur) || { nom: d.auteur || '[Auteur ou autrice]', bio: '' };
    const a = {
      slug, url: `/articles/${slug}/`,
      titre: d.titre, format: d.format || 'Reportage', rubriqueSlug: rub.slug, rubriqueNom: rub.nom,
      chapo: d.chapo || '', date, maj: d.maj ? new Date(d.maj) : null, majNote: d.maj_note || '',
      auteurNom: aut.nom, auteur: aut, motsCles: d.mots_cles || [], image: d.image || {}, corps: d.corps || [],
      sources: d.sources || [], documents: d.documents || [], verification: d.verification || {},
      avertissement: d.avertissement || '', lieu: d.lieu || '', exemple: !!d.exemple,
      une: !!d.une, alaUne: !!d.a_la_une,
    };
    a.pictureHtml = (sizes) => pictureHtml(a.image, { sizes, decorative: true });
    list.push(a);
  }
  return list.sort((x, y) => y.date - x.date);
}
const articles = loadArticles();
const news = articles.filter((a) => a.format !== 'Opinion');

/* ---------- Blocs de contenu ---------- */
const hid = (s) => slugify(s).slice(0, 60);

function figure(img = {}, { sizes = '(min-width: 900px) 760px, 100vw', eager = false, cls = '' } = {}) {
  const parts = [];
  if (img.legende) parts.push(`<span class="cap-text">${esc(img.legende)}</span>`);
  const meta = [];
  if (img.credit) meta.push(`Crédit : ${esc(img.credit)}`);
  if (img.date) meta.push(esc(typeof img.date === 'string' ? img.date : fmtDate(img.date)));
  if (img.lieu) meta.push(esc(img.lieu));
  if (img.autorisation) meta.push('Autorisation de publication obtenue');
  if (meta.length) parts.push(`<span class="cap-meta">${meta.join(' · ')}</span>`);
  return `<figure class="fig ${cls}">${pictureHtml(img, { sizes, eager })}${parts.length ? `<figcaption>${parts.join('')}</figcaption>` : ''}</figure>`;
}

function renderBlocks(blocks = []) {
  return blocks.map((b) => {
    switch (b.type) {
      case 'texte': return `<div class="b-text">${md(b.texte)}</div>`;
      case 'intertitre': return `<h2 id="${hid(b.texte)}" class="b-h">${esc(b.texte)}</h2>`;
      case 'citation': return `<blockquote class="pull"><p>${esc(b.texte)}</p>${b.source ? `<footer>— ${esc(b.source)}</footer>` : ''}</blockquote>`;
      case 'temoignage':
        return `<aside class="bloc bloc--temoignage" aria-label="Témoignage"><p class="bloc-label">Témoignage${b.qui ? ` · ${esc(b.qui)}` : ''}</p><div>${md(b.texte)}</div><p class="bloc-note">${b.consentement === false ? 'Consentement : à confirmer avant publication.' : 'Consentement de la personne recueilli avant publication.'}${b.anonymat ? ` ${esc(b.anonymat)}` : ''}</p></aside>`;
      case 'analyse':
        return `<aside class="bloc bloc--analyse" aria-label="Analyse"><p class="bloc-label">Analyse</p><div>${md(b.texte)}</div></aside>`;
      case 'fait':
        return `<aside class="bloc bloc--fait" aria-label="Faits vérifiés"><p class="bloc-label">Ce que nous avons vérifié</p><div>${md(b.texte)}</div></aside>`;
      case 'encadre':
        return `<aside class="bloc bloc--encadre"><p class="bloc-label">${esc(b.titre || 'À savoir')}</p><div>${md(b.texte)}</div></aside>`;
      case 'image': return figure(b);
      case 'galerie':
        return `<div class="gallery" role="group" aria-label="${esc(b.titre || 'Galerie photo')}">${(b.images || []).map((i) => figure(i, { sizes: '(min-width: 900px) 370px, 100vw' })).join('')}</div>`;
      case 'infographie': return figure(b, { cls: 'fig--info' });
      case 'video': {
        const yt = b.youtube ? (b.youtube.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/) || [])[1] || b.youtube : '';
        if (yt) return `<figure class="fig fig--video"><div class="video-facade" data-youtube="${esc(yt)}"><button type="button" class="video-play"><span aria-hidden="true">▶</span> Lire la vidéo<span class="sr-only"> : ${esc(b.titre || 'vidéo')}</span><small>La vidéo se charge au clic pour économiser vos données.</small></button></div>${b.legende ? `<figcaption><span class="cap-text">${esc(b.legende)}</span></figcaption>` : ''}</figure>`;
        return `<figure class="fig fig--video"><video controls preload="none" playsinline ${b.poster ? `poster="${u(b.poster)}"` : ''}><source src="${u(b.fichier || '')}"></video>${b.legende ? `<figcaption><span class="cap-text">${esc(b.legende)}</span></figcaption>` : ''}</figure>`;
      }
      case 'audio':
        return `<figure class="fig fig--audio"><figcaption><span class="cap-text">${esc(b.titre || 'Contenu audio')}</span></figcaption><audio controls preload="none"><source src="${u(b.fichier || '')}"></audio></figure>`;
      case 'document':
        return `<p class="doc"><a href="${u(b.fichier || '#')}" download>Document : ${esc(b.titre || 'à télécharger')}</a></p>`;
      default: return '';
    }
  }).join('\n');
}

function shareBlock(a, id) {
  const url = site.url ? abs(a.url) : '';
  const t = encodeURIComponent(a.titre);
  const eu = encodeURIComponent(url);
  return `
<section class="share" data-share data-title="${esc(a.titre)}" data-url="${esc(url)}" aria-labelledby="${id}">
  <h2 id="${id}" class="share-t">Partager cet article</h2>
  <ul>
    <li><a class="btn btn--wa" data-net="whatsapp" href="https://wa.me/?text=${t}%20${eu}" rel="noopener" target="_blank">WhatsApp<span class="sr-only"> (nouvel onglet)</span></a></li>
    <li><a class="btn btn--fb" data-net="facebook" href="https://www.facebook.com/sharer/sharer.php?u=${eu}" rel="noopener" target="_blank">Facebook<span class="sr-only"> (nouvel onglet)</span></a></li>
    <li><a class="btn btn--ghost" data-net="linkedin" href="https://www.linkedin.com/sharing/share-offsite/?url=${eu}" rel="noopener" target="_blank">LinkedIn<span class="sr-only"> (nouvel onglet)</span></a></li>
    <li><a class="btn btn--ghost" data-net="x" href="https://x.com/intent/post?text=${t}&amp;url=${eu}" rel="noopener" target="_blank">X<span class="sr-only"> (nouvel onglet)</span></a></li>
    <li><button class="btn btn--ghost" type="button" data-copy>Copier le lien</button></li>
    <li><button class="btn btn--ghost" type="button" data-native hidden>Autres…</button></li>
  </ul>
  <p class="form-status" role="status" aria-live="polite" hidden></p>
</section>`;
}

function commentsBlock(a) {
  const c = site.comments || {};
  if (!c.enabled && !site.demo) return '';
  if (!c.enabled) {
    return `<section class="comments" aria-labelledby="cm-t"><h2 id="cm-t">Commentaires</h2><p class="note">Les commentaires sont désactivés pour le moment. Lorsqu’ils seront activés, chaque message sera relu par la rédaction avant d’être affiché (voir la <a href="${u('/charte-ethique/')}">charte éthique</a>).</p></section>`;
  }
  return `<section class="comments" aria-labelledby="cm-t"><h2 id="cm-t">Commentaires</h2><p class="note">Les commentaires sont modérés avant publication. Les propos injurieux, discriminatoires ou diffamatoires ne sont pas publiés.</p>
<form class="form" action="${esc(c.action || '#')}" method="post" data-form="comment">
<input type="hidden" name="article" value="${esc(a.slug)}">
<div class="field"><label for="c-nom">Votre nom ou pseudonyme</label><input id="c-nom" name="nom" required></div>
<div class="field"><label for="c-msg">Votre commentaire</label><textarea id="c-msg" name="message" rows="4" required></textarea></div>
<button class="btn" type="submit">Envoyer pour modération</button><p class="form-status" role="status" aria-live="polite" hidden></p></form></section>`;
}

function articlePage(a) {
  const crumbs = [[a.format === 'Opinion' ? 'Opinions' : 'Actualités sociales', a.format === 'Opinion' ? '/opinions/' : '/actualites-sociales/'], [a.rubriqueNom, `/rubrique/${a.rubriqueSlug}/`], [truncate(a.titre, 48), a.url]];
  const related = news.filter((x) => x.slug !== a.slug && (x.rubriqueSlug === a.rubriqueSlug || x.motsCles.some((k) => a.motsCles.includes(k)))).slice(0, 3);
  const fallbackRel = related.length ? related : news.filter((x) => x.slug !== a.slug).slice(0, 3);
  const ogImage = a.image.src && imgInfo[a.image.src] ? imgInfo[a.image.src].fallback : undefined;

  const sourcesHtml = a.sources.length ? `<section class="sources" aria-labelledby="src-t"><h2 id="src-t">Sources</h2><ul>${a.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.titre)}</a>` : esc(s.titre)}${s.type ? ` <span class="src-type">(${esc(s.type)})</span>` : ''}</li>`).join('')}</ul></section>` : '';
  const docsHtml = a.documents.length ? `<section class="sources" aria-labelledby="doc-t"><h2 id="doc-t">Documents utilisés</h2><ul>${a.documents.map((d) => `<li><a href="${u(d.fichier || d.url || '#')}">${esc(d.titre)}</a></li>`).join('')}</ul></section>` : '';
  const v = a.verification;
  const verifHtml = (v.statut || v.droit_de_reponse) ? `<section class="verif" aria-labelledby="vf-t"><h2 id="vf-t">Vérification et droit de réponse</h2>${v.statut ? `<p><strong>Vérification.</strong> ${esc(v.statut)}</p>` : ''}${v.droit_de_reponse ? `<p><strong>Droit de réponse.</strong> ${esc(v.droit_de_reponse)}</p>` : ''}<p><a href="${u('/methodologie-verification/')}">Comment nous vérifions l’information</a></p></section>` : '';

  const body = `
<article class="article" itemscope itemtype="https://schema.org/NewsArticle">
  <header class="art-head">
    <div class="wrap wrap--read">
      ${breadcrumbs(crumbs)}
      <p class="card-tags">${exemple()}${badge(a.format, `badge--format ${a.format === 'Opinion' ? 'badge--opinion' : ''}`)}<a class="tag-link" href="${u(`/rubrique/${a.rubriqueSlug}/`)}">${esc(a.rubriqueNom)}</a></p>
      <h1 itemprop="headline">${esc(a.titre)}</h1>
      <p class="lead" itemprop="description">${esc(a.chapo)}</p>
      <div class="byline">
        <p><span class="by">Par <strong itemprop="author">${esc(a.auteurNom)}</strong></span>${a.lieu ? ` · <span>${esc(a.lieu)}</span>` : ''}</p>
        <p>Publié ${a.exemple ? '<span class="meta-todo">[date et heure à compléter]</span>' : `le <time itemprop="datePublished" datetime="${isoDate(a.date)}">${fmtDate(a.date)} à ${fmtTime(a.date)}</time>`}${a.maj ? ` · <span class="upd">Mis à jour le <time itemprop="dateModified" datetime="${isoDate(a.maj)}">${fmtDate(a.maj)} à ${fmtTime(a.maj)}</time></span>` : ''}</p>
      </div>
      <div class="tools" role="group" aria-label="Confort de lecture">
        <button type="button" class="tool" data-fs="-1" aria-label="Réduire la taille du texte">A−</button>
        <button type="button" class="tool" data-fs="1" aria-label="Agrandir la taille du texte">A+</button>
        <button type="button" class="tool" data-saver-toggle aria-pressed="false">Économie de données</button>
      </div>
    </div>
  </header>
  <div class="wrap wrap--read">
    ${a.exemple ? `<div class="callout callout--exemple" role="note"><strong>Exemple – modèle d’article.</strong> Ce texte n’est pas une publication de KIOO Média : il montre la structure d’un contenu de format « ${esc(a.format)} ». Les passages entre [crochets] sont à remplacer.</div>` : ''}
    ${a.format === 'Opinion' ? `<div class="callout callout--opinion" role="note"><strong>Opinion.</strong> Ce texte exprime le point de vue de son auteur ou de son autrice. Il se distingue des contenus d’information de KIOO Média (faits, témoignages, analyses).</div>` : ''}
    ${a.avertissement ? `<div class="callout callout--care" role="note"><strong>Note de prudence.</strong> ${esc(a.avertissement)}</div>` : ''}
    ${a.majNote ? `<div class="callout callout--maj" role="note"><strong>Mise à jour${a.maj ? ` du ${fmtDate(a.maj)}` : ''}.</strong> ${esc(a.majNote)}</div>` : ''}
    ${figure(a.image, { eager: true, cls: 'fig--hero', sizes: '(min-width: 900px) 760px, 100vw' })}
    ${shareBlock(a, 'share-t')}
    <div class="art-body" itemprop="articleBody">
      ${renderBlocks(a.corps)}
    </div>
    ${a.motsCles.length ? `<p class="keywords"><span>Mots-clés :</span> ${a.motsCles.map((k) => `<a class="tag-link" href="${u(`/mots-cles/${slugify(k)}/`)}">${esc(k)}</a>`).join(' ')}</p>` : ''}
    ${sourcesHtml}${docsHtml}${verifHtml}
    <section class="actions" aria-label="Actions sur l’article">
      <a class="btn btn--ghost" href="${u(`/contact/?categorie=correction&article=${a.slug}`)}">Signaler une erreur</a>
      <a class="btn btn--ghost" href="${u('/contact/')}">Nous contacter</a>
    </section>
    ${shareBlock(a, 'share-t2')}
    <aside class="author-box" aria-label="À propos de l’auteur">
      <p class="kicker">${a.auteur.exemple ? 'Auteur ou autrice' : 'À propos de l’auteur ou de l’autrice'}</p>
      <p><strong>${esc(a.auteurNom)}</strong>${a.auteur.role ? ` – ${esc(a.auteur.role)}` : ''}</p>
      ${a.auteur.bio ? `<p>${esc(a.auteur.bio)}</p>` : ''}
    </aside>
    ${commentsBlock(a)}
  </div>
</article>
<section class="related band" aria-labelledby="rel-t">
  <div class="wrap">
    ${sectionHead('rel-t', 'À lire aussi')}
    <div class="grid grid--3">${fallbackRel.map((r) => card(r, { showExcerpt: false })).join('') || emptyState()}</div>
  </div>
</section>`;

  const ld = [
    breadcrumbLd(crumbs),
    {
      '@context': 'https://schema.org', '@type': 'NewsArticle', headline: a.titre, description: a.chapo,
      datePublished: isoDate(a.date), ...(a.maj ? { dateModified: isoDate(a.maj) } : {}),
      author: { '@type': 'Person', name: a.auteurNom }, articleSection: a.rubriqueNom, keywords: a.motsCles.join(', '),
      inLanguage: 'fr', publisher: { '@type': 'NewsMediaOrganization', name: site.name },
      ...(ogImage ? { image: abs(ogImage) } : {}), mainEntityOfPage: abs(a.url),
    },
  ];
  return layout({
    title: a.titre, description: a.chapo, path: a.url, ogImage, type: 'article', jsonld: ld, main: body,
    bodyClass: 'page-article', publishedTime: isoDate(a.date), modifiedTime: a.maj ? isoDate(a.maj) : undefined, noindex: a.exemple,
  });
}

/* =========================================================================
   5. Pages de liste (sections, rubriques, mots-clés) avec pagination
   ========================================================================= */
const SECTIONS = [
  { slug: 'actualites-sociales', titre: 'Actualités sociales', intro: 'Reportages, analyses, explications et interviews sur les réalités sociales en République démocratique du Congo.', filter: (a) => a.format !== 'Opinion', chips: true },
  { slug: 'reportages', titre: 'Reportages', intro: 'Du terrain : un quartier, une école, un centre de santé, un marché. Nous partons des personnes pour remonter aux causes.', filter: (a) => a.format === 'Reportage' },
  { slug: 'enquetes', titre: 'Enquêtes', intro: 'Des sujets approfondis, documentés et vérifiés, avec des sources citées et le droit de réponse des personnes mises en cause.', filter: (a) => a.format === 'Enquête' },
  { slug: 'portraits', titre: 'Portraits', intro: 'Une personne, une histoire, un quotidien. Des portraits réalisés avec le consentement des personnes.', filter: (a) => a.format === 'Portrait' },
  { slug: 'temoignages', titre: 'Témoignages', intro: 'La parole des personnes directement concernées, recueillie avec leur accord, dans le respect de leur dignité.', filter: (a) => a.format === 'Témoignage' },
  { slug: 'journalisme-de-solutions', titre: 'Journalisme de solutions', intro: 'Ce qui fonctionne, à quelles conditions et avec quelles limites : des réponses concrètes aux difficultés sociales.', filter: (a) => a.format === 'Journalisme de solutions' },
  { slug: 'regard-en-images', titre: 'Regard en images', intro: 'Des photographies de terrain, des portraits et des galeries, accompagnés de légendes, de crédits et d’autorisations.', filter: (a) => a.rubriqueSlug === 'regard-en-images', photo: true },
  { slug: 'opinions', titre: 'Opinions', intro: 'Des points de vue signés. Les opinions sont clairement séparées de nos contenus d’information.', filter: (a) => a.format === 'Opinion', source: 'all' },
];

const pages = []; // pour sitemap / index de recherche / plan du site
const addPage = (url, title, desc = '') => pages.push({ url, title, desc });

function paginate(items, baseUrl) {
  const total = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  return Array.from({ length: total }, (_, i) => ({
    n: i + 1, total, url: i === 0 ? baseUrl : `${baseUrl}page/${i + 1}/`, items: items.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE),
  }));
}

function pager(p, baseUrl) {
  if (p.total < 2) return '';
  const link = (n, label, rel) => `<a href="${u(n === 1 ? baseUrl : `${baseUrl}page/${n}/`)}" rel="${rel}">${label}</a>`;
  return `<nav class="pager" aria-label="Pagination"><p>Page ${p.n} sur ${p.total}</p><p>${p.n > 1 ? link(p.n - 1, '← Précédent', 'prev') : ''} ${p.n < p.total ? link(p.n + 1, 'Suivant →', 'next') : ''}</p></nav>`;
}

function chips(active) {
  return `<nav class="chips" aria-label="Filtrer par rubrique"><ul><li><a href="${u('/actualites-sociales/')}"${active === '' ? ' aria-current="page"' : ''}>Toutes les rubriques</a></li>${rubriques.map((r) => `<li><a href="${u(`/rubrique/${r.slug}/`)}"${active === r.slug ? ' aria-current="page"' : ''}>${esc(r.nom)}</a></li>`).join('')}</ul></nav>`;
}

function listingPages({ baseUrl, title, intro, items, crumbs, activeChip, photo, kicker }) {
  const pgs = paginate(items, baseUrl);
  for (const p of pgs) {
    const main = `
${pageHeader({ crumbs, title, intro, kicker })}
<div class="wrap listing">
  ${activeChip !== undefined ? chips(activeChip) : ''}
  ${p.items.length ? `<div class="grid ${photo ? 'grid--photo' : 'grid--3'}">${p.items.map((a) => card(a, { variant: photo ? 'card--photo' : '', showExcerpt: !photo })).join('')}</div>` : emptyState()}
  ${pager(p, baseUrl)}
</div>`;
    writeFile(path.join(OUT, p.url, 'index.html'), layout({
      title: p.n > 1 ? `${title} – page ${p.n}` : title, description: intro, path: p.url, main,
      jsonld: [breadcrumbLd(crumbs)],
    }));
    if (p.n === 1) addPage(p.url, title, intro);
  }
}

for (const s of SECTIONS) {
  listingPages({
    baseUrl: `/${s.slug}/`, title: s.titre, intro: s.intro,
    items: (s.source === 'all' ? articles : news).filter(s.filter),
    crumbs: [[s.titre, `/${s.slug}/`]], activeChip: s.chips ? '' : undefined, photo: s.photo,
  });
}
for (const r of rubriques) {
  listingPages({
    baseUrl: `/rubrique/${r.slug}/`, title: r.nom, intro: r.description,
    items: news.filter((a) => a.rubriqueSlug === r.slug),
    crumbs: [['Actualités sociales', '/actualites-sociales/'], [r.nom, `/rubrique/${r.slug}/`]], activeChip: r.slug, kicker: 'Rubrique', photo: r.slug === 'regard-en-images',
  });
}
const allTags = new Map();
for (const a of articles) for (const k of a.motsCles) {
  const s = slugify(k);
  if (!allTags.has(s)) allTags.set(s, { nom: k, items: [] });
  allTags.get(s).items.push(a);
}
for (const [s, t] of allTags) {
  listingPages({
    baseUrl: `/mots-cles/${s}/`, title: `Mot-clé : ${t.nom}`, intro: `Toutes les publications associées au mot-clé « ${t.nom} ».`, items: t.items,
    crumbs: [['Actualités sociales', '/actualites-sociales/'], [`Mot-clé : ${t.nom}`, `/mots-cles/${s}/`]],
  });
}

for (const a of articles) {
  writeFile(path.join(OUT, a.url, 'index.html'), articlePage(a));
  addPage(a.url, a.titre, a.chapo);
}

/* =========================================================================
   6. Pages institutionnelles (Markdown) + pages spéciales
   ========================================================================= */
const founderFigure = `<figure class="founder">
<picture><source type="image/webp" srcset="${u('/assets/img/fondatrice.webp')}"><img src="${u('/assets/img/fondatrice.jpg')}" alt="Portrait de Véronique Faida Shamba, fondatrice de KIOO Média : souriante, debout devant un véhicule blanc, en tenue wax bleue et dentelle." width="640" height="768" loading="lazy" decoding="async"></picture>
<figcaption><strong>Faida Shamba Véronique</strong><br>Fondatrice de KIOO Média<br><span class="cap-meta">Crédit photo : [à compléter]</span></figcaption></figure>`;

const tokens = (s) => s
  .replaceAll('{{fondatrice}}', founderFigure)
  .replaceAll('{{email}}', esc(site.contact?.email || '[Adresse e-mail officielle]'))
  .replaceAll('{{telephone}}', esc(site.contact?.phone || '[Numéro professionnel]'))
  .replaceAll('{{adresse}}', esc(site.contact?.address || '[Adresse ou localisation]'))
  .replaceAll('{{lien_contact}}', u('/contact/'))
  .replaceAll('{{lien_charte}}', u('/charte-ethique/'))
  .replaceAll('{{lien_methodologie}}', u('/methodologie-verification/'));

const PAGES_DIR = path.join(ROOT, 'content/pages');
for (const f of fs.readdirSync(PAGES_DIR).filter((x) => x.endsWith('.md'))) {
  const { data: d, body } = readFront(path.join(PAGES_DIR, f));
  const slug = d.slug || f.replace(/\.md$/, '');
  const url = `/${slug}/`;
  const crumbs = [[d.titre, url]];
  const main = `
${pageHeader({ crumbs, title: d.titre, intro: d.description })}
<div class="wrap wrap--read prose">
${tokens(md(body))}
${slug === 'charte-ethique' ? `<p class="callout" role="note">Une question sur nos pratiques, une erreur à signaler ? <a href="${u('/contact/?categorie=correction')}">Écrivez-nous</a>.</p>` : ''}
</div>`;
  writeFile(path.join(OUT, url, 'index.html'), layout({
    title: d.titre, description: d.description, path: url, main, jsonld: [breadcrumbLd(crumbs)], bodyClass: `page-${slug}`,
  }));
  addPage(url, d.titre, d.description);
}

/* ---------- Contact ---------- */
{
  const c = site.contact || {};
  const w3Key = site.forms?.web3formsKey || '';
  const action = w3Key ? 'https://api.web3forms.com/submit' : (site.forms?.contactAction || '');
  const attachments = !!site.forms?.attachments; // pièces jointes : offre payante chez Web3Forms
  const cats = [
    ['proposition-sujet', 'Proposition de sujet'], ['temoignage', 'Témoignage'], ['correction', 'Demande de correction'],
    ['partenariat', 'Partenariat'], ['media', 'Demande média'], ['urgent', 'Signalement urgent'],
  ];
  const crumbs = [['Nous contacter', '/contact/']];
  const main = `
${pageHeader({ crumbs, title: 'Nous contacter', intro: 'Proposer un sujet, témoigner, demander une correction, envisager un partenariat : écrivez-nous.' })}
<div class="wrap contact-grid">
  <form class="form" ${action ? `action="${esc(action)}" method="post"${attachments ? ' enctype="multipart/form-data"' : ''}` : 'action="#" method="post"'}${w3Key ? ' data-web3="1"' : ''} data-form="contact" novalidate>
    ${w3Key ? `<input type="hidden" name="access_key" value="${esc(w3Key)}"><input type="hidden" name="subject" value="Nouveau message via le site KIOO Média"><input type="hidden" name="from_name" value="Site KIOO Média"><input type="checkbox" name="botcheck" class="field--hp" tabindex="-1" autocomplete="off" aria-hidden="true">` : ''}
    <div class="field"><label for="f-cat">Motif du message</label>
      <select id="f-cat" name="categorie" required>${cats.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      <p class="hint" data-cat-hint hidden></p></div>
    <div class="field"><label for="f-nom">Nom</label><input id="f-nom" name="nom" autocomplete="name" required></div>
    <div class="field"><label for="f-email">Adresse e-mail</label><input id="f-email" name="email" type="email" inputmode="email" autocomplete="email" required></div>
    <div class="field"><label for="f-objet">Objet du message</label><input id="f-objet" name="objet" required></div>
    <div class="field"><label for="f-msg">Message</label><textarea id="f-msg" name="message" rows="7" required></textarea></div>
    ${attachments ? `<div class="field"><label for="f-file">Joindre un document <span class="opt">(facultatif)</span></label><input id="f-file" name="attachment" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"><p class="hint">Un seul fichier, 5 Mo maximum.</p></div>` : `<p class="hint">Pour nous envoyer un document, écrivez-nous d’abord : nous vous indiquerons comment nous le transmettre.</p>`}
    <div class="field field--hp" aria-hidden="true"><label>Ne pas remplir <input name="site_web" tabindex="-1" autocomplete="off"></label></div>
    <div class="field field--check"><input id="f-ok" name="consentement" type="checkbox" required><label for="f-ok">J’ai lu la <a href="${u('/confidentialite/')}">politique de confidentialité</a> et j’accepte que KIOO Média utilise ces informations pour me répondre.</label></div>
    <button class="btn" type="submit">Envoyer le message</button>
    <p class="form-status" role="status" aria-live="polite" hidden></p>
  </form>
  <aside class="contact-side" aria-label="Coordonnées">
    <h2>Coordonnées</h2>
    <dl class="coords">
      <dt>E-mail</dt><dd>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '<span class="meta-todo">[Adresse e-mail officielle]</span>'}</dd>
      <dt>Téléphone</dt><dd>${c.phone ? esc(c.phone) : '<span class="meta-todo">[Numéro professionnel]</span>'}</dd>
      <dt>Adresse</dt><dd>${c.address ? esc(c.address) : '<span class="meta-todo">[Adresse ou localisation]</span>'}</dd>
    </dl>
    <h2>Réseaux sociaux</h2>
    ${socials() || '<p class="meta-todo">[Liens des réseaux sociaux]</p>'}
    <div class="callout callout--care"><strong>Information sensible ?</strong> Si votre message peut vous exposer à des risques, n’indiquez pas de détails permettant de vous identifier. Nous convenons ensuite ensemble du moyen le plus sûr de poursuivre l’échange. Voir notre <a href="${u('/charte-ethique/')}">charte éthique</a> : protection des sources et des personnes vulnérables.</div>
  </aside>
</div>`;
  writeFile(path.join(OUT, 'contact/index.html'), layout({ title: 'Nous contacter', description: 'Proposer un sujet, témoigner, demander une correction ou envisager un partenariat avec KIOO Média.', path: '/contact/', main, jsonld: [breadcrumbLd(crumbs)], bodyClass: 'page-contact' }));
  addPage('/contact/', 'Nous contacter');
}

/* ---------- Recherche ---------- */
{
  const crumbs = [['Recherche', '/recherche/']];
  const main = `
${pageHeader({ crumbs, title: 'Rechercher', intro: 'Cherchez dans les articles et les pages de KIOO Média.' })}
<div class="wrap wrap--read search-page">
  <form class="search-form" role="search" action="${u('/recherche/')}" method="get">
    <label for="q">Votre recherche</label>
    <div class="search-row"><input id="q" name="q" type="search" autocomplete="off" placeholder="Un mot, un lieu, une rubrique…" data-search-input><button class="btn" type="submit">Rechercher</button></div>
  </form>
  <p class="form-status" role="status" aria-live="polite" data-search-status>Saisissez au moins deux lettres.</p>
  <ol class="results" data-search-results></ol>
  <noscript><p class="note">La recherche nécessite JavaScript. Vous pouvez parcourir le <a href="${u('/plan-du-site/')}">plan du site</a>.</p></noscript>
</div>`;
  writeFile(path.join(OUT, 'recherche/index.html'), layout({ title: 'Recherche', description: 'Rechercher dans les contenus de KIOO Média.', path: '/recherche/', main, noindex: true, bodyClass: 'page-search' }));
}

/* ---------- Plan du site ---------- */
{
  const crumbs = [['Plan du site', '/plan-du-site/']];
  const main = `
${pageHeader({ crumbs, title: 'Plan du site' })}
<div class="wrap wrap--read prose sitemap">
  <h2>Pages principales</h2>
  <ul>
    <li><a href="${u('/')}">Accueil</a></li>
    ${SECTIONS.map((s) => `<li><a href="${u(`/${s.slug}/`)}">${esc(s.titre)}</a></li>`).join('')}
    <li><a href="${u('/a-propos/')}">À propos</a></li>
    <li><a href="${u('/charte-ethique/')}">Notre charte éthique</a></li>
    <li><a href="${u('/methodologie-verification/')}">Méthodologie et vérification</a></li>
    <li><a href="${u('/contact/')}">Nous contacter</a></li>
    <li><a href="${u('/soutenir/')}">Soutenir KIOO Média</a></li>
    <li><a href="${u('/confidentialite/')}">Politique de confidentialité</a></li>
    <li><a href="${u('/mentions-legales/')}">Mentions légales</a></li>
  </ul>
  <h2>Rubriques</h2>
  <ul>${rubriques.map((r) => `<li><a href="${u(`/rubrique/${r.slug}/`)}">${esc(r.nom)}</a></li>`).join('')}</ul>
  <h2>Toutes les publications</h2>
  ${articles.length ? `<ul>${articles.map((a) => `<li>${a.exemple ? '<em>Exemple : </em>' : ''}<a href="${u(a.url)}">${esc(a.titre)}</a> <span class="src-type">(${esc(a.format)})</span></li>`).join('')}</ul>` : emptyState()}
</div>`;
  writeFile(path.join(OUT, 'plan-du-site/index.html'), layout({ title: 'Plan du site', description: 'Toutes les pages et rubriques de KIOO Média.', path: '/plan-du-site/', main, jsonld: [breadcrumbLd(crumbs)] }));
  addPage('/plan-du-site/', 'Plan du site');
}

/* ---------- 404 ---------- */
writeFile(path.join(OUT, '404.html'), layout({
  title: 'Page introuvable', description: 'Cette page n’existe pas ou a été déplacée.', path: '/404.html', noindex: true,
  main: `<div class="wrap wrap--read notfound"><p class="kicker">Erreur 404</p><h1>Cette page est introuvable</h1><p class="lead">Elle a peut-être été déplacée ou supprimée. Essayez la recherche, ou revenez à l’accueil.</p><p><a class="btn" href="${u('/')}">Retour à l’accueil</a> <a class="btn btn--ghost" href="${u('/recherche/')}">Rechercher</a></p></div>`,
}));

/* =========================================================================
   7. Accueil
   ========================================================================= */
{
  const used = new Set();
  const une = news.find((a) => a.une) || news[0];
  if (une) used.add(une.slug);
  const flagged = news.filter((a) => a.alaUne && !used.has(a.slug));
  const alaUne = [...flagged, ...news.filter((a) => !used.has(a.slug) && !flagged.includes(a))].slice(0, 3);
  const byFormat = (fmt, n = 3) => news.filter((a) => a.format === fmt).slice(0, n);
  const reportages = byFormat('Reportage');
  const temoignages = byFormat('Témoignage');
  const enquetes = byFormat('Enquête', 2);
  const solutions = byFormat('Journalisme de solutions', 3);
  const images = news.filter((a) => a.rubriqueSlug === 'regard-en-images').slice(0, 3);
  const derniers = news.slice(0, 6);

  const heroHtml = une ? `
<section class="hero" aria-labelledby="une-t">
  <div class="wrap hero-in">
    <a class="hero-media" href="${u(une.url)}" tabindex="-1" aria-hidden="true">${pictureHtml(une.image, { sizes: '(min-width: 900px) 640px, 100vw', decorative: true, eager: true })}</a>
    <div class="hero-text">
      <p class="kicker">À la une</p>
      <p class="card-tags">${exemple()}${badge(une.format, 'badge--format')}<a class="tag-link" href="${u(`/rubrique/${une.rubriqueSlug}/`)}">${esc(une.rubriqueNom)}</a></p>
      <h1 id="une-t"><a href="${u(une.url)}">${esc(une.titre)}</a></h1>
      <p class="lead">${esc(une.chapo)}</p>
      <p class="card-meta">${dateLine(une)} · ${esc(une.auteurNom)}</p>
      <p><a class="btn" href="${u(une.url)}">Lire <span class="sr-only">: ${esc(une.titre)}</span><span aria-hidden="true"> →</span></a></p>
    </div>
  </div>
</section>` : `
<section class="hero hero--empty"><div class="wrap"><p class="kicker">Le miroir de nos réalités</p><h1>Bienvenue sur KIOO Média</h1><p class="lead">Les premières publications arrivent bientôt.</p></div></section>`;

  const sec = (id, title, href, content, cls = '', intro) => `<section class="home-sec ${cls}" aria-labelledby="${id}"><div class="wrap">${sectionHead(id, title, href, intro)}${content}</div></section>`;
  const grid = (items, opts) => (items.length ? `<div class="grid grid--3">${items.map((a) => card(a, opts)).join('')}</div>` : emptyState());

  const main = `
${heroHtml}
${sec('alaune-t', 'À la une', '/actualites-sociales/', grid(alaUne))}
<section class="mission" aria-labelledby="mission-t">
  <div class="wrap mission-in">
    <div><p class="kicker kicker--light">Notre mission</p><h2 id="mission-t">Le miroir fidèle des réalités sociales congolaises</h2></div>
    <div>
      <p><strong>Kioo</strong> signifie « miroir » en swahili. KIOO Média informe la société congolaise avec sérieux, humanité et rigueur, et donne la parole aux personnes que l’on entend peu : celles qui vivent les réalités dont nous parlons.</p>
      <p><a class="btn btn--accent" href="${u('/a-propos/')}">Découvrir KIOO Média</a> <a class="link-light" href="${u('/charte-ethique/')}">Notre charte éthique</a></p>
    </div>
  </div>
</section>
${sec('reportages-t', 'Reportages', '/reportages/', grid(reportages), '', 'Du terrain, avec les personnes concernées.')}
${sec('temoignages-t', 'Témoignages', '/temoignages/', temoignages.length ? `<div class="qgrid">${temoignages.map(quoteCard).join('')}</div>` : emptyState(), 'home-sec--tint', 'La parole des personnes directement concernées, recueillie avec leur accord.')}
${sec('enquetes-t', 'Nos enquêtes', '/enquetes/', enquetes.length ? `<div class="grid grid--2">${enquetes.map((a) => card(a, { variant: 'card--wide' })).join('')}</div>` : emptyState(), '', 'Des sujets documentés, vérifiés, sourcés.')}
${sec('solutions-t', 'Journalisme de solutions', '/journalisme-de-solutions/', grid(solutions), 'home-sec--accent', 'Ce qui fonctionne, à quelles conditions, avec quelles limites.')}
${sec('images-t', 'Regard en images', '/regard-en-images/', images.length ? `<div class="grid grid--photo">${images.map((a) => card(a, { variant: 'card--photo', showExcerpt: false })).join('')}</div>` : emptyState(), '')}
${sec('derniers-t', 'Dernières publications', '/actualites-sociales/', derniers.length ? `<div class="latest">${derniers.map(listItem).join('')}</div>` : emptyState())}
${newsletterForm()}`;

  const socialLinks = Object.values(site.social || {}).filter(Boolean);
  const ld = [{
    '@context': 'https://schema.org', '@type': 'NewsMediaOrganization', name: site.name, alternateName: 'KIOO', slogan: site.slogan,
    description: site.description, ...(site.url ? { url: abs('/') } : {}), logo: abs('/assets/img/icon-512.png'), inLanguage: 'fr',
    areaServed: 'CD', address: { '@type': 'PostalAddress', addressLocality: 'Goma', addressCountry: 'CD' },
    ...(socialLinks.length ? { sameAs: socialLinks } : {}),
  }, { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, ...(site.url ? { url: abs('/') } : {}), inLanguage: 'fr' }];
  writeFile(path.join(OUT, 'index.html'), layout({ title: site.name, description: site.description, path: '/', main, jsonld: ld, bodyClass: 'page-home' }));
  addPage('/', 'Accueil', site.description);
}

/* =========================================================================
   8. Recherche (index), plan XML, RSS, robots
   ========================================================================= */
const searchIndex = [
  ...articles.map((a) => ({
    t: a.titre, u: u(a.url), c: a.chapo, f: a.format, r: a.rubriqueNom, k: a.motsCles.join(' '),
    d: a.exemple ? '' : fmtDate(a.date), e: a.exemple ? 1 : 0,
    x: truncate(stripHtml(a.corps.map((b) => `${b.texte || ''} ${b.titre || ''}`).join(' ')), 1200),
  })),
  ...pages.filter((p) => !/^\/(articles|mots-cles|rubrique)\//.test(p.url)).map((p) => ({ t: p.title, u: u(p.url), c: p.desc || '', f: 'Page', r: '', k: '', d: '', e: 0, x: '' })),
  ...rubriques.map((r) => ({ t: r.nom, u: u(`/rubrique/${r.slug}/`), c: r.description, f: 'Rubrique', r: '', k: '', d: '', e: 0, x: '' })),
];
writeFile(path.join(OUT, 'search-index.json'), JSON.stringify(searchIndex));

const smUrl = (p, d) => `<url><loc>${esc(abs(p))}</loc>${d ? `<lastmod>${isoDate(d).slice(0, 10)}</lastmod>` : ''}</url>`;
const allUrls = [...new Set(pages.map((p) => p.url))];
writeFile(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allUrls.map((p) => { const a = articles.find((x) => x.url === p); return smUrl(p, a ? (a.maj || a.date) : null); }).join('\n')}\n</urlset>\n`);

writeFile(path.join(OUT, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${esc(site.name)}</title><link>${esc(abs('/'))}</link><description>${esc(site.description)}</description><language>fr</language>
${news.filter((a) => !a.exemple).slice(0, 30).map((a) => `<item><title>${esc(a.titre)}</title><link>${esc(abs(a.url))}</link><guid>${esc(abs(a.url))}</guid><pubDate>${a.date.toUTCString()}</pubDate><category>${esc(a.rubriqueNom)}</category><description>${esc(a.chapo)}</description></item>`).join('\n')}
</channel></rss>\n`);

writeFile(path.join(OUT, 'robots.txt'), site.demo
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\nDisallow: /admin/\n${site.url ? `Sitemap: ${abs('/sitemap.xml')}\n` : ''}`);

console.log(`✔ KIOO Média : ${articles.length} articles, ${rubriques.length} rubriques, ${allUrls.length} pages → ${path.relative(ROOT, OUT)}/ (${site.demo ? 'mode démonstration' : 'mode production'})`);
