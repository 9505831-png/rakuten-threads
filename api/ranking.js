const APP_ID     = '0a20b387-b2e2-42b3-83d4-276e265b0abf';
const ACCESS_KEY = 'pk_S6uhk1yZKJh6F4h6IBnkhQ8kjUXU6VNFfTSO3QM65V9';
const AFF_ID     = '536bbf3d.7c674743.536bbf3e.d20abd20';
const ENDPOINT   = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601';

const KEYWORD_MAP = {
  '':          '人気',
  food:        '食品',
  beauty:      'コスメ',
  electronics: '家電',
  fashion:     'ファッション',
  sports:      'スポーツ',
  book:        '書籍',
  baby:        'ベビー',
  interior:    'インテリア',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const genre   = req.query.genre ?? '';
  const keyword = KEYWORD_MAP[genre] ?? KEYWORD_MAP[''];

  const params = new URLSearchParams({
    applicationId: APP_ID,
    accessKey:     ACCESS_KEY,
    affiliateId:   AFF_ID,
    keyword,
    hits:          1,
    sort:          '-reviewCount',
    format:        'json',
  });

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
    return res.status(resp.status).json({
      error:       'api_error',
      status:      resp.status,
      message:     data.error_description || data.error || '不明なエラー',
      detail:      data,
    });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', message: e.message });
  }
}
