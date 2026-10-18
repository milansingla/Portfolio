#!/usr/bin/env bash
# Proves the runner cannot report success for a failing, crashing or empty suite.
# Needs no server and no browser:  npm run test:runner
HERE="$(cd "$(dirname "$0")" && pwd)"
RUN="$HERE/run-all.sh"
export E2E_DIR="$HERE/fixtures/runner" E2E_NO_SERVER=1
bad=0
expect() { # name, expected exit (0 = zero, nz = non-zero), suites
  local name="$1" want="$2"; shift 2
  E2E_SUITES="$*" bash "$RUN" >/dev/null 2>&1; local got=$?
  if { [ "$want" = 0 ] && [ "$got" -eq 0 ]; } || { [ "$want" = nz ] && [ "$got" -ne 0 ]; }; then echo "ok   $name (exit $got)"
  else echo "FAIL $name: wanted $want, got exit $got"; bad=1; fi
}
expect "all passing suites -> success"                     0  ok ok
expect "one failing assertion -> failure"                  nz ok fails
expect "uncaught exception (traceback) -> failure"         nz ok crashes
expect "silent hard crash (os._exit) -> failure"           nz crash_silent
expect "non-zero exit after printing PASS -> failure"      nz exit_nonzero
expect "no final summary line -> failure"                  nz no_summary
expect "suite that ran no checks -> failure"               nz nothing_ran
expect "missing suite file -> failure"                     nz does_not_exist
# missing server is reported distinctly (exit 2) and never as success
E2E_NO_SERVER=0 BASE_URL=http://127.0.0.1:9 E2E_SUITES="ok" bash "$RUN" >/dev/null 2>&1; got=$?
if [ "$got" -eq 2 ]; then echo "ok   missing server -> exit 2"; else echo "FAIL missing server: wanted 2, got $got"; bad=1; fi
[ "$bad" -eq 0 ] && echo "runner self-test: all good" || echo "runner self-test: PROBLEMS"
exit $bad
