#!/usr/bin/env bash
# Full playthrough from an empty save: every chapter script starts from the save the previous one left (DSG_CHAIN in
# common.py), so nothing runs on hand-made start data. Finds bugs that only show with a real player's state
# (e.g. the version history in c12-m07). chapter12_tf is left out: chapter12_tf2 solves c12-m11 itself.
# Needs the dev server: npx vite --port 5199 --strictPort &   Usage: bash chain.sh [screenshot folder]
cd "$(dirname "$0")"
OUT=${1:-/tmp}
CHAIN=$(mktemp -d)/chain.json
fail=0
for f in chapter0 chapter1 chapter2 chapter3 chapter4 chapter5 chapter6 chapter7 chapter8 chapter9 chapter10 chapter11 \
         chapter12 chapter12_hier chapter12_ver chapter12_odata chapter12_onb chapter12_df chapter12_tf2; do
  out=$(DSG_CHAIN=$CHAIN timeout 900 python3 "$f.py" "$OUT" 2>&1)
  tb=$(echo "$out" | grep -c Traceback)
  err=$(echo "$out" | grep ERRORS | grep -v "ERRORS \[\]" | head -1)
  echo "$f: $(echo "$out" | grep -c 'GAIN') solved, $tb tracebacks ${err}"
  [ "$tb" != "0" ] || [ -n "$err" ] && fail=1
done
python3 -c "import json,sys; d=json.load(open('$CHAIN')); m=d['missions']; o=[k for k,v in m.items() if not v['done']]; print(f'{sum(v[\"done\"] for v in m.values())}/{len(m)} missions solved, {d[\"xp\"]} XP', 'open:', o)"
exit $fail
