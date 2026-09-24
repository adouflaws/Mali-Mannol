const { send, configError, safeEqual, sessionCookie, clearCookie, checkWriteRequest } = require('./_lib');

module.exports = async (req, res) => {
  const bad = checkWriteRequest(req);
  if (bad) return send(res, 405, { error: bad });
  const conf = configError();
  if (conf) return send(res, 500, { error: conf });

  if (req.body && req.body.logout) {
    res.setHeader('Set-Cookie', clearCookie());
    return send(res, 200, { ok: true });
  }

  const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  if (!password || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
    await new Promise(r => setTimeout(r, 1200)); // ralentit les essais en rafale
    return send(res, 401, { error: 'Mot de passe incorrect' });
  }
  res.setHeader('Set-Cookie', sessionCookie());
  send(res, 200, { ok: true });
};
