// Regénère le HTML statique du catalogue (produits.html) à partir de data/produits.json.
// Lancé automatiquement par la GitHub Action (.github/workflows/build-produits.yml)
// et par l'admin lors d'une publication. En local :
//   node scripts/build-produits.js
const fs = require('fs');
const path = require('path');
const { render } = require('./render-produits');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/produits.json'), 'utf8'));
const htmlPath = path.join(root, 'produits.html');

const result = render(fs.readFileSync(htmlPath, 'utf8'), data);
fs.writeFileSync(htmlPath, result.html, 'utf8');

console.log('Categories mises a jour :', result.categories);
console.log('Produits injectes :', data.produits.length);
console.log('Cartes .prod-card dans le fichier final :', result.cards, '(OK)');
