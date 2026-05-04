const APP_ID     = '0a20b387-b2e2-42b3-83d4-276e265b0abf';
const ACCESS_KEY = 'pk_S6uhk1yZKJh6F4h6IBnkhQ8kjUXU6VNFfTSO3QM65V9';
const AFF_ID     = '536bbf3d.7c674743.536bbf3e.d20abd20';
const ENDPOINT   = 'https://app.rakuten.co.jp/services/api/IchibaItem/Ranking/20170628';

const GENRE_MAP = {
  food:        '100227',
  beauty:      '216131',
  electronics: '401213',
  fashion:     '110671',
  sports:      '101240',
  book:        '200162',
  baby:        '551177',
  interior:    '215785',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const params = new URLSearchParams({
    applicationId:  APP_ID,
    accessKey:      ACCESS_KEY,
    affiliateId:    AFF_ID,
    hits:           1,
    format:         'json',
    formatVersion:  2,
  });

  const genreId = GENRE_MAP[req.query.genre];
  if (genreId) params.set('genreId', genreId);

  try {
    const resp = await fetch(`${ENDPOINT}?${params}`, {
      headers: {
        'Referer': 'https://script.google.com/',
        'Origin':  'https://script.google.com',
      },
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (resp.ok && !data.error) return res.status(200).json(data);
    return res.status(resp.status).json({ error: 'api_error', status: resp.status, data });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', message: e.message });
  }
}
