// Liste les dernières publications faites depuis l'admin (commits "admin: …").
const { send, configError, isAuthenticated, gh, BRANCH } = require('./_lib');

module.exports = async (req, res) => {
  const conf = configError();
  if (conf) return send(res, 500, { error: conf });
  if (!isAuthenticated(req)) return send(res, 401, { error: 'Non connecté' });
  try {
    const commits = await gh('/commits?sha=' + BRANCH + '&path=data&per_page=40');
    const items = commits
      .filter(c => /^admin: /.test(c.commit.message))
      .slice(0, 15)
      .map(c => ({
        sha: c.sha,
        parent: c.parents[0] && c.parents[0].sha,
        date: c.commit.committer.date,
        resume: c.commit.message.split('\n')[0].replace(/^admin: /, '')
      }));
    send(res, 200, { items });
  } catch (e) {
    send(res, 502, { error: 'Historique indisponible', detail: e.message });
  }
};
