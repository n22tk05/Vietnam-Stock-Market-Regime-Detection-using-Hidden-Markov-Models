import os
import shutil
import subprocess
import sys
script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))

def run_cmd(cmd):
    print(f"Running: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', cwd=script_dir)
    if res.returncode != 0:
        print(f"FAILED: {cmd}")
        print(res.stderr)
        raise RuntimeError(f"Command {cmd} failed.")
    else:
        print(res.stdout.encode("utf-8", errors="replace").decode(sys.stdout.encoding or "utf-8", errors="replace"))

# Step 1: Rebuild m1.csv from raw stocks
print("\nStep 1: Rebuilding m1...")
run_cmd("python m1.py")

# Step 2: Mapping macro type
print("\nStep 2: Rebuilding m1...")
run_cmd("python mapping_macro.py")

# Step 3: Run derived_variable.py
print("\nStep 3: Running derived_variable.py...")
run_cmd("python derived_variable.py")

# Step 5: Run align_daily_features.py
print("\nStep 4: Running align_daily_features.py...")
run_cmd("python align_daily_features.py")

# Step 5: Run slit_date.py
print("\nStep 5: Running slit_date.py...")
run_cmd("python slit_date.py")

# Step 6: Run process_pipeline.py
print("\nStep 6: Running process_pipeline.py...")
run_cmd("python process_pipeline.py")

#Step 7: Industry variable
print("\n Step 7: Runing indusrty_variable.py...")
run_cmd("python industry_variable.py")

# Step 8: Market variable
print("\n Step 8: Running market_variable.py...")
run_cmd("python market_variable.py")

print("\nALL STEPS COMPLETED SUCCESSFULLY!")
