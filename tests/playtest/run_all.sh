#!/usr/bin/env bash
# Runs every playtest in order and prints one line per script: missions gained, tracebacks, page errors.
# Needs the dev server: npx vite --port 5199 --strictPort &   Usage: bash run_all.sh [screenshot folder] [script ...]
cd "$(dirname "$0")"
OUT=${1:-/tmp}
shift || true
SCRIPTS=${*:-"back guided tour chapter0 chapter1 chapter2 chapter3 chapter4 chapter5 chapter5_map chapter6 chapter7 chapter8 chapter9 chapter10 chapter11 chapter12 chapter12_hier chapter12_ver chapter12_odata chapter12_onb chapter12_df chapter12_tf chapter12_tf2 sandbox_check extras translation favicon"}
fail=0
for f in $SCRIPTS; do
  out=$(timeout 600 python3 "$f.py" "$OUT" 2>&1)
  tb=$(echo "$out" | grep -c Traceback)
  err=$(echo "$out" | grep ERRORS | grep -v "ERRORS \[\]" | head -1)
  echo "$f: $(echo "$out" | grep -c 'GAIN\|gain:') solved, $tb tracebacks ${err}"
  [ "$tb" != "0" ] || [ -n "$err" ] && fail=1
done
exit $fail
