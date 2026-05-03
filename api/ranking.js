const APP_ID     = '0a20b387-b2e2-42b3-83d4-276e265b0abf';
const ACCESS_KEY = 'pk_S6uhk1yZKJh6F4h6IBnkhQ8kjUXU6VNFfTSO3QM65V9';
const AFF_ID     = '536bbf3d.7c674743.536bbf3e.d20abd20';
const ENDPOINT   = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601';

async function tryRequest(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const baseParams = new URLSearchParams({
    affiliateId:   AFF_ID,
    hits:          1,
    sort:          '-seller',
    format:        'json',
    formatVersion: 2,
  });

  const results = [];

  // 試行1: applicationId + accessKey をクエリパラメータで
  try {
    const p = new URLSearchParams(baseParams);
    p.set('applicationId', APP_ID);
    p.set('accessKey', ACCESS_KEY);
    const r = await tryRequest(`${ENDPOINT}?${p}`);
    results.push({ method: 'query params', status: r.status, data: r.data });
    if (r.status === 200 && !r.data.error) return res.status(200).json(r.data);
  } catch (e) { results.push({ method: 'query params', error: e.message }); }

  // 試行2: Authorization: Bearer accessKey
  try {
    const p = new URLSearchParams(baseParams);
    p.set('applicationId', APP_ID);
    const r = await tryRequest(`${ENDPOINT}?${p}`, {
      headers: { 'Authorization': `Bearer ${ACCESS_KEY}` }
    });
    results.push({ method: 'Bearer header', status: r.status, data: r.data });
    if (r.status === 200 && !r.data.error) return res.status(200).json(r.data);
  } catch (e) { results.push({ method: 'Bearer header', error: e.message }); }

  // 試行3: X-Access-Key ヘッダー
  try {
    const p = new URLSearchParams(baseParams);
    p.set('applicationId', APP_ID);
    const r = await tryRequest(`${ENDPOINT}?${p}`, {
      headers: {
        'X-Access-Key':    ACCESS_KEY,
        'X-Application-Id': APP_ID,
      }
    });
    results.push({ method: 'X-Access-Key header', status: r.status, data: r.data });
    if (r.status === 200 && !r.data.error) return res.status(200).json(r.data);
  } catch (e) { results.push({ method: 'X-Access-Key header', error: e.message }); }

  // 試行4: applicationId のみ（accessKey なし）
  try {
    const p = new URLSearchParams(baseParams);
    p.set('applicationId', APP_ID);
    const r = await tryRequest(`${ENDPOINT}?${p}`);
    results.push({ method: 'applicationId only', status: r.status, data: r.data });
    if (r.status === 200 && !r.data.error) return res.status(200).json(r.data);
  } catch (e) { results.push({ method: 'applicationId only', error: e.message }); }

  // すべて失敗 → 結果をそのまま返してデバッグ
  res.status(403).json({ error: 'all_attempts_failed', attempts: results });
}
