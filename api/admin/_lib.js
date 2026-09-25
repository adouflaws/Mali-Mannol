// Outils communs de l'API admin (fichier préfixé "_" : non exposé comme route par Vercel).
//
// Variables d'environnement Vercel requises :
//   ADMIN_PASSWORD  mot de passe de l'admin (12 caractères minimum)
//   SESSION_SECRET  chaîne aléatoire longue servant à signer le cookie de session
//   GITHUB_TOKEN    jeton GitHub "fine-grained" limité au dépôt, permission Contents: read & write
// Optionnelles : GITHUB_REPO (défaut adouflaws/Mali-Mannol), GITHUB_BRANCH (défaut main)
const crypto = require('crypto');

const REPO = process.env.GITHUB_REPO || 'adouflaws/Mali-Mannol';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const COOKIE = 'mm_admin';
const SESSION_DAYS = 7;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function configError() {
  const missing = ['ADMIN_PASSWORD', 'SESSION_SECRET', 'GITHUB_TOKEN'].filter(k => !process.env[k]);
  if (missing.length) return 'Configuration incomplète sur Vercel : ' + missing.join(', ');
  if (process.env.ADMIN_PASSWORD.length < 12) return 'ADMIN_PASSWORD doit faire au moins 12 caractères';
  return null;
}

function sign(payload) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function sessionCookie() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 864e5 })).toString('base64url');
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
}

function clearCookie() {
  return `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function isAuthenticated(req) {
  const raw = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if (!raw) return false;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch (e) { return false; }
}

// Protection CSRF : en plus du cookie SameSite=Strict, les requêtes d'écriture doivent
// porter un en-tête personnalisé (impossible à envoyer depuis un autre site sans CORS).
function checkWriteRequest(req) {
  if (req.method !== 'POST') return 'Méthode non autorisée';
  if (req.headers['x-mm-admin'] !== '1') return 'Requête refusée';
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && host && new URL(origin).host !== host) return 'Origine refusée';
  return null;
}

// ---------- GitHub ----------
async function gh(path, opts = {}) {
  const r = await fetch('https://api.github.com/repos/' + REPO + path, {
    method: opts.method || 'GET',
    headers: {
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      Accept: opts.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'mannol-mali-admin',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!r.ok) {
    const err = new Error('GitHub ' + r.status + ' sur ' + path + ' : ' + (await r.text()).slice(0, 200));
    err.status = r.status;
    throw err;
  }
  return opts.raw ? r.text() : r.json();
}

// Lit un fichier texte du dépôt (à la pointe de la branche, ou à un commit donné)
// et renvoie { text, sha } (sha du blob, pour détecter les conflits)
async function readFile(path, ref) {
  const q = '/contents/' + path + '?ref=' + (ref || BRANCH);
  const meta = await gh(q);
  const text = meta.content && meta.encoding === 'base64' && meta.size < 900000
    ? Buffer.from(meta.content, 'base64').toString('utf8')
    : await gh(q, { raw: true });
  return { text, sha: meta.sha };
}

// Crée UN commit contenant plusieurs fichiers : [{ path, content (string|Buffer) }]
async function commitFiles(files, message) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await gh('/git/ref/heads/' + BRANCH);
    const head = ref.object.sha;
    const headCommit = await gh('/git/commits/' + head);
    const tree = [];
    for (const f of files) {
      const buf = Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content, 'utf8');
      const blob = await gh('/git/blobs', { method: 'POST', body: { content: buf.toString('base64'), encoding: 'base64' } });
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const newTree = await gh('/git/trees', { method: 'POST', body: { base_tree: headCommit.tree.sha, tree } });
    const commit = await gh('/git/commits', { method: 'POST', body: { message, tree: newTree.sha, parents: [head] } });
    try {
      await gh('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: { sha: commit.sha } });
      return commit.sha;
    } catch (e) {
      if (e.status !== 422 || attempt === 2) throw e; // 422 : la branche a bougé entre-temps, on recommence
    }
  }
}

module.exports = { send, configError, safeEqual, sessionCookie, clearCookie, isAuthenticated, checkWriteRequest, gh, BRANCH, readFile, commitFiles };
