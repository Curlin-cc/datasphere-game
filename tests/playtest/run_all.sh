#!/usr/bin/env bash
# Runs every playtest in order and prints one line per script: missions gained, tracebacks, failed checks, page errors.
# Needs the dev server: npx vite --port 5199 --strictPort &   Usage: bash run_all.sh [screenshot folder] [script ...]
# dirty_check.py imports /src/dirty.ts from the dev server, so it fails against a built version (vite preview, artifact) - always use the dev server.
cd "$(dirname "$0")"
OUT=${1:-/tmp}
shift || true
SCRIPTS=${*:-"back guided tour chapter0 chapter1 chapter2 chapter3 chapter4 chapter5 chapter5_map chapter6 chapter7 chapter8 chapter9 chapter10 chapter11 chapter12 chapter12_hier chapter12_ver chapter12_odata chapter12_onb chapter12_df chapter12_tf chapter12_tf2 sandbox_check extras translation intro favicon tour_reload font_size guided_mode dirty_check"}
fail=0
for f in $SCRIPTS; do
  out=$(timeout 600 python3 "$f.py" "$OUT" 2>&1)
  tb=$(echo "$out" | grep -c Traceback)
  err=$(echo "$out" | grep ERRORS | grep -v "ERRORS \[\]" | head -1)
  # Scripts with PASS/FAIL checks (guided_mode, dirty_check …) report failed checks without a traceback: count them too.
  fl=$(echo "$out" | grep -c '^ *FAIL ')
  echo "$f: $(echo "$out" | grep -c 'GAIN\|gain:') solved, $tb tracebacks, $fl failed checks ${err}"
  [ "$tb" != "0" ] || [ "$fl" != "0" ] || [ -n "$err" ] && fail=1
done
exit $fail
