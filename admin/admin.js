// Admin Mali Mannol — édition des produits, promotions et infos, publication via /api/admin/save.
(function () {
  'use strict';

  var CATS = [
    ['moteur', 'Huiles moteur'], ['trans', 'Transmission'], ['pl', 'Poids lourd & engins'], ['moto', 'Moto'],
    ['fluides', 'Fluides'], ['additifs', 'Additifs'], ['graisses', 'Graisses'], ['carcare', 'Entretien & filtres']
  ];
  var CAT_LABEL = {}; CATS.forEach(function (c) { CAT_LABEL[c[0]] = c[1]; });
  var INFO_FIELDS = ['phone', 'whatsapp', 'email', 'adresse', 'horaires', 'hero_titre', 'hero_description', 'apropos_court'];

  var state = {
    produits: [], contenu: {}, versions: {},
    saved: null,             // copie de la dernière version publiée, pour « Annuler »
    dirty: { produits: false, contenu: false },
    uploads: {},             // chemin -> base64 des nouvelles photos
    previews: {},            // chemin -> dataURL pour l'aperçu local
    cat: 'all', query: '',
    editing: null,           // index du produit en cours, -1 = nouveau
    pendingPhoto: null       // { path, data, dataUrl } choisie dans la fiche ouverte
  };

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------- API ----------
  function api(path, body) {
    return fetch('/api/admin/' + path, body ? {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-MM-Admin': '1' },
      body: JSON.stringify(body)
    } : { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || ('Erreur ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }

  var toastTimer;
  function toast(msg, kind) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, kind === 'err' ? 6000 : 3500);
  }

  // ---------- Connexion ----------
  function showLogin() { $('app').hidden = true; $('login').hidden = false; $('pwd').focus(); }
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = e.target.querySelector('button');
    btn.disabled = true; $('loginError').hidden = true;
    api('login', { password: $('pwd').value })
      .then(function () {
        $('pwd').value = '';
        if (!isDirty()) return load();
        // Reconnexion après expiration : on garde les modifications en cours
        $('login').hidden = true; $('app').hidden = false;
      })
      .catch(function (err) { $('loginError').textContent = err.message; $('loginError').hidden = false; })
      .then(function () { btn.disabled = false; });
  });
  $('logout').addEventListener('click', function () {
    if (isDirty() && !confirm('Des modifications ne sont pas publiées. Se déconnecter quand même ?')) return;
    api('login', { logout: true }).finally(function () { state.dirty = { produits: false, contenu: false }; showLogin(); });
  });

  function load() {
    return api('data').then(function (d) {
      state.produits = d.produits; state.contenu = d.contenu; state.versions = d.versions;
      state.saved = clone({ produits: d.produits, contenu: d.contenu });
      state.dirty = { produits: false, contenu: false }; state.uploads = {}; state.previews = {};
      $('login').hidden = true; $('app').hidden = false;
      renderAll();
    }).catch(function (err) {
      if (err.status === 401) return showLogin();
      showLogin();
      $('loginError').textContent = err.message; $('loginError').hidden = false;
    });
  }

  // ---------- Onglets ----------
  var TABS = ['produits', 'promo', 'infos'];
  TABS.forEach(function (name) {
    $('tab-' + name).addEventListener('click', function () { selectTab(name); });
  });
  function selectTab(name) {
    TABS.forEach(function (n) {
      $('tab-' + n).setAttribute('aria-selected', String(n === name));
      $('view-' + n).hidden = n !== name;
    });
    window.scrollTo(0, 0);
  }

  // ---------- Rendu ----------
  function renderAll() { renderChips(); renderList(); renderPromo(); renderInfos(); renderPublishBar(); }

  function imgSrc(p) { return state.previews[p.image] || p.image; }
  function thumb(p) {
    return p.image ? '<img src="' + esc(imgSrc(p)) + '" alt="" loading="lazy">' : '<span class="noimg">—</span>';
  }

  function renderChips() {
    var counts = {};
    state.produits.forEach(function (p) { counts[p.categorie] = (counts[p.categorie] || 0) + 1; });
    $('catChips').innerHTML = [['all', 'Tous (' + state.produits.length + ')']]
      .concat(CATS.map(function (c) { return [c[0], c[1] + ' (' + (counts[c[0]] || 0) + ')']; }))
      .map(function (c) { return '<button type="button" data-cat="' + c[0] + '" aria-pressed="' + (state.cat === c[0]) + '">' + esc(c[1]) + '</button>'; })
      .join('');
  }
  $('catChips').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-cat]');
    if (!b) return;
    state.cat = b.dataset.cat; renderChips(); renderList();
  });
  $('search').addEventListener('input', function () { state.query = norm(this.value.trim()); renderList(); });

  function renderList() {
    var q = state.query;
    var rows = state.produits.map(function (p, i) { return [p, i]; }).filter(function (x) {
      var p = x[0];
      if (state.cat !== 'all' && p.categorie !== state.cat) return false;
      return !q || norm(p.nom + ' ' + p.grade + ' ' + p.normes + ' ' + (p.motscles || '')).indexOf(q) !== -1;
    });
    $('prodList').innerHTML = rows.length ? rows.map(function (x) {
      var p = x[0];
      return '<li><button type="button" data-i="' + x[1] + '">' + thumb(p)
        + '<span class="meta"><strong>' + esc(p.nom) + '</strong><span>' + esc(CAT_LABEL[p.categorie] || p.categorie) + '</span></span>'
        + (p.promo ? '<span class="tag">PROMO</span>' : '') + '</button></li>';
    }).join('') : '<li class="empty">Aucun produit trouvé.</li>';
  }
  $('prodList').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (b) openEditor(+b.dataset.i);
  });
  $('addProduct').addEventListener('click', function () { openEditor(-1); });

  // ---------- Fiche produit ----------
  var editor = $('editor');
  $('fCat').innerHTML = CATS.map(function (c) { return '<option value="' + c[0] + '">' + esc(c[1]) + '</option>'; }).join('');

  function openEditor(i, forcePromo) {
    var p = i >= 0 ? state.produits[i] : { categorie: state.cat !== 'all' ? state.cat : 'moteur', nom: '', grade: '', normes: '', image: '' };
    state.editing = i; state.pendingPhoto = null;
    $('editorTitle').textContent = i >= 0 ? 'Modifier le produit' : 'Nouveau produit';
    $('fNom').value = p.nom; $('fCat').value = p.categorie; $('fGrade').value = p.grade || '';
    $('fNormes').value = p.normes || ''; $('fBadge').value = p.badge || ''; $('fKw').value = p.motscles || '';
    $('fPromo').checked = !!p.promo || !!forcePromo; $('fPromoTexte').value = p.promo_texte || '';
    $('promoFields').hidden = !$('fPromo').checked;
    $('nomError').hidden = true;
    $('deleteProduct').hidden = i < 0;
    setPhotoPreview(p.image ? imgSrc(p) : '');
    $('photoInput').value = '';
    editor.showModal();
    if (forcePromo) setTimeout(function () { $('fPromoTexte').focus(); }, 50);
  }
  function setPhotoPreview(src) {
    $('photoPreview').innerHTML = src ? '<img src="' + esc(src) + '" alt="Aperçu de la photo">' : '<span>Pas de photo</span>';
  }
  $('editorClose').addEventListener('click', function () { editor.close(); });
  $('fPromo').addEventListener('change', function () {
    $('promoFields').hidden = !this.checked;
    if (this.checked) $('fPromoTexte').focus();
  });

  $('photoInput').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    $('photoPreview').innerHTML = '<span>Traitement…</span>';
    processImage(file).then(function (img) {
      var slug = norm($('fNom').value || 'produit').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'produit';
      var path = 'images/produits/' + slug + '-' + Date.now().toString(36) + '.' + img.ext;
      state.pendingPhoto = { path: path, data: img.dataUrl.split(',')[1], dataUrl: img.dataUrl };
      setPhotoPreview(img.dataUrl);
    }).catch(function () {
      setPhotoPreview('');
      toast('Impossible de lire cette photo. Essayez une photo JPEG ou PNG.', 'err');
    });
  });

  // Recadre la photo dans un carré 640×640 (produit centré, marge de 7 %) et l'allège.
  function processImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        var S = 640, pad = Math.round(S * 0.07), box = S - pad * 2;
        var scale = Math.min(box / im.naturalWidth, box / im.naturalHeight);
        var w = Math.round(im.naturalWidth * scale), h = Math.round(im.naturalHeight * scale);
        var c = document.createElement('canvas'); c.width = S; c.height = S;
        var ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(im, (S - w) / 2, (S - h) / 2, w, h);
        URL.revokeObjectURL(url);
        var webp = c.toDataURL('image/webp', 0.85);
        if (webp.indexOf('data:image/webp') === 0) return resolve({ dataUrl: webp, ext: 'webp' });
        // Navigateur sans encodage webp (anciens iPhone) : JPEG sur fond blanc
        var c2 = document.createElement('canvas'); c2.width = S; c2.height = S;
        var ctx2 = c2.getContext('2d'); ctx2.fillStyle = '#fff'; ctx2.fillRect(0, 0, S, S); ctx2.drawImage(c, 0, 0);
        resolve({ dataUrl: c2.toDataURL('image/jpeg', 0.85), ext: 'jpg' });
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
      im.src = url;
    });
  }

  $('editorForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var nom = $('fNom').value.trim();
    var clash = state.produits.some(function (p, i) { return i !== state.editing && norm(p.nom) === norm(nom); });
    if (!nom || clash) {
      $('nomError').textContent = !nom ? 'Le nom est obligatoire.' : 'Un autre produit porte déjà ce nom.';
      $('nomError').hidden = false; $('fNom').focus();
      return;
    }
    var old = state.editing >= 0 ? state.produits[state.editing] : {};
    var p = {
      categorie: $('fCat').value, badge: $('fBadge').value.trim(), nom: nom,
      grade: $('fGrade').value.trim(), normes: $('fNormes').value.trim(), motscles: $('fKw').value.trim(),
      promo: $('fPromo').checked, promo_texte: $('fPromo').checked ? $('fPromoTexte').value.trim() : '',
      image: old.image || ''
    };
    if (state.pendingPhoto) {
      var ph = state.pendingPhoto;
      p.image = '/' + ph.path;
      state.uploads[ph.path] = ph.data;
      state.previews[p.image] = ph.dataUrl;
    }
    if (state.editing >= 0) state.produits[state.editing] = p; else state.produits.push(p);
    state.dirty.produits = true;
    editor.close();
    renderAll();
    toast(state.editing >= 0 ? 'Produit modifié — pensez à publier' : 'Produit ajouté — pensez à publier', 'ok');
  });

  $('deleteProduct').addEventListener('click', function () {
    var p = state.produits[state.editing];
    if (!p || !confirm('Supprimer « ' + p.nom + ' » du catalogue ?')) return;
    state.produits.splice(state.editing, 1);
    state.dirty.produits = true;
    editor.close();
    renderAll();
    toast('Produit supprimé — pensez à publier', 'ok');
  });

  // ---------- Promotion ----------
  function renderPromo() {
    var c = state.contenu;
    $('bActif').checked = !!c.bandeau_actif;
    $('bTexte').value = c.bandeau_texte || '';
    $('bFin').value = c.bandeau_fin || '';
    updateBannerPreview();
    var promos = state.produits.map(function (p, i) { return [p, i]; }).filter(function (x) { return x[0].promo; });
    $('promoList').innerHTML = promos.length ? promos.map(function (x) {
      var p = x[0];
      return '<li><button type="button" data-i="' + x[1] + '">' + thumb(p)
        + '<span class="meta"><strong>' + esc(p.nom) + '</strong><span>' + esc(p.promo_texte || 'Sans texte') + '</span></span>'
        + '<span class="tag">PROMO</span></button></li>';
    }).join('') : '<li class="empty">Aucun produit en promotion.</li>';
  }
  function updateBannerPreview() {
    var t = $('bTexte').value.trim(), on = $('bActif').checked;
    var expired = $('bFin').value && $('bFin').value < new Date().toISOString().slice(0, 10);
    $('bCount').textContent = $('bTexte').value.length;
    var prev = $('bPreview');
    prev.className = 'banner-preview' + (on && t && !expired ? '' : ' off');
    prev.textContent = !on ? 'Bandeau désactivé — il n\'apparaît pas sur le site'
      : !t ? 'Écrivez le texte du bandeau'
      : expired ? 'Date de fin dépassée — le bandeau n\'apparaît plus' : t;
  }
  function onBannerChange() {
    state.contenu.bandeau_actif = $('bActif').checked;
    state.contenu.bandeau_texte = $('bTexte').value;
    state.contenu.bandeau_fin = $('bFin').value;
    state.dirty.contenu = true;
    updateBannerPreview(); renderPublishBar();
  }
  ['bActif', 'bTexte', 'bFin'].forEach(function (id) { $(id).addEventListener('input', onBannerChange); });
  $('bActif').addEventListener('change', onBannerChange);
  $('promoList').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (b) openEditor(+b.dataset.i);
  });

  var picker = $('picker');
  $('addPromo').addEventListener('click', function () { $('pickerSearch').value = ''; renderPicker(); picker.showModal(); });
  $('pickerClose').addEventListener('click', function () { picker.close(); });
  $('pickerSearch').addEventListener('input', renderPicker);
  function renderPicker() {
    var q = norm($('pickerSearch').value.trim());
    var rows = state.produits.map(function (p, i) { return [p, i]; })
      .filter(function (x) { return !x[0].promo && (!q || norm(x[0].nom).indexOf(q) !== -1); });
    $('pickerList').innerHTML = rows.map(function (x) {
      return '<li><button type="button" data-i="' + x[1] + '">' + thumb(x[0])
        + '<span class="meta"><strong>' + esc(x[0].nom) + '</strong><span>' + esc(CAT_LABEL[x[0].categorie]) + '</span></span></button></li>';
    }).join('') || '<li class="empty">Aucun produit.</li>';
  }
  $('pickerList').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (!b) return;
    picker.close();
    openEditor(+b.dataset.i, true);
  });

  // ---------- Infos ----------
  function renderInfos() {
    INFO_FIELDS.forEach(function (k) {
      var el = document.querySelector('#infosForm [name="' + k + '"]');
      if (el) el.value = state.contenu[k] || '';
    });
  }
  $('infosForm').addEventListener('input', function (e) {
    if (!e.target.name) return;
    state.contenu[e.target.name] = e.target.value;
    state.dirty.contenu = true;
    renderPublishBar();
  });

  // ---------- Publication ----------
  function isDirty() { return state.dirty.produits || state.dirty.contenu; }
  function renderPublishBar() {
    $('publishBar').hidden = !isDirty();
    $('pendingCount').textContent = 'Modifications';
  }
  $('discard').addEventListener('click', function () {
    if (!confirm('Annuler toutes les modifications non publiées ?')) return;
    state.produits = clone(state.saved.produits); state.contenu = clone(state.saved.contenu);
    state.dirty = { produits: false, contenu: false }; state.uploads = {}; state.previews = {};
    renderAll();
  });
  $('publish').addEventListener('click', function () {
    var btn = this;
    var body = { versions: state.versions };
    if (state.dirty.produits) {
      body.produits = state.produits;
      body.images = Object.keys(state.uploads).map(function (path) { return { path: path, data: state.uploads[path] }; });
    }
    if (state.dirty.contenu) body.contenu = state.contenu;
    btn.disabled = true; btn.textContent = 'Publication…';
    api('save', body).then(function () {
      toast('Publié ! Le site sera à jour dans 1 à 2 minutes.', 'ok');
      return load();
    }).catch(function (err) {
      if (err.status === 401) { toast('Session expirée : reconnectez-vous (vos modifications sont conservées tant que la page reste ouverte).', 'err'); showLogin(); return; }
      toast(err.message, 'err');
    }).then(function () { btn.disabled = false; btn.textContent = 'Publier sur le site'; });
  });

  window.addEventListener('beforeunload', function (e) {
    if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  load();
})();
