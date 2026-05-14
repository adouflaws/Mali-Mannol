(function () {
  fetch('/data/contenu.json')
    .then(function (r) { return r.json(); })
    .then(function (d) {

      // Telephone — tous les liens tel:
      document.querySelectorAll('a[href^="tel:"]').forEach(function (el) {
        var clean = d.phone.replace(/\s/g, '');
        el.href = 'tel:' + clean;
        el.textContent = d.phone;
      });

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

    })
    .catch(function () { /* contenu.json absent ou erreur — page affiche valeurs statiques */ });
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
        el.style.display = '';
      });
      document.querySelectorAll('[data-cms-bg="' + key + '"]').forEach(function (el) {
        el.style.backgroundImage = 'url(' + imgs[key] + ')';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      });
    });
  })
  .catch(function () {});

// Produits — charge produits.json et injecte les cartes dans chaque .prod-grid
fetch('/data/produits.json')
  .then(function (r) { return r.json(); })
  .then(function (data) {
    var bycat = {};
    data.produits.forEach(function (p) {
      if (!bycat[p.categorie]) bycat[p.categorie] = [];
      bycat[p.categorie].push(p);
    });
    Object.keys(bycat).forEach(function (cat) {
      var grid = document.querySelector('[data-cat="' + cat + '"] .prod-grid');
      if (!grid) return;
      grid.innerHTML = bycat[cat].map(function (p) {
        var normes = p.normes ? p.normes.split(',').map(function (n) {
          return '<span>' + n.trim() + '</span>';
        }).join('') : '';
        var vis = p.image
          ? '<img src="' + p.image + '" alt="' + p.nom + '" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:contain;">'
          : '<span class="label">' + (p.badge || '') + '</span>';
        var nom = p.nom.replace(/'/g, '&#39;');
        return '<article class="prod-card">'
          + '<div class="prod-vis">' + vis + '</div>'
          + '<h3>' + p.nom + '</h3>'
          + '<div class="grade">' + p.grade + '</div>'
          + '<div class="standards">' + normes + '</div>'
          + '<a class="ask" href="contact.html">Demander le prix</a>'
          + '<button class="btn-cart-add" onclick="if(window.__addToCart)window.__addToCart(\'' + nom + '\')">+ Ajouter au panier</button>'
          + '</article>';
      }).join('');
    });
  })
  .catch(function () {});

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

// Redirection vers /admin/ après connexion Netlify Identity
if (window.netlifyIdentity) {
  window.netlifyIdentity.on('init', function (user) {
    if (!user) {
      window.netlifyIdentity.on('login', function () {
        document.location.href = '/admin/';
      });
    }
  });
}
