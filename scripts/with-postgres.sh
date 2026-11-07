#!/bin/sh
# Run a command in the Node container of scripts/node.sh next to a throwaway PostgreSQL container.
#
# The database is the official postgres:16.14 image pinned by digest (built 2026-08-05, older than the seven day policy). It runs
# with NO network at all (--network none), a read-only root, a tmpfs data directory, no capabilities and an unprivileged user.
# The command runs in the Node container, which joins the database container's network namespace: the server is at 127.0.0.1:5432,
# the site started by the command is at 127.0.0.1:3000, and nothing else is reachable. DATABASE_URL is passed to the command; the
# superuser password is generated here, written to a mode-600 file under out/ (ignored by git) and removed with the containers.
#
# usage: scripts/with-postgres.sh "COMMAND"
set -eu
cd "$(dirname "$0")/.."
[ $# -eq 1 ] || { echo "usage: with-postgres.sh \"COMMAND\"" >&2; exit 2; }
image=postgres@sha256:95206741a5b214807675e14165369d05b93a9cf692223b616d07cca227e74b0b
suffix=$(od -An -N6 -tx1 /dev/urandom | tr -d ' \n')
pg=nextjs-e2e-kit-pg-$suffix
secret=$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')
mkdir -p out
( umask 077; printf 'DATABASE_URL=postgres://postgres:%s@127.0.0.1:5432/postgres\n' "$secret" > out/.db-env )

cleanup() {
  docker rm -f -v "$pg" >/dev/null 2>&1 || true
  rm -f out/.db-env
}
trap cleanup EXIT INT TERM

POSTGRES_PASSWORD=$secret docker run -d --name "$pg" --network none \
  --cap-drop ALL --security-opt no-new-privileges --pids-limit 512 --cpus "${NODE_CPUS:-4}" --memory 2g \
  --user 999:999 --read-only \
  --tmpfs /var/lib/postgresql/data:rw,uid=999,gid=999,mode=0700 \
  --tmpfs /var/run/postgresql:rw,uid=999,gid=999,mode=0755 --tmpfs /tmp:rw,mode=1777 \
  -e POSTGRES_PASSWORD "$image" -c fsync=off -c synchronous_commit=off -c full_page_writes=off >/dev/null

i=0
until docker exec "$pg" pg_isready -q -h 127.0.0.1 -U postgres; do
  i=$((i + 1))
  if [ "$i" -gt 120 ]; then echo "with-postgres: the database did not become ready" >&2; docker logs "$pg" >&2 || true; exit 1; fi
  sleep 0.5
done

NODE_NET="container:$pg" NODE_ENV_FILE="$PWD/out/.db-env" scripts/node.sh "$1"
