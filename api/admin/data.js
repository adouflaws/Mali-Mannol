// Renvoie le contenu éditable, lu directement dans le dépôt GitHub (toujours la dernière version).
const { send, configError, isAuthenticated, readFile } = require('./_lib');

module.exports = async (req, res) => {
  const conf = configError();
  if (conf) return send(res, 500, { error: conf });
  if (!isAuthenticated(req)) return send(res, 401, { error: 'Non connecté' });
  try {
    const [produits, contenu] = await Promise.all([readFile('data/produits.json'), readFile('data/contenu.json')]);
    send(res, 200, {
      produits: JSON.parse(produits.text).produits,
      contenu: JSON.parse(contenu.text),
      versions: { produits: produits.sha, contenu: contenu.sha }
    });
  } catch (e) {
    send(res, 502, { error: 'Lecture impossible depuis GitHub', detail: e.message });
  }
};
