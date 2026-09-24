(function () {
  fetch('/data/contenu.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {

      // Telephone — tous les liens tel: (sauf le bouton flottant, qui garde son emoji)
      document.querySelectorAll('a[href^="tel:"]:not(.fab-tel)').forEach(function (el) {
        var clean = d.phone.replace(/\s/g, '');
        el.href = 'tel:' + clean;
        el.textContent = d.phone;
      });
      var telFab = document.querySelector('a.fab-tel[href^="tel:"]');
      if (telFab) telFab.href = 'tel:' + d.phone.replace(/\s/g, '');

      // WhatsApp — tous les liens wa.me (preserve le ?text= du panier)
      document.querySelectorAll('a[href*="wa.me/"]').forEach(function (el) {
        var search = el.href.indexOf('?') !== -1 ? el.href.slice(el.href.indexOf('?')) : '';
        el.href = 'https://wa.me/' + d.whatsapp + search;
      });

      // Email — tous les liens mailto:
      document.querySelectorAll('a[href^="mailto:"]').forEach(function (el) {
        el.href = 'mailto:' + d.email;
        if (el.textContent.indexOf('@') !== -1) el.textContent = d.email;
      });

      // Adresse — elements avec data-cms="adresse"
      document.querySelectorAll('[data-cms="adresse"]').forEach(function (el) {
        el.textContent = d.adresse;
      });

      // Horaires
      document.querySelectorAll('[data-cms="horaires"]').forEach(function (el) {
        el.textContent = d.horaires;
      });

      // Hero titre (index.html uniquement)
      var heroH1 = document.querySelector('.hero-copy h1');
      if (heroH1 && d.hero_titre) {
        heroH1.textContent = d.hero_titre;
      }

      // Hero description (index.html uniquement)
      var heroLede = document.querySelector('.hero-copy p.lede');
      if (heroLede && d.hero_description) {
        heroLede.textContent = d.hero_description;
      }

      // Description courte (footer de toutes les pages)
      document.querySelectorAll('[data-cms="apropos-court"]').forEach(function (el) {
        el.textContent = d.apropos_court;
      });

      // Mettre a jour le numero dans le script panier si present
      if (window.__cartWA !== undefined) window.__cartWA = d.whatsapp;

      // Bandeau de promotion (gere depuis /admin), en haut de toutes les pages
      showPromoBanner(d);

    })
    .catch(function () { /* contenu.json absent ou erreur — page affiche valeurs statiques */ });

  function showPromoBanner(d) {
    if (!d.bandeau_actif || !d.bandeau_texte) return;
    var today = new Date().toISOString().slice(0, 10); // Bamako = UTC
    if (d.bandeau_fin && today > d.bandeau_fin) return;
    var key = 'mm_banner_closed';
    try { if (sessionStorage.getItem(key) === d.bandeau_texte) return; } catch (e) {}
    var header = document.querySelector('.site-header');
    if (!header || header.querySelector('.promo-banner')) return;

    var bar = document.createElement('div');
    bar.className = 'promo-banner';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Promotion');
    var text = document.createElement('p');
    text.textContent = d.bandeau_texte;
    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Masquer la promotion');
    close.innerHTML = '&#10005;';
    close.addEventListener('click', function () {
      bar.remove();
      try { sessionStorage.setItem(key, d.bandeau_texte); } catch (e) {}
      window.dispatchEvent(new Event('resize')); // recalcule --header-h
    });
    bar.appendChild(text);
    bar.appendChild(close);
    header.insertBefore(bar, header.firstChild);
    window.dispatchEvent(new Event('resize'));
  }
})();

// Images — injecte les images depuis data/images.json
// Pour utiliser : <img data-cms-src="hero" src="" alt="...">
//                 <div data-cms-bg="about"></div>  (pour background-image)
fetch('/data/images.json')
  .then(function (r) { return r.json(); })
  .then(function (imgs) {
    Object.keys(imgs).forEach(function (key) {
      if (!imgs[key]) return;
      document.querySelectorAll('[data-cms-src="' + key + '"]').forEach(function (el) {
        el.src = imgs[key];
        el.style.display = 'block';
      });
      document.querySelectorAll('[data-cms-bg="' + key + '"]').forEach(function (el) {
        el.style.backgroundImage = 'url(' + imgs[key] + ')';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      });
    });
  })
  .catch(function () {});

// Produits — les fiches sont generees statiquement dans produits.html depuis data/produits.json
// (voir scripts/build-produits.js). Relancer ce script apres toute modification du JSON.

// Services — charge services.json et injecte titres, descriptions, points
fetch('/data/services.json')
  .then(function (r) { return r.json(); })
  .then(function (svcs) {
    for (var i = 1; i <= 6; i++) {
      var s = svcs['svc' + i];
      if (!s) continue;
      var titre = document.querySelector('[data-cms="svc' + i + '-titre"]');
      var desc  = document.querySelector('[data-cms="svc' + i + '-desc"]');
      var ul    = document.querySelector('[data-cms="svc' + i + '-ul"]');
      if (titre) titre.textContent = s.titre;
      if (desc)  desc.textContent  = s.description;
      if (ul && s.points) {
        ul.innerHTML = s.points.split('\n')
          .filter(function (p) { return p.trim(); })
          .map(function (p) { return '<li>' + p.trim() + '</li>'; })
          .join('');
      }
    }
  })
  .catch(function () {});
