#!/bin/sh
# Ask a real GitLab to lint the pipeline file: starts a throwaway GitLab CE container, creates a project, commits the file and runs
# GitLab's own CI linter on it (a parse, and a dry run of the pipeline for the default branch). Takes about three minutes and needs
# about 4 GiB of memory. The container has NO network at all (the API is called from inside it) and is removed on exit.
#
# usage: scripts/gitlab-lint.sh [PIPELINE_FILE]      (default .gitlab-ci.yml); exit 1 when GitLab says the file is invalid
# The image is gitlab-ce 19.5.3-ce.0 pinned by digest (published 2026-10-29). The first run pulls about 1.6 GB.
set -eu
cd "$(dirname "$0")/.."
file=${1:-.gitlab-ci.yml}
image=gitlab/gitlab-ce@sha256:6863d156a1a477bd6f69fc674b671d0163cd8b06bf63bb17cc4a4a803b78b27c
name=nextjs-e2e-kit-gitlab-$(od -An -N6 -tx1 /dev/urandom | tr -d ' \n')
cleanup() { docker rm -f -v "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

root_password="Aa1-$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')"
docker run -d --name "$name" --network none --memory 8g --shm-size 512m \
  -e GITLAB_ROOT_PASSWORD="$root_password" \
  -e GITLAB_OMNIBUS_CONFIG="external_url 'http://localhost'; puma['worker_processes'] = 0; sidekiq['concurrency'] = 5; prometheus_monitoring['enable'] = false; gitlab_rails['usage_ping_enabled'] = false; gitlab_rails['gitlab_signup_enabled'] = false" \
  "$image" >/dev/null

echo "waiting for GitLab to start (about two minutes)" >&2
i=0
until docker exec "$name" curl -s -m 5 localhost/-/readiness 2>/dev/null | grep -q '"status":"ok"'; do
  i=$((i + 1))
  if [ "$i" -gt 90 ]; then echo "gitlab-lint: GitLab did not become ready" >&2; docker logs --tail 30 "$name" >&2 || true; exit 2; fi
  sleep 10
done

docker exec "$name" gitlab-rails runner "
user = User.find_by_username('root')
token = PersonalAccessToken.create!(user: user, name: 'lint', scopes: [:api], expires_at: 1.day.from_now, organization: user.organization)
File.write('/tmp/lint-token', token.token)
" >/dev/null
docker cp "$file" "$name:/tmp/pipeline.yml"
docker cp scripts/gitlab-lint-run.rb "$name:/tmp/gitlab-lint-run.rb"
docker exec "$name" /opt/gitlab/embedded/bin/ruby /tmp/gitlab-lint-run.rb /tmp/lint-token /tmp/pipeline.yml
