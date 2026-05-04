@echo off
chcp 65001 > nul
cd /d "%~dp0"

REM Pythonのパスを自動検出
where python > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Pythonが見つかりません。PATHを確認してください。
    pause
    exit /b 1
)

REM 依存パッケージのインストール（初回のみ実行される）
python -c "import requests" > nul 2>&1
if %errorlevel% neq 0 (
    echo requests をインストール中...
    python -m pip install -r requirements.txt
)

REM メインスクリプト実行
python post.py
exit /b %errorlevel%
