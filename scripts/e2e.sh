#!/bin/sh
# The whole pipeline of the CI job, locally and in containers: wait for the database, migrate, seed, build the site, start it and
# run the Playwright suite against it. The HTML report and the traces of failures are written to ./out.
#
# usage: scripts/e2e.sh [playwright arguments...]      for example: scripts/e2e.sh --project=mobile
# E2E_PRINT_ARGS=1 prints the quoted arguments as they would be put into the container command, and exits (used by the tests).
set -eu
cd "$(dirname "$0")/.."
args=""
for a in "$@"; do
  # a single quote inside single quotes is written as '\''
  quoted=$(printf '%s' "$a" | sed "s/'/'\\\\''/g")
  args="$args '$quoted'"
done
if [ "${E2E_PRINT_ARGS:-}" = 1 ]; then printf '%s\n' "$args"; exit 0; fi
exec scripts/with-postgres.sh "npm run db:wait && npm run db:migrate && npm run db:seed && npm run build && npx playwright test $args"
