export default async function handler(req, res) {
  const APP_ID     = '0a20b387-b2e2-42b3-83d4-276e265b0abf';
  const ACCESS_KEY = 'pk_S6uhk1yZKJh6F4h6IBnkhQ8kjUXU6VNFfTSO3QM65V9';
  const AFF_ID     = '536bbf3d.7c674743.536bbf3e.d20abd20';

  const params = new URLSearchParams({
    applicationId: APP_ID,
    accessKey:     ACCESS_KEY,
    affiliateId:   AFF_ID,
    hits:          1,
    sort:          '-seller',
    format:        'json',
    formatVersion: 2,
  });

  try {
    const response = await fetch(
      `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?${params}`
    );
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'proxy_error', error_description: err.message });
  }
}
