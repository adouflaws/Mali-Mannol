module.exports = (req, res) => {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    res.end('OAUTH_GITHUB_CLIENT_ID manquant dans les variables d\'environnement Vercel.');
    return;
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `https://${host}/api/callback`;
  const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

  const authorizeUrl = 'https://github.com/login/oauth/authorize'
    + '?client_id=' + encodeURIComponent(clientId)
    + '&redirect_uri=' + encodeURIComponent(redirectUri)
    + '&scope=repo'
    + '&state=' + encodeURIComponent(state);

  res.writeHead(302, { Location: authorizeUrl });
  res.end();
};
