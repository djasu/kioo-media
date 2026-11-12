// Génère les modèles d'articles « Exemple » (content/articles/exemple-*.md).
// Aucun fait, chiffre, citation, nom ou organisation inventé : uniquement des champs [à compléter].
// Usage : node scripts/seed-demo.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'content/articles');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.startsWith('exemple-')) fs.unlinkSync(path.join(OUT, f));

const T = (texte) => ({ type: 'texte', texte });
const H = (texte) => ({ type: 'intertitre', texte });
const Q = (texte, source = '[Nom ou prénom d’emprunt, avec accord]') => ({ type: 'citation', texte, source });
const TEM = (texte, qui = '[Prénom d’emprunt ou nom, avec l’accord de la personne]') => ({ type: 'temoignage', qui, texte, consentement: false, anonymat: '[Préciser si le nom est modifié.]' });
const FAIT = (texte) => ({ type: 'fait', texte });
const ANA = (texte) => ({ type: 'analyse', texte });
const IMG = (legende = '[Légende : qui, quoi, où, quand.]') => ({ type: 'image', alt: '[Texte alternatif : décrire l’image pour une personne qui ne la voit pas.]', legende, credit: '[Nom du photographe ou de la photographe]', date: '[Date de la prise de vue]', lieu: '[Lieu, seulement si sa publication est sans danger]', autorisation: false });

