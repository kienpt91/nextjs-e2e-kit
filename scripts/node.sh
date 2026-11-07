#!/bin/sh
# Run a command in a throwaway container made from the Playwright image (Ubuntu 24.04, Node 24, Chromium). Nothing from the
# project is installed, built or run on the host.
#
#   scripts/node.sh install            npm ci --ignore-scripts into a docker volume (the only step with network access)
#   scripts/node.sh add PKG...         npm install --save-exact --ignore-scripts --before=CUTOFF PKG... (writes package.json and the lockfile)
#   scripts/node.sh "COMMAND"          run a shell command with the project on PATH, no network
#
# The project is mounted read-only. The only writable places are ./out (reports, coverage), ./.next (build output), /tmp
# (tmpfs) and the node_modules volume. The container has no access to $HOME or the host environment, drops every capability,
# runs as the calling user and is limited to 4 CPUs and 6 GiB.
#
#   NODE_NET=...        docker network of the container for a command (default none); the e2e scripts use container:NAME to
#                       reach a database container that has no network of its own
#   NODE_CPUS=2         CPU limit (default 4; the CI runners have 2)
#   NODE_MOUNT=rw       mount the project writable (only to let a tool rewrite a tracked file, for example tsconfig.json)
#   NODE_ENV_FILE=...   a file of NAME=value lines passed to the container (the scripts use it for the database password)
#
# The image is the official Playwright image pinned by digest: tag v1.64.0-noble, built 2026-10-08, older than the seven
# day policy. Its browsers match the exact version of @playwright/test in package.json (a test checks both).
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
image=${NODE_IMAGE:-mcr.microsoft.com/playwright@sha256:06a9939e57531807f8d5fd76ce44b53165ffb7d7501d87ab10e285c20b1e971f}
cutoff=2026-10-31T00:00:00Z
name=$(basename "$here")
vol="node-modules-$name"
[ $# -ge 1 ] || { echo "usage: node.sh install | add PKG... | COMMAND" >&2; exit 2; }
# the mount points of the writable places must exist in the read-only project mount (a fresh clone has none of them)
mkdir -p "$here/out" "$here/.next" "$here/node_modules"
docker volume create "$vol" > /dev/null
# the volume must be owned by the unprivileged user
docker run --rm -u 0 -v "$vol:/nm" "$image" chown "$(id -u):$(id -g)" /nm > /dev/null

mode=${NODE_MOUNT:-ro}
net=${NODE_NET:-none}
case "$1" in
  install)
    net=bridge
    cmd='npm ci --ignore-scripts --no-audit --no-fund'
    ;;
  add)
    shift
    net=bridge
    mode=rw
    cmd="npm install --before=$cutoff --ignore-scripts --save-exact --no-audit --no-fund $*"
    ;;
  *)
    cmd="$*"
    ;;
esac
env_file=""
[ -z "${NODE_ENV_FILE:-}" ] || env_file="--env-file $NODE_ENV_FILE"
# shellcheck disable=SC2086
exec docker run --rm \
  --user "$(id -u):$(id -g)" \
  --cap-drop ALL --security-opt no-new-privileges \
  --cpus "${NODE_CPUS:-4}" --memory 6g --pids-limit 2048 --shm-size 1g \
  --network "$net" \
  --read-only --tmpfs /tmp:rw,exec,size=1g \
  -e HOME=/tmp/home -e npm_config_cache=/tmp/npm-cache -e npm_config_update_notifier=false \
  -e NEXT_TELEMETRY_DISABLED=1 -e CI -e E2E_WORKERS -e E2E_RETRIES $env_file \
  -v "$here:/work:$mode" -v "$here/out:/work/out" -v "$here/.next:/work/.next" -v "$vol:/work/node_modules" -w /work \
  "$image" sh -c "$cmd"
