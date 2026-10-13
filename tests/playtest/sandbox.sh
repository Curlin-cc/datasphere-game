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
# The chain starts after chapter 11 from hand-made data without roles, the S/4 connection or statement logs:
# take those from the end states of chapters 2, 3 and 9 (each run alone).
EXTRA=$(dirname "$CHAIN")
for f in chapter2 chapter3 chapter9; do
  out=$(DSG_CHAIN=$EXTRA/$f.json timeout 600 python3 "$f.py" "$SHOTS" 2>&1) || true
  echo "$f: $(echo "$out" | grep -c GAIN) solved (for roles, connections, statements)"
done
python3 - "$CHAIN" "$EXTRA" <<'EOF'
import json, sys
d = json.load(open(sys.argv[1]))
part = lambda f: json.load(open(f'{sys.argv[2]}/{f}.json'))['tenant']
t, c2, c3, c9 = d['tenant'], part('chapter2'), part('chapter3'), part('chapter9')
t['roles'], t['assignments'] = c2['roles'], c2['assignments']
have = {(c['space'], c['name']) for c in t['connections']}
t['connections'] = [c for c in c3['connections'] if (c['space'], c['name']) not in have] + t['connections']
t['certificates'] = sorted(set(t['certificates']) | set(c3['certificates']))
t['statements'] = c9['statements']
# Import Entities (c03-m07): the imported division objects, their shares and the import log come from the chapter 3 run.
names = {(o['space'], o['name']) for o in t['objects']}
imported = [o for o in c3['objects'] if o.get('importedFrom') and (o['space'], o['name']) not in names]
t['objects'] = imported + t['objects']
keys = {f"{o['space']}.{o['name']}" for o in imported}
t['shares'] = [x for x in c3['shares'] if x['object'] in keys] + t['shares']
t['importLogs'] = [l for l in c3.get('importLogs', []) if l.get('pkg') == 'IMPORT_ENTITIES'] + t.get('importLogs', [])
t['runs'] = [r for r in c3.get('runs', []) if r['object'] in keys] + t.get('runs', [])
ids = list(d['missions'])
open_ = [m for m, p in d['missions'].items() if not p['done']]
assert not open_, f'not solved: {open_}'
d.update(xp=5000, tutorialsSeen=ids, tutorialVersion=3, currentMission=ids[-1])
json.dump(d, open('../../src/content/sandbox.json', 'w'), separators=(',', ':'))
print(f'sandbox.json: {len(ids)} missions solved')
EOF
