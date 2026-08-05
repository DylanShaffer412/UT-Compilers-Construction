from backend.CME.ETL.CME_pipeline import run_cme_pipeline
from backend.FLR.ETL.FLR_pipeline import run_flr_pipeline
from backend.NeoWs.NEO_pipeline import run_neo_pipeline
from backend.GST.ETL.GST_pipeline import run_gst_pipeline
from backend.AAI.AAI_extract import run_aai_pipeline
from utils.utils import kill_processes_holding
from utils.utils import find_sockets_on_port
from utils.utils import free_ports
import argparse
import uvicorn
import subprocess
import os
import signal
import sys




def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", action="store_true", help="Pull full 90-day archive instead of incremental")
    args = parser.parse_args()

    free_ports()

    frontend = subprocess.Popen(
        ["npm","run","dev"],
        cwd="./frontend",
        preexec_fn=os.setsid
    )

    def shutdown(sig, frame):
        print("\nShutting Down ...")
        # FYI: killpg only works for unix environments, which the container is, but the dev PC may not be
        # if your code editor gives a warning, it is likely a false positive
        try:
            os.killpg(os.getpgid(frontend.pid), signal.SIGTERM)
        except Exception:
            pass
        free_ports()
        sys.exit(0)

    # 1st arg is when it activates, 2nd is what it executes
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        incremental_pipelines = {
            "CME": run_cme_pipeline,
            "FLR": run_flr_pipeline,
            "GST": run_gst_pipeline,
        }
        for name, pipeline in [
            ("CME", run_cme_pipeline),
            ("FLR", run_flr_pipeline),
            ("NEO", run_neo_pipeline),
            ("GST", run_gst_pipeline),
            ("AAI", run_aai_pipeline),
        ]:
            try:
                if name in incremental_pipelines:
                    pipeline(archive=args.archive)
                else:
                    pipeline()
            except Exception as e:
                print(f"[WARNING] {name} pipeline failed: {e}")

        # TODO: set reload=False when the application is finished
        uvicorn.run("backend.api:app", host="0.0.0.0", port=8000, reload=True)
    finally:
        try:
            os.killpg(os.getpgid(frontend.pid), signal.SIGTERM)
        except Exception:
            pass
        free_ports()


if __name__ == "__main__":
    main()
