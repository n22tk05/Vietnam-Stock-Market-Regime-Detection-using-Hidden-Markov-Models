import os
import subprocess
import sys
import argparse

script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, ".."))

parser = argparse.ArgumentParser()
parser.add_argument("--date", type=str, default=None, help="Target end date")
args = parser.parse_args()

def run_cmd(script_name):
    cmd = f'"{sys.executable}" -u {script_name}'
    if args.date:
        cmd += f' --date {args.date}'
    print(f"Running: {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=script_dir)
    if res.returncode != 0:
        print(f"FAILED: {cmd}")
        raise RuntimeError(f"Command {cmd} failed with exit code {res.returncode}.")
    else:
        print(f"--- SUCCESS: {cmd} ---")

# Step 1: Crawl Raw Stock 
print("\nStep 1: Crawl Raw Stock")
run_cmd("crawl_stock.py")

# Step 2: Crawl Macro Data
print("\nStep 2: Crawl Raw Macro")
run_cmd("crawl_marco.py")

# Step 3: Crawl Industry Data
print("\nStep 3: Crawl Raw Industry")
run_cmd("crawl_industry.py")

print("\nALL STEPS CRAWL DATA COMPLETED SUCCESSFULLY!")