import os
import sys
import time
import requests
from datetime import datetime
from pathlib import Path

# --- 楽天API設定 ---
RAKUTEN_APP_ID     = '0a20b387-b2e2-42b3-83d4-276e265b0abf'
RAKUTEN_ACCESS_KEY = 'pk_S6uhk1yZKJh6F4h6IBnkhQ8kjUXU6VNFfTSO3QM65V9'
RAKUTEN_AFF_ID     = '536bbf3d.7c674743.536bbf3e.d20abd20'
RAKUTEN_ENDPOINT   = 'https://app.rakuten.co.jp/services/api/IchibaItem/Ranking/20170628'

# --- Threads設定（.envから読み込み） ---
def _load_env():
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        for line in env_path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

_load_env()
THREADS_USER_ID = os.environ.get('THREADS_USER_ID', '')
THREADS_TOKEN   = os.environ.get('THREADS_ACCESS_TOKEN', '')
THREADS_API     = 'https://graph.threads.net/v1.0'


def fetch_ranking() -> dict:
    resp = requests.get(
        RAKUTEN_ENDPOINT,
        params={
            'applicationId': RAKUTEN_APP_ID,
            'accessKey':     RAKUTEN_ACCESS_KEY,
            'affiliateId':   RAKUTEN_AFF_ID,
            'hits':          1,
            'format':        'json',
            'formatVersion': 2,
        },
        headers={
            'Referer': 'https://script.google.com/',
            'Origin':  'https://script.google.com',
        },
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    if 'error' in data:
        raise RuntimeError(f"楽天APIエラー: {data['error']} - {data.get('error_description', '')}")
    return data


def extract_item(data: dict) -> dict:
    items = data.get('Items', [])
    if not items:
        raise RuntimeError('商品データが空です')
    first = items[0]
    return first.get('Item', first)


def build_post(item: dict) -> str:
    name  = item['itemName']
    short = name[:50] + '…' if len(name) > 50 else name
    price = f"¥{int(item['itemPrice']):,}"
    shop  = item.get('shopName', '')
    url   = item.get('affiliateUrl') or item.get('itemUrl', '')

    review_line = ''
    if float(item.get('reviewAverage', 0)) > 0:
        review_line = f"⭐ {item['reviewAverage']} / 5.0（{item['reviewCount']}件のレビュー）\n"

    lines = [
        '🏆 楽天総合ランキング1位！',
        '',
        f'📦 {short}',
        '',
        f'💰 {price}（税込）',
        review_line.rstrip(),
        f'🏪 {shop}',
        '',
        '🛒 詳細・購入はこちら↓',
        url,
        '',
        '#楽天市場 #ランキング1位 #おすすめ #お買い得',
    ]
    text = '\n'.join(lines)
    while '\n\n\n' in text:
        text = text.replace('\n\n\n', '\n\n')
    return text


def post_to_threads(text: str) -> str:
    # Step1: メディアコンテナ作成
    r1 = requests.post(
        f'{THREADS_API}/{THREADS_USER_ID}/threads',
        params={'media_type': 'TEXT', 'text': text, 'access_token': THREADS_TOKEN},
        timeout=20,
    )
    r1.raise_for_status()
    creation_id = r1.json()['id']

    time.sleep(3)  # 公開前に少し待機（API推奨）

    # Step2: 公開
    r2 = requests.post(
        f'{THREADS_API}/{THREADS_USER_ID}/threads_publish',
        params={'creation_id': creation_id, 'access_token': THREADS_TOKEN},
        timeout=20,
    )
    r2.raise_for_status()
    return r2.json().get('id', '')


def log(msg: str):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f'[{ts}] {msg}'
    print(line)
    log_dir = Path(__file__).parent / 'logs'
    log_dir.mkdir(exist_ok=True)
    with open(log_dir / 'post.log', 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def main():
    log('===== 実行開始 =====')

    try:
        log('楽天ランキングを取得中...')
        data = fetch_ranking()
        item = extract_item(data)
        log(f'商品取得成功: {item["itemName"][:60]}')
        log(f'価格: ¥{int(item["itemPrice"]):,}  ショップ: {item.get("shopName", "")}')

        post_text = build_post(item)
        log(f'投稿文生成完了 ({len(post_text)}文字)')
        print('\n--- 投稿文 ---')
        print(post_text)
        print('--------------\n')

        if not THREADS_USER_ID or not THREADS_TOKEN:
            log('⚠️  Threads認証情報未設定 → 投稿スキップ')
            log('.envにTHREADS_USER_IDとTHREADS_ACCESS_TOKENを設定してください')
            sys.exit(0)

        post_id = post_to_threads(post_text)
        log(f'✅ Threads投稿完了！ post_id={post_id}')

    except requests.HTTPError as e:
        log(f'❌ HTTPエラー: {e.response.status_code} {e.response.text[:200]}')
        sys.exit(1)
    except Exception as e:
        log(f'❌ エラー: {e}')
        sys.exit(1)

    log('===== 実行完了 =====')


if __name__ == '__main__':
    main()
