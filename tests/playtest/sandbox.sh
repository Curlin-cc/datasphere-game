#!/usr/bin/env bash
# Builds the sandbox save (src/content/sandbox.json): every mission solved, tenant built along the way.
# Chains the first pass of the chapter 12 playtests; each starts from the save the previous one left (DSG_CHAIN in common.py).
# Start state of the chain is chapter12_data.py (main game solved). Needs the dev server: npx vite --port 5199 --strictPort &
# Rerun after new missions or save-format changes, then check with sandbox_check.py.
set -e
cd "$(dirname "$0")"
CHAIN=$(mktemp -d)/chain.json
SHOTS=$(mktemp -d)
for f in chapter12 chapter12_hier chapter12_ver chapter12_odata chapter12_onb chapter12_df chapter12_tf2; do
  out=$(DSG_CHAIN=$CHAIN timeout 600 python3 "$f.py" "$SHOTS" 2>&1) || true
  echo "$f: $(echo "$out" | grep -c GAIN) solved, $(echo "$out" | grep -c Traceback) tracebacks"
done
python3 - "$CHAIN" <<'EOF'
import json, sys
d = json.load(open(sys.argv[1]))
ids = list(d['missions'])
open_ = [m for m, p in d['missions'].items() if not p['done']]
assert not open_, f'not solved: {open_}'
d.update(xp=5000, tutorialsSeen=ids, tutorialVersion=2, currentMission=ids[-1])
json.dump(d, open('../../src/content/sandbox.json', 'w'), separators=(',', ':'))
print(f'sandbox.json: {len(ids)} missions solved')
EOF
