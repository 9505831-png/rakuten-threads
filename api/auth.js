const APP_ID       = '1496842468548762';
const REDIRECT_URI = 'https://rakuten-threads.vercel.app/callback';
const SCOPES       = 'threads_basic,threads_content_publish';

export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id:     APP_ID,
    redirect_uri:  REDIRECT_URI,
    scope:         SCOPES,
    response_type: 'code',
  });
  res.redirect(302, `https://threads.net/oauth/authorize?${params}`);
}
