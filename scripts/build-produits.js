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
    ? '<img src="' + p.image + '" alt="' + p.nom + '" loading="lazy" referrerpolicy="no-referrer">'
    : '<span class="label">' + (p.badge || '') + '</span>';
  return '<article class="prod-card">'
    + '<div class="prod-vis' + (p.image ? ' has-image' : '') + '">' + vis + '</div>'
    + '<h3>' + p.nom + '</h3>'
    + '<div class="grade">' + p.grade + '</div>'
    + '<div class="standards">' + normes + '</div>'
    + '<a class="ask" href="contact.html?produit=' + encodeURIComponent(p.nom) + '">Demander le prix</a>'
    + '<button class="btn-cart-add" onclick="if(window.__addToCart)window.__addToCart(\'' + nom + '\')">+ Ajouter au panier</button>'
    + '</article>';
}

// Trouve l'index de la balise </div> qui ferme exactement la balise <div class="prod-grid">
// ouverte a gridOpenEnd, en comptant la profondeur des <div> imbriques (les cartes
// produit contiennent elles-memes plusieurs <div> non balances par un regex naif).
function findGridCloseIndex(html, gridOpenEnd) {
  var tagRe = /<div\b|<\/div>/g;
  tagRe.lastIndex = gridOpenEnd;
  var depth = 1;
  var m;
  while ((m = tagRe.exec(html))) {
    if (m[0] === '<div' || m[0].indexOf('<div') === 0) depth++;
    else depth--;
    if (depth === 0) return m.index;
  }
  throw new Error('Balise </div> de fermeture introuvable pour .prod-grid');
}

var catOpenRe = /<div class="prod-cat" data-cat="([a-z]+)"[^>]*>/g;
var totalReplaced = 0;
var out = '';
var cursor = 0;
var catMatch;

while ((catMatch = catOpenRe.exec(html))) {
  var cat = catMatch[1];
  var gridOpenRe = /<div class="prod-grid">/g;
  gridOpenRe.lastIndex = catOpenRe.lastIndex;
  var gridOpenMatch = gridOpenRe.exec(html);
  if (!gridOpenMatch) continue;

  var gridOpenEnd = gridOpenMatch.index + gridOpenMatch[0].length;
  var gridCloseIndex = findGridCloseIndex(html, gridOpenEnd);

  var products = bycat[cat] || [];
  out += html.slice(cursor, gridOpenEnd) + products.map(cardHtml).join('');
  cursor = gridCloseIndex;
  totalReplaced++;

  catOpenRe.lastIndex = gridCloseIndex;
}
out += html.slice(cursor);
html = out;

fs.writeFileSync(htmlPath, html, 'utf8');

var finalCardCount = (html.match(/class="prod-card"/g) || []).length;
console.log('Categories mises a jour :', totalReplaced);
console.log('Produits injectes :', data.produits.length);
console.log('Cartes .prod-card dans le fichier final :', finalCardCount, finalCardCount === data.produits.length ? '(OK)' : '(MISMATCH !)');
