#!/bin/sh
# Break the demo site one behaviour at a time (the faults of src/faults.ts) and check that the suite fails, and fails in the right tests.
# The transcript is also written to out/negative-controls.txt.
set -eu
cd "$(dirname "$0")/.."
exec scripts/with-postgres.sh "npm run db:wait && npm run db:migrate && npm run db:seed && npm run build && npm run negative-controls"