const BODY = {
  Reportage: () => [
    T('[Scène d’ouverture : un lieu, une personne, un moment précis. Trois ou quatre phrases qui font entrer le lecteur dans le sujet.]'),
    H('[Intertitre : le contexte]'),
    FAIT('[Ce qui est établi et vérifié : faits, chiffres et dates, avec la source citée à chaque fois.]'),
    TEM('« [Citation exacte de la personne, telle qu’elle a été enregistrée ou notée.] »'),
    IMG(),
    H('[Intertitre : les causes]'),
    ANA('[Explication des mécanismes : politiques publiques, données, avis de spécialistes. Distinguer clairement l’analyse des faits.]'),
    Q('[Citation courte à mettre en valeur.]'),
    H('[Intertitre : ce qui est fait, ce qui manque]'),
    T('[Réponse des institutions ou des personnes mises en cause. Si elles n’ont pas répondu, le dire et indiquer les démarches faites.]'),
  ],
  Enquête: () => [
    T('[Question de départ : ce que nous avons cherché à savoir, et pourquoi.]'),
    H('[Intertitre : ce que nous avons trouvé]'),
    FAIT('[Chaque fait important est appuyé par au moins deux sources indépendantes, citées ci-dessous.]'),
    { type: 'document', titre: '[Document utilisé, à joindre]', fichier: '' },
    H('[Intertitre : comment nous avons travaillé]'),
    T('[Méthode : combien de personnes interrogées, quels documents, quelles limites.]'),
    TEM('« [Citation d’une personne concernée, avec son accord.] »'),
    H('[Intertitre : les réponses des personnes et institutions mises en cause]'),
    T('[Version des personnes ou institutions concernées, avec la date et le moyen de contact utilisés.]'),
    ANA('[Ce que l’on peut conclure, et ce que l’on ne peut pas affirmer.]'),
  ],
  Interview: () => [
    T('[Présentation de la personne interviewée : fonction, raison de l’entretien. Date et lieu de l’entretien.]'),
    H('[Question 1]'),
    T('[Réponse, retranscrite fidèlement.]'),
    H('[Question 2]'),
    T('[Réponse, retranscrite fidèlement.]'),
    Q('[Phrase marquante de l’interview.]', '[Nom de la personne interviewée]'),
    H('[Question 3]'),
    T('[Réponse. Signaler toute coupe ou reformulation pour la clarté.]'),
  ],
  Portrait: () => [
    T('[Introduction : qui est cette personne et ce qui rend son histoire significative. Elle a donné son accord pour la publication.]'),
    IMG('[Légende : nom (si accord), lieu, date.]'),
    H('[Intertitre : son quotidien]'),
    TEM('« [Citation de la personne dans ses propres mots.] »'),
    H('[Intertitre : ce que son histoire dit de la société]'),
    ANA('[Mise en perspective : relier l’histoire individuelle à une question de société, avec données vérifiées.]'),
    T('[Conclusion : sans misérabilisme, sans généralisation.]'),
  ],
  Témoignage: () => [
    T('[Contexte en deux phrases : qui témoigne, pourquoi, dans quel cadre, avec quel accord. Préciser si le nom est modifié.]'),
    TEM('« [Récit à la première personne, fidèle à ce que la personne a dit.] »'),
    TEM('« [Suite du témoignage.] »'),
    FAIT('[Ce que nous avons pu vérifier ou recouper, et ce qui reste un témoignage non vérifié.]'),
    T('[Ressources utiles, si pertinent : où trouver de l’aide. À vérifier et à compléter.]'),
  ],
  Analyse: () => [
    T('[Question traitée et enjeu pour les lecteurs.]'),
    H('[Intertitre : les faits]'),
    FAIT('[Les faits établis, avec sources.]'),
    H('[Intertitre : l’analyse]'),
    ANA('[Interprétation argumentée, avec les limites de l’analyse. Ce qui est incertain est dit.]'),
    { type: 'infographie', alt: '[Description de l’infographie pour les lecteurs d’écran.]', legende: '[Titre et source des données.]', credit: '[Crédit]' },
  ],
  Explication: () => [
    T('[Question simple à laquelle l’article répond.]'),
    { type: 'encadre', titre: 'En bref', texte: '[Trois ou quatre points à retenir.]' },
    H('[Intertitre : comment ça marche]'),
    T('[Explication claire, sans jargon, avec un exemple concret.]'),
    FAIT('[Chiffres ou textes de référence, avec sources.]'),
  ],
  'Journalisme de solutions': () => [
    T('[Le problème, en une ou deux phrases, et qui il touche.]'),
    H('[Intertitre : ce qui est tenté]'),
    T('[Description de l’initiative ou de la réponse : qui, où, depuis quand, comment.]'),
    TEM('« [Citation d’une personne qui en bénéficie ou qui la porte.] »'),
    H('[Intertitre : ce que les preuves montrent]'),
    FAIT('[Résultats vérifiés, avec sources. Ne pas surestimer.]'),
    H('[Intertitre : conditions et limites]'),
    ANA('[À quelles conditions cela fonctionne, ce qui ne marche pas, ce qui reste à prouver.]'),
  ],
  Opinion: () => [
    T('[Point de vue de l’auteur ou de l’autrice, exprimé à la première personne.]'),
    H('[Intertitre : l’argument]'),
    T('[Développement. Les faits cités doivent être vérifiables et sourcés.]'),
    T('[Conclusion.]'),
  ],
};

const GALERIE = (n) => ({ type: 'galerie', titre: 'Galerie photo', images: Array.from({ length: n }, (_, i) => ({ ...IMG(`[Légende de la photo ${i + 1}.]`) })) });

