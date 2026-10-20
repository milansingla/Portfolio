#!/usr/bin/env bash
# Runs every end-to-end check against a running production server.
#   npm run build && npx next start -p 3111      (terminal 1)
#   npm run test:e2e                              (terminal 2)
# Needs: python3 -m pip install playwright && python3 -m playwright install chromium
#
# Environment (all optional):
#   BASE_URL      server to test               (default http://localhost:3111)
#   E2E_OUT       screenshot folder            (used by the suites)
#   E2E_DIR       folder holding the suites    (default tests/e2e; the runner's self-test points it at fixtures)
#   E2E_SUITES    space-separated suite names  (default: the nine real suites)
#   E2E_NO_SERVER set to 1 to skip the server check (self-test only)
#
# A suite counts as FAILED when any of these is true:
#   - its Python process exits non-zero (a crash, an uncaught assertion, a timeout kill)
#   - its output contains a Python traceback
#   - it printed at least one line starting with FAIL
#   - it printed no PASS lines at all (it never ran its checks)
#   - it did not end with its "<passed> / <total>" (or "<passed>/<total> passed") summary line, or the two numbers differ
# The runner exits 0 only if every suite passed; 1 if any failed or crashed; 2 if there is no server.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
export BASE_URL="${BASE_URL:-http://localhost:3111}"
DIR="${E2E_DIR:-$HERE/e2e}"
SUITES="${E2E_SUITES:-part1_flows part1_extra part2 journey_scroll journey_states part3 part4 a11y_cleanup_replay layout_perf lifecycle_perf polish_sound branding_seo blog}"

if [ "${E2E_NO_SERVER:-0}" != "1" ] && ! curl -fsS -m 10 -o /dev/null "$BASE_URL/" 2>/dev/null; then
  echo "NO SERVER at $BASE_URL. Start one first: npm run build && npx next start -p 3111" >&2
  exit 2
fi
if ! command -v python3 >/dev/null 2>&1; then echo "python3 not found" >&2; exit 2; fi

total=0; failed=0; bad_suites=0
for f in $SUITES; do
  file="$DIR/$f.py"
  if [ ! -f "$file" ]; then
    printf '%-22s MISSING SUITE FILE %s\n' "$f" "$file"; bad_suites=$((bad_suites+1)); continue
  fi
  out="$(python3 "$file" 2>&1)"; code=$?
  p=$(printf '%s\n' "$out" | grep -c '^PASS'); x=$(printf '%s\n' "$out" | grep -c '^FAIL')
  last="$(printf '%s\n' "$out" | grep -E '^[0-9]+ ?/ ?[0-9]+( passed)?$' | tail -1)"
  problem=""
  [ "$code" -ne 0 ] && problem="exit code $code"
  printf '%s\n' "$out" | grep -q '^Traceback (most recent call last)' && problem="${problem:+$problem; }traceback in output"
  [ "$p" -eq 0 ] && problem="${problem:+$problem; }no PASS lines"
  if [ -z "$last" ]; then problem="${problem:+$problem; }no final summary line"
  else a="$(printf '%s' "${last%%/*}" | tr -d ' ')"; b="$(printf '%s' "${last##*/}" | sed 's/ passed//; s/ //g')"; [ "$a" != "$b" ] && [ "$x" -eq 0 ] && problem="${problem:+$problem; }summary $a/$b disagrees with the output"; fi
  status="ok"
  if [ -n "$problem" ] || [ "$x" -gt 0 ]; then status="FAILED"; bad_suites=$((bad_suites+1)); fi
  printf '%-22s %3d passed, %d failed  [%s]%s\n' "$f" "$p" "$x" "$status" "${problem:+ ($problem)}"
  if [ "$status" = "FAILED" ]; then
    printf '%s\n' "$out" | grep '^FAIL' || true
    # captured error output: the traceback, or the last lines the suite wrote
    printf '%s\n' "$out" | grep -v '^PASS' | tail -n 25 | sed 's/^/    | /'
  fi
  total=$((total+p)); failed=$((failed+x))
done
echo "TOTAL: $total passed, $failed failed, $bad_suites suite(s) failed or crashed"
[ "$bad_suites" -eq 0 ] && [ "$failed" -eq 0 ]
