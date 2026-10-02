import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
env = os.environ.copy()
env["PYTHONPATH"] = str(ROOT / "backend")
subprocess.check_call([sys.executable, "-m", "pipeline.build_artifacts"], cwd=ROOT / "backend", env=env)
print("Demo artifacts ready in backend/.artifacts/")
