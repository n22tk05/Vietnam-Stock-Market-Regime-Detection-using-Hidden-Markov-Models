import os
import shutil
import subprocess
import sys
script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
data_dir = os.path.join(root_dir, 'data', 'processed')
def run_cmd(cmd):
    print(f"Running: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8')
    if res.returncode != 0:
        print(f"FAILED: {cmd}")
        print(res.stderr)
        raise RuntimeError(f"Command {cmd} failed.")
    else:
        print(res.stdout.encode("utf-8", errors="replace").decode(sys.stdout.encoding or "utf-8", errors="replace"))

# Phase 1: Data Crawling 
print("\nPhase 1: Data Crawling")
run_cmd("python crawl/pipeline.py")

# Phash 2: Prossing: Data
print("\nPhase 2: Data Processing")
run_cmd("python data_processing/pipeline.py")

print(f"\n ALL DATA IN {data_dir}")