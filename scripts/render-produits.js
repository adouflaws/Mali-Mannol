// Génère les cartes du catalogue dans produits.html à partir de data/produits.json.
// Module partagé : utilisé par scripts/build-produits.js (en local / GitHub Action)
// et par l'API de l'admin (api/admin/save.js) pour publier en un seul commit.

var CATEGORIES = ['moteur', 'trans', 'pl', 'moto', 'fluides', 'additifs', 'graisses', 'carcare'];

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Formats proposés dans l'admin (le client coche ceux qu'il vend vraiment)
var FORMATS = ['250 ml', '500 ml', '1 L', '4 L', '5 L', '20 L', '60 L', '208 L (fût)', '400 g', '1 kg', '18 kg'];
var DISPO_LABEL = { commande: 'Sur commande', rupture: 'Rupture de stock' };
var WA_DEFAULT = '22366739612'; // remplacé au chargement par le numéro de contenu.json (cms-inject.js)

function cardHtml(p) {
  var normes = p.normes
    ? p.normes.split(',').map(function (n) { return n.trim(); }).filter(Boolean)
        .map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('')
    : '';
  var promo = !!p.promo;
  var dispo = DISPO_LABEL[p.dispo] ? p.dispo : '';
  var formats = Array.isArray(p.formats) ? p.formats.filter(Boolean) : [];
  var kwParts = [p.motscles || ''];
  if (promo) kwParts.push('promo promotion');
  var kw = kwParts.join(' ').trim();
  var vis = p.image
    ? '<img src="' + esc(p.image) + '" alt="' + esc(p.nom) + '" loading="lazy" referrerpolicy="no-referrer">'
    : '<span class="label">' + esc(p.badge || '') + '</span>';
  var action = dispo === 'rupture'
    ? '<a class="btn-cart-add btn-notify" href="https://wa.me/' + WA_DEFAULT + '?text='
        + encodeURIComponent('Bonjour Mali Mannol, pouvez-vous me prévenir quand « ' + p.nom + ' » sera de nouveau disponible ?')
        + '" target="_blank" rel="noopener">Me prévenir sur WhatsApp</a>'
    : '<button type="button" class="btn-cart-add" data-add="' + esc(p.nom) + '">+ Ajouter au panier</button>';
  return '<article class="prod-card' + (promo ? ' is-promo' : '') + (dispo ? ' is-' + dispo : '') + '"'
    + (kw ? ' data-kw="' + esc(kw) + '"' : '')
    + (formats.length ? ' data-formats="' + esc(formats.join('|')) + '"' : '')
    + (dispo ? ' data-dispo="' + dispo + '"' : '') + '>'
    + '<div class="prod-vis' + (p.image ? ' has-image' : '') + '">' + vis
    + (promo ? '<span class="promo-tag">Promo</span>' : '')
    + (dispo ? '<span class="dispo-tag">' + DISPO_LABEL[dispo] + '</span>' : '') + '</div>'
    + '<h3>' + esc(p.nom) + '</h3>'
    + '<div class="grade">' + esc(p.grade) + '</div>'
    + (promo && p.promo_texte ? '<p class="promo-text">' + esc(p.promo_texte) + '</p>' : '')
    + (formats.length ? '<p class="formats"><span>Formats :</span> ' + formats.map(esc).join(' · ') + '</p>' : '')
    + '<div class="standards">' + normes + '</div>'
    + action
    + '</article>';
}

// Trouve l'index de la balise </div> qui ferme exactement la balise <div class="prod-grid">
// ouverte à gridOpenEnd, en comptant la profondeur des <div> imbriqués (les cartes
// produit contiennent elles-mêmes plusieurs <div> non balancés par un regex naïf).
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

function render(html, data) {
  var bycat = {};
  data.produits.forEach(function (p) {
    if (!bycat[p.categorie]) bycat[p.categorie] = [];
    bycat[p.categorie].push(p);
  });
  // Produits en promo en tête de leur catégorie (tri stable : l'ordre relatif est conservé)
  Object.keys(bycat).forEach(function (c) {
    bycat[c] = bycat[c].map(function (p, i) { return [p, i]; })
      .sort(function (a, b) { return (b[0].promo ? 1 : 0) - (a[0].promo ? 1 : 0) || a[1] - b[1]; })
      .map(function (x) { return x[0]; });
  });

  var catOpenRe = /<div class="prod-cat" data-cat="([a-z]+)"[^>]*>/g;
  var out = '';
  var cursor = 0;
  var categories = 0;
  var catMatch;
  while ((catMatch = catOpenRe.exec(html))) {
    var gridOpenRe = /<div class="prod-grid">/g;
    gridOpenRe.lastIndex = catOpenRe.lastIndex;
    var gridOpenMatch = gridOpenRe.exec(html);
    if (!gridOpenMatch) continue;
    var gridOpenEnd = gridOpenMatch.index + gridOpenMatch[0].length;
    var gridCloseIndex = findGridCloseIndex(html, gridOpenEnd);
    out += html.slice(cursor, gridOpenEnd) + (bycat[catMatch[1]] || []).map(cardHtml).join('');
    cursor = gridCloseIndex;
    categories++;
    catOpenRe.lastIndex = gridCloseIndex;
  }
  out += html.slice(cursor);

  var cards = (out.match(/<article class="prod-card/g) || []).length;
  if (cards !== data.produits.length) {
    throw new Error('Cartes générées (' + cards + ') ≠ produits (' + data.produits.length + ')');
  }
  return { html: out, categories: categories, cards: cards };
}

// Sérialise produits.json avec une ligne par produit (diffs git lisibles)
var KEY_ORDER = ['categorie', 'badge', 'nom', 'grade', 'normes', 'motscles', 'formats', 'dispo', 'promo', 'promo_texte', 'image'];
function serialize(data) {
  var lines = [];
  var prevCat = null;
  data.produits.forEach(function (p, i) {
    if (prevCat && p.categorie !== prevCat) lines.push('');
    prevCat = p.categorie;
    var keys = KEY_ORDER.filter(function (k) { return p[k] !== undefined; })
      .concat(Object.keys(p).filter(function (k) { return KEY_ORDER.indexOf(k) === -1; }));
    var body = keys.map(function (k) { return JSON.stringify(k) + ': ' + JSON.stringify(p[k]); }).join(', ');
    lines.push('    { ' + body + ' }' + (i < data.produits.length - 1 ? ',' : ''));
  });
  return '{\n  "produits": [\n' + lines.join('\n') + '\n  ]\n}\n';
}

module.exports = { render: render, serialize: serialize, esc: esc, CATEGORIES: CATEGORIES, FORMATS: FORMATS, DISPOS: ['stock', 'commande', 'rupture'] };
