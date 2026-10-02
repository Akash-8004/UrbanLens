.PHONY: setup artifacts dev reset test

setup:
	python -m pip install -r backend/requirements.txt

artifacts:
	cd backend && python -m pipeline.build_artifacts

dev:
	python scripts/dev.py

reset:
	python -c "import shutil, pathlib; p=pathlib.Path('backend/.artifacts'); shutil.rmtree(p, ignore_errors=True); print('cleared', p)"

test:
	cd backend && python -m pytest tests -q
