export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const { ip } = await r.json();
    return res.status(200).json({ ip });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', message: e.message });
  }
}
