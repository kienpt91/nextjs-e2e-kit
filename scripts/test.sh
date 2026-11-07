#!/bin/sh
# Typecheck, then the unit and integration tests (the integration ones against a throwaway PostgreSQL) with coverage thresholds.
set -eu
cd "$(dirname "$0")/.."
exec scripts/with-postgres.sh "npm run typecheck && npm run coverage"
