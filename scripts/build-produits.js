// Regenere le HTML statique du catalogue (produits.html) a partir de data/produits.json.
// A relancer manuellement apres toute modification de data/produits.json :
//   node scripts/build-produits.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/produits.json'), 'utf8'));
const htmlPath = path.join(root, 'produits.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const bycat = {};
data.produits.forEach(function (p) {
  if (!bycat[p.categorie]) bycat[p.categorie] = [];
  bycat[p.categorie].push(p);
});

function cardHtml(p) {
  var normes = p.normes
    ? p.normes.split(',').map(function (n) { return '<span>' + n.trim() + '</span>'; }).join('')
    : '';
  var nom = p.nom.replace(/'/g, '&#39;');
  var vis = p.image
    ? '<img src="' + p.image + '" alt="' + p.nom + '" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:contain;">'
    : '<span class="label">' + (p.badge || '') + '</span>';
  return '<article class="prod-card">'
    + '<div class="prod-vis' + (p.image ? ' has-image' : '') + '">' + vis + '</div>'
    + '<h3>' + p.nom + '</h3>'
    + '<div class="grade">' + p.grade + '</div>'
    + '<div class="standards">' + normes + '</div>'
    + '<a class="ask" href="contact.html">Demander le prix</a>'
    + '<button class="btn-cart-add" onclick="if(window.__addToCart)window.__addToCart(\'' + nom + '\')">+ Ajouter au panier</button>'
    + '</article>';
}

var totalReplaced = 0;
html = html.replace(
  /(<div class="prod-cat" data-cat="([a-z]+)"[^>]*>[\s\S]*?<div class="prod-grid">)([\s\S]*?)(<\/div>)/g,
  function (match, before, cat, _current, after) {
    var products = bycat[cat] || [];
    totalReplaced++;
    return before + products.map(cardHtml).join('') + after;
  }
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Categories mises a jour :', totalReplaced);
console.log('Produits injectes :', data.produits.length);
