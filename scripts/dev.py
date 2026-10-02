import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
env = os.environ.copy()
env["PYTHONPATH"] = str(BACKEND)
cmd = [
    sys.executable, "-m", "uvicorn", "app.main:app",
    "--host", "127.0.0.1", "--port", "8000", "--reload",
]
print("UrbanLens API → http://127.0.0.1:8000/docs")
print("Frontend (if present): npm run dev in frontend/ → http://localhost:5173")
subprocess.run(cmd, cwd=BACKEND, env=env)
