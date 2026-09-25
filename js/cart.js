// Panier WhatsApp — partagé par toutes les pages.
// Le bouton panier n'apparaît hors de produits.html que s'il contient au moins un article.
(function () {
  var KEY = 'mannol_cart';
  var KEY_CLIENT = 'mannol_client';
  var WA_DEFAULT = '22366739612';

  // Formats proposés au client : ce sont des souhaits, confirmés ensuite par Mali Mannol.
  var FORMATS = {
    moteur: ['1 L', '4 à 5 L', '20 L', 'Fût 208 L'],
    trans:  ['1 L', '4 à 5 L', '20 L', 'Fût 208 L'],
    pl:     ['1 L', '4 à 5 L', '20 L', 'Fût 208 L'],
    moto:   ['1 L', '4 L']
  };
  var FORMAT_DEFAULT = 'À conseiller';
  var PROFILS = ['Particulier', 'Garage / mécanicien', 'Revendeur', 'Flotte / entreprise'];
  var RECEPTION = ['Retrait à Badalabougou', 'Retrait à Mannol Zérny', 'Livraison (à discuter)'];

  var isCatalogue = !!document.querySelector('.prod-grid');

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  var KEY_SENT = 'mannol_cart_sent';
  function load() { return read(KEY, []); }
  // Toute modification du panier annule l'état "commande envoyée"
  function save(c) { write(KEY, c); setSent(false); }
  function isSent() { return !!read(KEY_SENT, 0); }
  function setSent(on) {
    try { on ? localStorage.setItem(KEY_SENT, JSON.stringify(Date.now())) : localStorage.removeItem(KEY_SENT); } catch (e) {}
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function options(list, current, placeholder) {
    return (placeholder ? '<option value="">' + placeholder + '</option>' : '')
      + list.map(function (o) {
        return '<option' + (o === current ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('');
  }

  // ---------- Markup ----------
  var ICON_BAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>';
  var ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.2.2 2.1 3.2 5 4.5 2.9 1.3 2.9.9 3.4.8.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.2-.2-.5-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 4.9L2 22l5.3-1.3c1.4.7 3 1.1 4.7 1.1 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>';

  var root = document.createElement('div');
  root.innerHTML =
    '<button class="cart-fab" id="cartFab" type="button" aria-label="Voir le panier" hidden>' + ICON_BAG
    + '<span class="cart-badge" id="cartBadge">0</span></button>'
    + '<div class="cart-overlay" id="cartOverlay"></div>'
    + '<div class="cart-drawer" id="cartDrawer" role="dialog" aria-modal="true" aria-labelledby="cartTitle" aria-hidden="true">'
    +   '<div class="cart-head"><h3 id="cartTitle">Mon panier</h3>'
    +   '<button class="cart-close-btn" id="cartClose" type="button" aria-label="Fermer le panier">&#10005;</button></div>'
    +   '<div class="cart-body" id="cartBody"></div>'
    +   '<div class="cart-foot" id="cartFoot" hidden>'
    +     '<fieldset class="cart-client"><legend>Vos informations</legend>'
    +       '<label><span>Nom <span class="cart-req" aria-hidden="true">*</span></span><input id="ccNom" type="text" autocomplete="name" required></label>'
    +       '<span class="cart-err" id="ccNomErr" hidden>Indiquez votre nom pour que l\'on puisse vous répondre.</span>'
    +       '<label>Vous êtes<select id="ccProfil">' + options(PROFILS, '', 'Choisir…') + '</select></label>'
    +       '<label>Quartier / ville<input id="ccLieu" type="text" autocomplete="address-level2" placeholder="ex. Kalaban Coura, Ségou…"></label>'
    +       '<label>Réception<select id="ccRecep">' + options(RECEPTION, '', 'Choisir…') + '</select></label>'
    +     '</fieldset>'
    +     '<p class="cart-note">Prix, formats et disponibilité confirmés par Mali Mannol sur WhatsApp.</p>'
    +     '<a class="btn-wa-order" id="cartWa" href="https://wa.me/' + WA_DEFAULT + '" target="_blank" rel="noopener">' + ICON_WA + 'Envoyer la commande par WhatsApp</a>'
    +   '</div>'
    + '</div>'
    + '<div class="cart-toast" id="cartToast" role="status" aria-live="polite"></div>';
  while (root.firstChild) document.body.appendChild(root.firstChild);

  var $ = function (id) { return document.getElementById(id); };
  var fab = $('cartFab'), badge = $('cartBadge'), drawer = $('cartDrawer'), overlay = $('cartOverlay');
  var body = $('cartBody'), foot = $('cartFoot'), toast = $('cartToast');
  var fields = { nom: $('ccNom'), profil: $('ccProfil'), lieu: $('ccLieu'), recep: $('ccRecep') };

  // ---------- Infos client (mémorisées pour la prochaine commande) ----------
  var client = read(KEY_CLIENT, {});
  Object.keys(fields).forEach(function (k) {
    if (client[k]) fields[k].value = client[k];
    fields[k].addEventListener('input', function () {
      client[k] = fields[k].value.trim();
      write(KEY_CLIENT, client);
      if (k === 'nom' && client.nom) setNomError(false);
    });
  });
  function setNomError(on) {
    $('ccNomErr').hidden = !on;
    fields.nom.setAttribute('aria-invalid', on ? 'true' : 'false');
  }

  // ---------- Panier ----------
  // Catégorie, formats vendus (choisis dans l'admin) et disponibilité, lus sur la carte du catalogue
  function cardInfo(name) {
    var cards = document.querySelectorAll('.prod-card');
    for (var i = 0; i < cards.length; i++) {
      var h = cards[i].querySelector('h3');
      if (h && h.textContent.trim() === name) {
        var cat = cards[i].closest('.prod-cat');
        return {
          cat: cat ? cat.dataset.cat : '',
          fm: cards[i].dataset.formats ? cards[i].dataset.formats.split('|') : [],
          sc: cards[i].dataset.dispo === 'commande'
        };
      }
    }
    return { cat: '', fm: [], sc: false };
  }
  function formatsOf(item) { return item.fm && item.fm.length ? item.fm : FORMATS[item.cat]; }

  function addToCart(name) {
    var c = load();
    var ex = c.find(function (i) { return i.n === name; });
    if (ex) { ex.q++; } else {
      var info = cardInfo(name);
      // Un seul format vendu : il est présélectionné
      c.push({ n: name, q: 1, cat: info.cat, fm: info.fm, sc: info.sc, f: info.fm.length === 1 ? info.fm[0] : FORMAT_DEFAULT });
    }
    save(c); refresh();
    showToast(name);
    fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump');
  }
  window.__addToCart = addToCart;

  function refresh() {
    var c = load();
    var total = c.reduce(function (s, i) { return s + i.q; }, 0);
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
    fab.hidden = !isCatalogue && total === 0;
    document.body.classList.toggle('has-cart', !fab.hidden);
    fab.setAttribute('aria-label', total ? 'Voir le panier (' + total + ' article' + (total > 1 ? 's' : '') + ')' : 'Voir le panier');

    if (c.length === 0) {
      body.innerHTML = '<p class="cart-empty">Votre panier est vide.<br/>'
        + (isCatalogue ? 'Ajoutez des produits depuis le catalogue.' : '<a href="/produits.html">Voir le catalogue</a>') + '</p>';
      foot.hidden = true;
      return;
    }
    var sent = isSent()
      ? '<div class="cart-sent" role="status"><p><strong>Commande ouverte dans WhatsApp.</strong> '
        + 'Pensez à appuyer sur « Envoyer » dans WhatsApp. C\'est fait ?</p>'
        + '<div><button type="button" data-sent="clear">Oui, vider le panier</button>'
        + '<button type="button" data-sent="keep">Garder</button></div></div>'
      : '';
    body.innerHTML = sent + c.map(function (item, idx) {
      var formats = formatsOf(item);
      return '<div class="cart-item">'
        + '<div class="cart-item-main">'
        +   '<div class="cart-item-name">' + esc(item.n) + (item.sc ? ' <span class="cart-sc">sur commande</span>' : '') + '</div>'
        +   (formats
              ? '<label class="cart-item-format">Format souhaité<select data-fmt="' + idx + '">'
                + options([FORMAT_DEFAULT].concat(formats), item.f || FORMAT_DEFAULT) + '</select></label>'
              : '')
        + '</div>'
        + '<div class="cart-item-ctrl">'
        +   '<button type="button" data-act="dec" data-i="' + idx + '" aria-label="Diminuer la quantité de ' + esc(item.n) + '">&#8722;</button>'
        +   '<span aria-live="polite">' + item.q + '</span>'
        +   '<button type="button" data-act="inc" data-i="' + idx + '" aria-label="Augmenter la quantité de ' + esc(item.n) + '">+</button>'
        +   '<button type="button" class="ci-rm" data-act="rm" data-i="' + idx + '" aria-label="Retirer ' + esc(item.n) + '">&#10005;</button>'
        + '</div></div>';
    }).join('');
    foot.hidden = false;
  }

  function buildMessage() {
    var c = load();
    var lines = c.map(function (i) {
      var fmt = formatsOf(i) ? ' · format : ' + (i.f || FORMAT_DEFAULT) : '';
      return '- ' + i.n + ' × ' + i.q + fmt + (i.sc ? ' (sur commande)' : '');
    });
    var info = [
      ['Nom', client.nom], ['Profil', client.profil],
      ['Quartier / ville', client.lieu], ['Réception', client.recep]
    ].filter(function (r) { return r[1]; }).map(function (r) { return r[0] + ' : ' + r[1]; });
    return 'Bonjour Mali Mannol,\n\nJe souhaite commander :\n' + lines.join('\n')
      + (info.length ? '\n\n' + info.join('\n') : '')
      + '\n\nMerci de me confirmer les prix et la disponibilité.';
  }

  body.addEventListener('click', function (e) {
    var s = e.target.closest('button[data-sent]');
    if (s) {
      if (s.dataset.sent === 'clear') {
        save([]); refresh();
        body.innerHTML = '<p class="cart-empty"><strong>Merci !</strong><br/>Mali Mannol vous répond sur WhatsApp avec les prix.</p>';
        setTimeout(closeCart, 2200);
      } else {
        setSent(false); refresh();
      }
      return;
    }
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    var i = +b.dataset.i, c = load();
    if (!c[i]) return;
    if (b.dataset.act === 'inc') c[i].q++;
    else if (b.dataset.act === 'dec') { if (c[i].q > 1) c[i].q--; else c.splice(i, 1); }
    else c.splice(i, 1);
    save(c); refresh();
    // garde le focus sur la même ligne après re-rendu (clavier / lecteur d'écran)
    var same = body.querySelector('button[data-act="' + b.dataset.act + '"][data-i="' + i + '"]');
    (same || fields.nom).focus({ preventScroll: true });
  });
  body.addEventListener('change', function (e) {
    var s = e.target.closest('select[data-fmt]');
    if (!s) return;
    var c = load(), i = +s.dataset.fmt;
    if (c[i]) { c[i].f = s.value; save(c); }
  });

  $('cartWa').addEventListener('click', function (e) {
    if (!client.nom) {
      e.preventDefault();
      setNomError(true);
      fields.nom.focus();
      return;
    }
    var wa = window.__cartWA || WA_DEFAULT;
    this.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(buildMessage());
    setSent(true);
    try { sessionStorage.removeItem(KEY_SENT); } catch (err) {}
    setTimeout(refresh, 400);
  });

  // Au retour depuis WhatsApp, rouvrir le panier une fois pour proposer de le vider
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !isSent() || !load().length) return;
    try {
      if (sessionStorage.getItem(KEY_SENT)) return;
      sessionStorage.setItem(KEY_SENT, '1');
    } catch (err) {}
    refresh();
    if (!drawer.classList.contains('open')) openCart();
  });

  // ---------- Ouverture / fermeture ----------
  var lastFocus = null;
  function openCart() {
    lastFocus = document.activeElement;
    drawer.classList.add('open'); overlay.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    hideToast();
    $('cartClose').focus();
  }
  function closeCart() {
    drawer.classList.remove('open'); overlay.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  fab.addEventListener('click', openCart);
  $('cartClose').addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeCart();
  });

  // ---------- Retour visuel à l'ajout (sans ouvrir le panier) ----------
  var toastTimer;
  function showToast(name) {
    toast.innerHTML = '<span><strong>✓</strong> ' + esc(name) + ' ajouté</span>'
      + '<button type="button" id="cartToastOpen">Voir le panier</button>';
    toast.classList.add('show');
    $('cartToastOpen').addEventListener('click', openCart);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 4000);
  }
  function hideToast() { toast.classList.remove('show'); }

  // ---------- Boutons "Ajouter au panier" du catalogue ----------
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.btn-cart-add[data-add]');
    if (!b) return;
    addToCart(b.dataset.add);
    var label = b.dataset.label || (b.dataset.label = b.textContent);
    b.classList.add('is-added');
    b.textContent = '✓ Ajouté';
    clearTimeout(b._t);
    b._t = setTimeout(function () { b.classList.remove('is-added'); b.textContent = label; }, 1600);
  });

  // Panier modifié dans un autre onglet
  window.addEventListener('storage', function (e) { if (e.key === KEY) refresh(); });

  refresh();
})();
