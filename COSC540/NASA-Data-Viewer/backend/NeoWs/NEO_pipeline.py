import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from .NEO import main as run_neo


def run_neo_pipeline():
    print("=== NASA Data Viewer ETL ===")

    try:
        print("[RUN] NeoWs")
        run_neo()
    except Exception as exc:
        print(f"[ERROR] NeoWs failed: {exc}")

    print("=== All jobs complete ===")


if __name__ == "__main__":
    main()