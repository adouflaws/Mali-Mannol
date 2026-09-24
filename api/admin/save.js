// Publie les modifications de l'admin : un seul commit GitHub contenant produits.json,
// contenu.json, les nouvelles photos et produits.html regénéré. Vercel redéploie ensuite le site.
const { send, configError, isAuthenticated, checkWriteRequest, readFile, commitFiles } = require('./_lib');
const { render, serialize, CATEGORIES } = require('../../scripts/render-produits');

const CONTENU_FIELDS = {
  phone: 40, whatsapp: 20, email: 120, adresse: 200, horaires: 200,
  hero_titre: 120, hero_description: 400, apropos_court: 200,
  bandeau_texte: 160, bandeau_fin: 10
};
const IMAGE_PATH = /^\/images\/produits\/[a-z0-9][a-z0-9._-]{0,80}\.(webp|png|jpe?g)$/i;
const UPLOAD_PATH = /^images\/produits\/[a-z0-9][a-z0-9-]{0,80}\.(webp|jpg)$/;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

function str(v, max, field) {
  if (v == null) v = '';
  if (typeof v !== 'string') throw new Error('Champ invalide : ' + field);
  v = v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim();
  if (v.length > max) throw new Error('« ' + field + ' » est trop long (' + max + ' caractères max)');
  return v;
}

function validateProduits(list) {
  if (!Array.isArray(list) || list.length > 400) throw new Error('Liste de produits invalide');
  const names = new Set();
  return list.map((p, i) => {
    const n = i + 1;
    const out = {
      categorie: str(p.categorie, 20, 'catégorie'),
      badge: str(p.badge, 30, 'badge'),
      nom: str(p.nom, 80, 'nom'),
      grade: str(p.grade, 140, 'description'),
      normes: str(p.normes, 220, 'normes'),
      motscles: str(p.motscles, 220, 'mots-clés'),
      promo: p.promo === true,
      promo_texte: str(p.promo_texte, 70, 'texte promo'),
      image: str(p.image, 120, 'photo')
    };
    if (!CATEGORIES.includes(out.categorie)) throw new Error('Produit ' + n + ' : catégorie inconnue');
    if (!out.nom) throw new Error('Produit ' + n + ' : le nom est obligatoire');
    const key = out.nom.toLowerCase();
    if (names.has(key)) throw new Error('Deux produits portent le nom « ' + out.nom + ' »');
    names.add(key);
    if (out.image && !IMAGE_PATH.test(out.image)) throw new Error('Produit « ' + out.nom + ' » : chemin de photo invalide');
    if (!out.promo) out.promo_texte = '';
    // Pas de champs vides inutiles dans le JSON
    ['badge', 'motscles', 'promo_texte'].forEach(k => { if (!out[k]) delete out[k]; });
    if (!out.promo) delete out.promo;
    return out;
  });
}

function validateContenu(c, current) {
  if (!c || typeof c !== 'object') throw new Error('Contenu invalide');
  const out = { ...current };
  Object.keys(CONTENU_FIELDS).forEach(k => { out[k] = str(c[k], CONTENU_FIELDS[k], k); });
  out.bandeau_actif = c.bandeau_actif === true;
  if (!/^\d{8,15}$/.test(out.whatsapp)) throw new Error('Numéro WhatsApp : chiffres uniquement, indicatif compris (ex. 22366739612)');
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) throw new Error('Adresse email invalide');
  if (out.bandeau_fin && !/^\d{4}-\d{2}-\d{2}$/.test(out.bandeau_fin)) throw new Error('Date de fin du bandeau invalide');
  if (out.bandeau_actif && !out.bandeau_texte) throw new Error('Le bandeau est activé mais son texte est vide');
  return out;
}

function decodeImage(img, referenced) {
  if (!img || !UPLOAD_PATH.test(img.path)) throw new Error('Nom de fichier photo invalide');
  if (!referenced.has('/' + img.path)) return null; // photo remplacée avant publication : inutile de l'envoyer
  const buf = Buffer.from(String(img.data || ''), 'base64');
  if (!buf.length || buf.length > MAX_IMAGE_BYTES) throw new Error('Photo trop lourde (1,5 Mo max)');
  const isWebp = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
  if (img.path.endsWith('.webp') ? !isWebp : !isJpeg) throw new Error('Le fichier photo est corrompu');
  return { path: img.path, content: buf };
}

module.exports = async (req, res) => {
  const bad = checkWriteRequest(req);
  if (bad) return send(res, 405, { error: bad });
  const conf = configError();
  if (conf) return send(res, 500, { error: conf });
  if (!isAuthenticated(req)) return send(res, 401, { error: 'Session expirée, reconnectez-vous' });

  const body = req.body || {};
  const versions = body.versions || {};
  try {
    const files = [];
    const summary = [];

    if (body.produits) {
      const current = await readFile('data/produits.json');
      if (current.sha !== versions.produits) {
        return send(res, 409, { error: 'Le catalogue a été modifié ailleurs entre-temps. Rechargez la page avant de publier.' });
      }
      const produits = validateProduits(body.produits);
      const referenced = new Set(produits.map(p => p.image).filter(Boolean));
      (body.images || []).forEach(img => { const f = decodeImage(img, referenced); if (f) files.push(f); });
      const page = await readFile('produits.html');
      const data = { produits };
      files.push({ path: 'data/produits.json', content: serialize(data) });
      files.push({ path: 'produits.html', content: render(page.text, data).html });
      summary.push(produits.length + ' produits');
    }

    if (body.contenu) {
      const current = await readFile('data/contenu.json');
      if (current.sha !== versions.contenu) {
        return send(res, 409, { error: 'Les informations du site ont été modifiées ailleurs. Rechargez la page avant de publier.' });
      }
      const contenu = validateContenu(body.contenu, JSON.parse(current.text));
      files.push({ path: 'data/contenu.json', content: JSON.stringify(contenu, null, 2) + '\n' });
      summary.push('infos du site');
    }

    if (!files.length) return send(res, 400, { error: 'Rien à publier' });
    const sha = await commitFiles(files, 'admin: mise à jour (' + summary.join(', ') + ')');
    send(res, 200, { ok: true, commit: sha });
  } catch (e) {
    const fromGithub = /^GitHub /.test(e.message);
    send(res, fromGithub ? 502 : 400, { error: fromGithub ? 'Publication impossible (GitHub)' : e.message, detail: fromGithub ? e.message : undefined });
  }
};
