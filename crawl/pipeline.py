import os
import shutil
import subprocess
import sys
script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, ".."))

def run_cmd(cmd):
    print(f"Running: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', cwd=script_dir)
    if res.returncode != 0:
        print(f"FAILED: {cmd}")
        print(res.stderr)
        raise RuntimeError(f"Command {cmd} failed.")
    else:
        print(res.stdout.encode("utf-8", errors="replace").decode(sys.stdout.encoding or "utf-8", errors="replace"))

# Step 1: Crawl Raw Stock 
print("\nStep 1: Crawl Raw Stock")
run_cmd("python crawl_stock.py")

# Step 2: Crawl Macro Data
print("\nStep 2: Crawl Raw Macro")
run_cmd("python crawl_marco.py")

# Step 3: Crawl Industry Data
print("\nStep 2: Crawl Raw Industry")
run_cmd("python crawl_icb.py")

print("\nALL STEPS CRAWL DATA COMPLETED SUCCESSFULLY!")