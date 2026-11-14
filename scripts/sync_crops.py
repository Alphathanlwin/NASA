# AI-assisted: Claude Code
"""Copy the crop table to the frontend so the TypeScript engine has one source of truth.

The backend JSON is canonical. This script is run by scripts/build_snapshot.py and can
also be run on its own:

    python scripts/sync_crops.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "backend" / "app" / "engine" / "crops.json"
DST = ROOT / "frontend" / "src" / "engine" / "crops.ts"


def main():
    table = json.loads(SRC.read_text(encoding="utf-8"))
    body = json.dumps(table, indent=2, ensure_ascii=False)
    DST.write_text(
        "// AI-assisted: Claude Code\n"
        "// Generated from backend/app/engine/crops.json by scripts/sync_crops.py. Do not edit.\n"
        "import type { CropTable } from './types'\n\n"
        f"export const TABLE = {body} as CropTable\n",
        encoding="utf-8",
    )
    print(f"wrote {DST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
