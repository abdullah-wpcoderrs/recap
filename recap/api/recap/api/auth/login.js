import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI || `${req.headers.origin}/api/auth/callback`;
  
  if (!clientId) {
    return res.status(500).json({ error: 'OAuth not configured' });
  }

  // Generate PKCE challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Generate state for security
  const state = crypto.randomBytes(16).toString('hex');

  // Store code_verifier and state (in production, use Redis/database)
  // For now, we'll pass it through the state parameter (not recommended for production)
  const stateData = JSON.stringify({ state, codeVerifier });
  const encodedState = Buffer.from(stateData).toString('base64url');

  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'tweet.read users.read offline.access');
  authUrl.searchParams.set('state', encodedState);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Redirect to X OAuth
  res.redirect(302, authUrl.toString());
}