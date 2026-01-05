#!/bin/bash
cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ
source .venv_lmdeploy/bin/activate

echo "=== Testing LMDeploy Import ==="
python -c "
try:
    print('Step 1: Importing lmdeploy...')
    import lmdeploy
    print('  OK')
    
    print('Step 2: Importing serve...')
    from lmdeploy import serve
    print('  OK')
    
    print('Step 3: All imports successful!')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
"
