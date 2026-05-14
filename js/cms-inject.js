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
