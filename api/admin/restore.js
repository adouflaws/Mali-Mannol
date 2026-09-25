// Remet le catalogue et les infos du site dans l'état d'une version passée (un commit donné),
// en créant un NOUVEAU commit : rien n'est effacé de l'historique, on peut donc re-revenir.
const { send, configError, isAuthenticated, checkWriteRequest, readFile, commitFiles } = require('./_lib');
const { render, serialize } = require('../../scripts/render-produits');
const { validateProduits, validateContenu } = require('./save');

module.exports = async (req, res) => {
  const bad = checkWriteRequest(req);
  if (bad) return send(res, 405, { error: bad });
  const conf = configError();
  if (conf) return send(res, 500, { error: conf });
  if (!isAuthenticated(req)) return send(res, 401, { error: 'Session expirée, reconnectez-vous' });

  const ref = req.body && req.body.ref;
  const label = req.body && typeof req.body.label === 'string' ? req.body.label.replace(/[\r\n]/g, ' ').slice(0, 90) : '';
  if (!/^[0-9a-f]{40}$/.test(ref || '')) return send(res, 400, { error: 'Version invalide' });

  try {
    const [oldP, oldC, curC, page] = await Promise.all([
      readFile('data/produits.json', ref), readFile('data/contenu.json', ref),
      readFile('data/contenu.json'), readFile('produits.html')
    ]);
    // On revalide l'ancienne version avec les règles actuelles avant de la republier
    const produits = validateProduits(JSON.parse(oldP.text).produits);
    const contenu = validateContenu(JSON.parse(oldC.text), JSON.parse(curC.text));
    const data = { produits };
    const sha = await commitFiles([
      { path: 'data/produits.json', content: serialize(data) },
      { path: 'produits.html', content: render(page.text, data).html },
      { path: 'data/contenu.json', content: JSON.stringify(contenu, null, 2) + '\n' }
    ], 'admin: ' + (label || 'retour à la version ' + ref.slice(0, 7)));
    send(res, 200, { ok: true, commit: sha });
  } catch (e) {
    const fromGithub = /^GitHub /.test(e.message);
    send(res, fromGithub ? 502 : 400, { error: fromGithub ? 'Retour impossible (GitHub)' : e.message, detail: fromGithub ? e.message : undefined });
  }
};
