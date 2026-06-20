@echo off
echo Starting Mini ERP Backend...
cd /d %~dp0
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