const SPECS = [
  // [format, rubrique, titre, flags]
  ['Reportage', 'Santé', '[Titre précis du reportage sur la santé : un lieu, une personne, un enjeu]', { une: true, a_la_une: true }],
  ['Reportage', 'Éducation et jeunesse', '[Titre précis du reportage sur l’éducation et la jeunesse]', { a_la_une: true }],
  ['Reportage', 'Eau, électricité et services essentiels', '[Titre précis du reportage sur les services essentiels]', { a_la_une: true }],
  ['Enquête', 'Enquêtes', '[Titre précis de l’enquête : ce que nous avons cherché, ce que nous avons trouvé]', {}],
  ['Enquête', 'Emploi', '[Titre précis de l’enquête sur l’emploi]', {}],
  ['Portrait', 'Portraits', '[Nom (avec accord) : titre du portrait]', {}],
  ['Portrait', 'Femmes et égalité', '[Titre du portrait : une femme, un parcours]', {}],
  ['Témoignage', 'Déplacés et vie en temps de crise', '[Titre du témoignage : « une phrase de la personne »]', {}],
  ['Témoignage', 'Pauvreté et débrouille', '[Titre du témoignage : « une phrase de la personne »]', {}],
  ['Journalisme de solutions', 'Solidarités et initiatives locales', '[Titre : l’initiative locale et ce qu’elle change]', {}],
  ['Journalisme de solutions', 'Éducation et jeunesse', '[Titre : la réponse testée et ses limites]', {}],
  ['Interview', 'Société', '[Titre de l’interview : nom (fonction), citation forte]', {}],
  ['Analyse', 'Pauvreté et débrouille', '[Titre de l’analyse : la question posée]', {}],
  ['Explication', 'Santé', '[Titre de l’explication : « Comment ça marche ? »]', {}],
  ['Opinion', 'Société', '[Titre de l’opinion : le point de vue défendu]', {}],
  ['Reportage', 'Regard en images', '[Titre du reportage photo : un lieu, une journée]', { galerie: 3 }],
  ['Portrait', 'Regard en images', '[Titre du portrait photo : une personne, un métier]', { galerie: 2 }],
  ['Reportage', 'Regard en images', '[Titre de la série photographique]', { galerie: 4 }],
];

const slugPart = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-').replace(/-$/, '');

SPECS.forEach(([format, rubrique, titre, flags], i) => {
  const slug = `exemple-${String(i + 1).padStart(2, '0')}-${slugPart(format)}-${slugPart(rubrique)}`;
  const d = new Date(Date.UTC(2026, 10, 12, 8, 0) - i * 36e5 * 7);
  const corps = BODY[format]();
  if (flags.galerie) corps.splice(1, 0, GALERIE(flags.galerie));
  const data = {
    exemple: true,
    titre,
    format,
    rubrique,
    chapo: '[Chapô : deux ou trois phrases qui annoncent le sujet, le lieu et ce que le lecteur va apprendre. Exemple de modèle, à remplacer.]',
    date: d.toISOString(),
    auteur: 'auteur-exemple',
    lieu: '[Lieu, si sa publication est sans danger]',
    mots_cles: ['exemple', `[mot-clé ${rubrique.toLowerCase()}]`],
    ...(flags.une ? { une: true } : {}),
    ...(flags.a_la_une ? { a_la_une: true } : {}),
    ...(['Témoignage', 'Portrait'].includes(format) || rubrique === 'Déplacés et vie en temps de crise'
      ? { avertissement: '[Note de prudence, si nécessaire : ce contenu aborde un sujet sensible. Préciser les précautions prises pour protéger les personnes.]' } : {}),
    image: { src: '', alt: '[Texte alternatif de l’image principale]', legende: '[Légende de l’image principale : qui, quoi, où, quand.]', credit: '[Crédit photo]', date: '[Date]', lieu: '[Lieu, si sans danger]', autorisation: false },
    corps,
    sources: [
      { titre: '[Source 1 : personne, document ou organisation]', url: '', type: '[témoignage, rapport, donnée publique…]' },
      { titre: '[Source 2, indépendante de la première]', url: '', type: '[type de source]' },
    ],
    verification: {
      statut: '[Comment l’information a été vérifiée : sources croisées, documents consultés, ce qui reste incertain.]',
      droit_de_reponse: '[Personnes ou institutions contactées, date, réponse ou absence de réponse.]',
    },
  };
  fs.writeFileSync(path.join(OUT, `${slug}.md`), `---\n${yaml.dump(data, { lineWidth: 100, noRefs: true })}---\n`);
});
console.log(`${SPECS.length} modèles d'articles générés dans content/articles/`);
