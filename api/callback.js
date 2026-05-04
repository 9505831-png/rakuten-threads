const APP_ID       = '1496842468548762';
const APP_SECRET   = process.env.THREADS_APP_SECRET || '';
const REDIRECT_URI = 'https://rakuten-threads.vercel.app/callback';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const { code, error, error_description } = req.query;

  if (error) return res.status(400).send(errorHtml(error_description || error));
  if (!code)  return res.status(400).send(errorHtml('codeパラメータがありません'));
  if (!APP_SECRET) return res.status(500).send(errorHtml(
    'THREADS_APP_SECRET が未設定です。Vercelの環境変数に追加してください。'
  ));

  // 短期トークン取得
  let shortToken, userId;
  try {
    const r = await fetch('https://graph.threads.net/oauth/access_token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     APP_ID,
        client_secret: APP_SECRET,
        grant_type:    'authorization_code',
        redirect_uri:  REDIRECT_URI,
        code,
      }),
    });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error_message || d.error?.message || JSON.stringify(d));
    shortToken = d.access_token;
    userId     = String(d.user_id);
  } catch (e) {
    return res.status(500).send(errorHtml(`短期トークン取得失敗: ${e.message}`));
  }

  // 長期トークン取得（60日）
  let finalToken = shortToken;
  let expiresIn  = 5184000;
  try {
    const r = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${APP_SECRET}&access_token=${shortToken}`
    );
    const d = await r.json();
    if (r.ok && d.access_token) {
      finalToken = d.access_token;
      expiresIn  = d.expires_in ?? expiresIn;
    }
  } catch { /* 短期トークンにフォールバック */ }

  const days = Math.round(expiresIn / 86400);
  res.status(200).send(successHtml(finalToken, userId, days));
}

// ─── HTML ────────────────────────────────────────────────────────────────────

function base(title, color, body) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;background:${color};font-family:'Segoe UI','Hiragino Sans',sans-serif;color:#1e293b}
    header{background:linear-gradient(135deg,#059669,#10b981);padding:18px 24px;text-align:center;box-shadow:0 4px 16px rgba(5,150,105,.3)}
    header h1{font-size:1.1rem;font-weight:800;color:#fff}
    main{max-width:600px;margin:0 auto;padding:24px 16px 80px;display:flex;flex-direction:column;gap:20px}
    .card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 16px rgba(0,0,0,.07);border:1px solid #e2e8f0}
    .card h2{font-size:.92rem;font-weight:800;color:#065f46;margin-bottom:12px}
    .badge{display:inline-flex;align-items:center;gap:6px;background:#d1fae5;color:#065f46;font-weight:700;font-size:.82rem;padding:5px 12px;border-radius:20px;margin-bottom:14px}
    .box{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 14px;font-family:monospace;font-size:.78rem;word-break:break-all;line-height:1.6}
    .meta{display:flex;justify-content:space-between;font-size:.78rem;color:#64748b;margin-top:8px}
    pre.env{background:#0f172a;color:#a3e635;padding:14px;border-radius:10px;font-size:.8rem;line-height:1.7;overflow-x:auto;white-space:pre-wrap;word-break:break-all}
    .btn{width:100%;margin-top:10px;padding:11px;border:none;border-radius:10px;color:#fff;font-size:.9rem;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity .15s}
    .btn-green{background:linear-gradient(135deg,#059669,#10b981)}
    .btn-green:hover{opacity:.88}
    .btn-dark{background:#0a0a0a;margin-top:0}
    .btn-dark:hover{opacity:.82}
    .btn.copied{background:linear-gradient(135deg,#6366f1,#7c3aed)}
    .back-btn{width:100%;padding:14px;background:#0a0a0a;border:none;border-radius:12px;color:#fff;font-size:.95rem;font-weight:800;cursor:pointer;font-family:inherit;transition:opacity .15s}
    .back-btn:hover{opacity:.82}
    .err-card{background:#fef2f2;border:1.5px solid #fca5a5;border-radius:16px;padding:24px;text-align:center}
    .err-card h1{color:#dc2626;font-size:1.1rem;margin-bottom:12px}
    .err-card p{font-size:.88rem;color:#7f1d1d;line-height:1.6}
    .err-back{display:inline-block;margin-top:20px;padding:10px 24px;background:#ef4444;color:#fff;border-radius:8px;text-decoration:none;font-weight:700}
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function successHtml(token, userId, days) {
  const safeToken  = JSON.stringify(token);
  const safeUserId = JSON.stringify(userId);
  const envText    = `THREADS_USER_ID=${userId}\nTHREADS_ACCESS_TOKEN=${token}`;
  const safeEnv    = JSON.stringify(envText);

  return base('認証完了 - 楽天×Threads', 'linear-gradient(160deg,#f0fdf4,#ecfdf5)',
    `<header><h1>✅ Threads 認証完了</h1></header>
<main>
  <div class="card">
    <div class="badge">✅ 認証成功</div>
    <h2>アクセストークン（有効期限: 約${days}日）</h2>
    <div class="box" id="tok">${token}</div>
    <div class="meta"><span>ユーザーID: ${userId}</span><span>有効期限: 約${days}日</span></div>
    <button class="btn btn-green" id="btn-tok" onclick="cp('btn-tok',TOK,'📋 トークンをコピー')">📋 トークンをコピー</button>
  </div>
  <div class="card">
    <h2>📄 post.py 用 .env 設定</h2>
    <pre class="env">THREADS_USER_ID=${userId}
THREADS_ACCESS_TOKEN=${token}</pre>
    <button class="btn btn-green" id="btn-env" onclick="cp('btn-env',ENV,'📋 .env設定をコピー')">📋 .env設定をコピー</button>
  </div>
  <button class="back-btn" onclick="save()">🛒 ツールに戻る（トークンを保存）</button>
</main>
<script>
  const TOK=${safeToken}, UID=${safeUserId}, ENV=${safeEnv};
  function cp(id,text,label){
    navigator.clipboard.writeText(text).then(()=>{
      const b=document.getElementById(id);
      b.textContent='✅ コピーしました！';b.classList.add('copied');
      setTimeout(()=>{b.textContent=label;b.classList.remove('copied')},2000);
    });
  }
  function save(){
    localStorage.setItem('threads_token',TOK);
    localStorage.setItem('threads_user_id',UID);
    window.location.href='/';
  }
</script>`);
}

function errorHtml(msg) {
  return base('認証エラー - 楽天×Threads', '#fef2f2',
    `<header><h1>❌ 認証エラー</h1></header>
<main>
  <div class="err-card">
    <h1>❌ 認証に失敗しました</h1>
    <p>${msg}</p>
    <a class="err-back" href="/">トップに戻る</a>
  </div>
</main>`);
}
