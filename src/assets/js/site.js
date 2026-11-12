/* KIOO Média – scripts du site (sans dépendance, ~5 Ko). Le site reste lisible sans JavaScript. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }
  };
  var fold = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---- Menu mobile ---- */
  var menuBtn = $('[data-menu]'), nav = $('#menu');
  if (menuBtn && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      $('.menu-label', menuBtn).textContent = open ? 'Fermer' : 'Menu';
    };
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
  }

  /* ---- Mode économie de données ---- */
  var saverOn = function () { return root.getAttribute('data-saver') === '1'; };
  var refreshSaver = function () {
    $$('[data-saver-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', saverOn() ? 'true' : 'false'); });
    $$('[data-saver-state]').forEach(function (s) { s.textContent = saverOn() ? 'activé' : 'désactivé'; });
  };
  $$('[data-saver-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (saverOn()) { root.removeAttribute('data-saver'); store.set('kioo-saver', '0'); } else { root.setAttribute('data-saver', '1'); store.set('kioo-saver', '1'); }
      refreshSaver();
    });
  });
  $$('.media-show').forEach(function (b) {
    b.hidden = false;
    b.addEventListener('click', function () { b.closest('.media').classList.add('is-shown'); });
  });
  refreshSaver();

  /* ---- Taille du texte ---- */
  var fsVals = ['-1', '0', '1', '2'];
  $$('[data-fs]').forEach(function (b) {
    b.addEventListener('click', function () {
      var cur = fsVals.indexOf(root.getAttribute('data-fs') || '0');
      var next = Math.max(0, Math.min(fsVals.length - 1, cur + parseInt(b.getAttribute('data-fs'), 10)));
      root.setAttribute('data-fs', fsVals[next]);
      store.set('kioo-fs', fsVals[next]);
    });
  });

  /* ---- Partage (WhatsApp, Facebook, LinkedIn, X, copier, partage natif) ---- */
  $$('[data-share]').forEach(function (box) {
    var title = box.getAttribute('data-title') || doc.title;
    var url = box.getAttribute('data-url') || location.href.split('#')[0];
    var status = $('.form-status', box);
    var say = function (m) { if (status) { status.textContent = m; status.hidden = false; setTimeout(function () { status.hidden = true; }, 3500); } };
    var t = encodeURIComponent(title), u = encodeURIComponent(url);
    var map = {
      whatsapp: 'https://wa.me/?text=' + t + '%20' + u,
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + u,
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + u,
      x: 'https://x.com/intent/post?text=' + t + '&url=' + u
    };
    $$('[data-net]', box).forEach(function (a) { a.href = map[a.getAttribute('data-net')]; });
    var copy = $('[data-copy]', box);
    if (copy) copy.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { say('Lien copié.'); }, function () { say('Copie impossible : ' + url); });
      } else { say('Copiez ce lien : ' + url); }
    });
    var nat = $('[data-native]', box);
    if (nat && navigator.share) {
      nat.hidden = false;
      nat.addEventListener('click', function () { navigator.share({ title: title, url: url }).catch(function () {}); });
    }
  });

  /* ---- Vidéo : chargement au clic ---- */
  $$('.video-facade[data-youtube]').forEach(function (f) {
    var btn = $('button', f);
    if (btn) btn.addEventListener('click', function () {
      var ifr = doc.createElement('iframe');
      ifr.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(f.getAttribute('data-youtube')) + '?autoplay=1&rel=0';
      ifr.title = 'Lecteur vidéo'; ifr.allow = 'autoplay; encrypted-media; picture-in-picture'; ifr.allowFullscreen = true;
      f.innerHTML = ''; f.appendChild(ifr);
    });
  });

  /* ---- Formulaires (newsletter, contact, commentaire) ---- */
  var HINTS = {
    temoignage: 'Merci de votre confiance. Vous décidez de ce qui peut être publié : nom, prénom d’emprunt ou anonymat. Rien ne sera publié sans votre accord.',
    urgent: 'Pour un danger immédiat, contactez d’abord les secours ou les autorités compétentes. N’indiquez ici que ce qui est nécessaire.',
    correction: 'Indiquez l’article concerné et ce qui vous semble inexact, avec si possible une source. Toute erreur avérée est corrigée publiquement.'
  };
  var qs = new URLSearchParams(location.search);
  var cat = $('#f-cat');
  if (cat) {
    var hint = $('[data-cat-hint]');
    var showHint = function () { var h = HINTS[cat.value]; if (hint) { hint.textContent = h || ''; hint.hidden = !h; } };
    if (qs.get('categorie')) cat.value = qs.get('categorie');
    if (qs.get('article') && $('#f-objet') && !$('#f-objet').value) $('#f-objet').value = 'Correction – article : ' + qs.get('article');
    cat.addEventListener('change', showHint); showHint();
  }
  $$('form[data-form]').forEach(function (form) {
    var status = $('.form-status', form);
    var say = function (m, err) { if (!status) return; status.textContent = m; status.hidden = false; status.classList.toggle('is-error', !!err); };
    form.addEventListener('submit', function (e) {
      var hp = form.elements['site_web'];
      if (hp && hp.value) { e.preventDefault(); return; } // anti-spam : champ piège rempli
      if (!form.checkValidity()) { e.preventDefault(); form.reportValidity(); say('Merci de vérifier les champs signalés.', true); return; }
      var action = form.getAttribute('action');
      if (form.hasAttribute('data-web3') && window.fetch) {
        e.preventDefault();
        var btn = $('button[type="submit"]', form);
        if (btn) btn.disabled = true;
        say('Envoi en cours…', false);
        fetch(action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j && j.success) { form.reset(); say('Merci, votre message a bien été envoyé. Nous vous répondrons dès que possible.', false); }
            else { say('Le message n’a pas pu être envoyé. Réessayez, ou écrivez-nous directement par e-mail.', true); }
          })
          .catch(function () { say('Envoi impossible (connexion ?). Réessayez, ou écrivez-nous directement par e-mail.', true); })
          .then(function () { if (btn) btn.disabled = false; });
        return;
      }
      if (!action || action === '#') {
        e.preventDefault();
        say('Ce formulaire n’est pas encore relié à un service d’envoi (à compléter par l’administratrice dans data/site.json). Aucun message n’a été transmis.', true);
      }
    });
  });

  /* ---- Recherche ---- */
  var sInput = $('[data-search-input]');
  if (sInput) {
    var resBox = $('[data-search-results]'), sStatus = $('[data-search-status]'), index = null, timer;
    var load = function () {
      if (index) return Promise.resolve(index);
      sStatus.textContent = 'Chargement…';
      return fetch(sInput.form.getAttribute('action').replace(/recherche\/?$/, '') + 'search-index.json').then(function (r) { return r.json(); }).then(function (j) { index = j; return j; });
    };
    var score = function (it, terms) {
      var t = fold(it.t), c = fold(it.c), k = fold(it.k + ' ' + it.r + ' ' + it.f), x = fold(it.x), s = 0;
      for (var i = 0; i < terms.length; i++) {
        var w = terms[i], hit = 0;
        if (t.indexOf(w) > -1) { s += 10; hit = 1; }
        if (k.indexOf(w) > -1) { s += 6; hit = 1; }
        if (c.indexOf(w) > -1) { s += 4; hit = 1; }
        if (x.indexOf(w) > -1) { s += 1; hit = 1; }
        if (!hit) return 0;
      }
      return s;
    };
    var mark = function (text, terms) {
      var out = esc(text);
      terms.forEach(function (w) { if (w.length > 1) { out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); } });
      return out;
    };
    var run = function () {
      var q = sInput.value.trim();
      if (fold(q).length < 2) { resBox.innerHTML = ''; sStatus.textContent = 'Saisissez au moins deux lettres.'; return; }
      load().then(function (idx) {
        var terms = fold(q).split(/\s+/).filter(Boolean);
        var found = idx.map(function (it) { return { it: it, s: score(it, terms) }; }).filter(function (r) { return r.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 30);
        sStatus.classList.remove('is-error');
        sStatus.textContent = found.length ? found.length + (found.length > 1 ? ' résultats' : ' résultat') + ' pour « ' + q + ' ».' : 'Aucun résultat pour « ' + q + ' ». Essayez un autre mot.';
        resBox.innerHTML = found.map(function (r) {
          var it = r.it;
          return '<li><p class="card-tags">' + (it.e ? '<span class="badge badge--exemple">Exemple</span>' : '') + '<span class="badge badge--format">' + esc(it.f) + '</span>' + (it.r ? '<span class="tag-link">' + esc(it.r) + '</span>' : '') + '</p><h2><a href="' + esc(it.u) + '">' + mark(it.t, terms) + '</a></h2><p>' + mark(it.c, terms) + '</p></li>';
        }).join('');
      }).catch(function () { sStatus.textContent = 'La recherche est indisponible pour le moment.'; sStatus.classList.add('is-error'); });
    };
    sInput.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 180); });
    sInput.form.addEventListener('submit', function (e) { e.preventDefault(); run(); history.replaceState(null, '', '?q=' + encodeURIComponent(sInput.value)); });
    if (qs.get('q')) { sInput.value = qs.get('q'); run(); } else { sInput.focus(); }
  }
})();
