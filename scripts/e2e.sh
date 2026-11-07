#!/bin/sh
# The whole pipeline of the CI job, locally and in containers: wait for the database, migrate, seed, build the site, start it and
# run the Playwright suite against it. The HTML report and the traces of failures are written to ./out.
#
# usage: scripts/e2e.sh [playwright arguments...]      for example: scripts/e2e.sh --project=mobile
set -eu
cd "$(dirname "$0")/.."
args=""
for a in "$@"; do args="$args '$a'"; done
exec scripts/with-postgres.sh "npm run db:wait && npm run db:migrate && npm run db:seed && npm run build && npx playwright test $args"
