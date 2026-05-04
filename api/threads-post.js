export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { text, token, userId } = req.body ?? {};
  if (!text || !token || !userId) {
    return res.status(400).json({ error: '必須パラメータが不足しています (text / token / userId)' });
  }

  try {
    // Step 1: メディアコンテナ作成
    const r1 = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ media_type: 'TEXT', text, access_token: token }),
    });
    const d1 = await r1.json();
    if (!r1.ok || d1.error) {
      throw new Error(d1.error?.message || d1.error_message || JSON.stringify(d1));
    }

    // Step 2: 3秒待機（API推奨）
    await new Promise(r => setTimeout(r, 3000));

    // Step 3: 公開
    const r2 = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ creation_id: d1.id, access_token: token }),
    });
    const d2 = await r2.json();
    if (!r2.ok || d2.error) {
      throw new Error(d2.error?.message || d2.error_message || JSON.stringify(d2));
    }

    return res.status(200).json({ success: true, postId: d2.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
