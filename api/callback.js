function parseCookies(str) {
  return str.split(';').reduce((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return acc;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    acc[k] = decodeURIComponent(v);
    return acc;
  }, {});
}

module.exports = async (req, res) => {
  const { code, state } = req.query;
  const cookies = parseCookies(req.headers.cookie || '');

  if (!code || !state || state !== cookies.oauth_state) {
    res.statusCode = 400;
    res.end('État invalide, réessayez la connexion depuis /admin.');
    return;
  }

  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

  const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const tokenData = await tokenResp.json();

  if (tokenData.error || !tokenData.access_token) {
    res.statusCode = 400;
    res.end('Erreur d\'authentification GitHub : ' + (tokenData.error_description || tokenData.error || 'inconnue'));
    return;
  }

  const message = 'authorization:github:success:' + JSON.stringify({ token: tokenData.access_token, provider: 'github' });
  const safeMessage = message.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  res.setHeader('Content-Type', 'text/html');
  res.end(`<!doctype html><html><body><script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage('${safeMessage}', e.origin);
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script></body></html>`);
};
