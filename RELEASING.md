# Releasing

A release is a git tag `vMAJOR.MINOR.PATCH` pushed to GitHub. The `release` workflow (`.github/workflows/release.yml`) does the rest. Nothing is published to a package registry (the package is `private`; the thing to take is the source archive).

## Cut a release

1. On `main` with a green CI, set the new version and commit it:

   ```sh
   scripts/node.sh "npm version 0.2.0 --no-git-tag-version"   # updates package.json and package-lock.json
   git commit -am "Release 0.2.0"
   ```

2. Add the section of the release to `CHANGELOG.md` in the same commit, then tag and push:

   ```sh
   git tag -a v0.2.0 -m "v0.2.0"
   git push origin main v0.2.0
   ```

The workflow stops before releasing anything unless the tag is exactly `v` plus the version in `package.json` (`scripts/check-release-tag.sh`) and the tagged commit is in the history of the default branch. The `verify` job runs the whole of `ci.yml` (typecheck, unit and integration tests with coverage, the Playwright suite against the digest-pinned PostgreSQL service, the secret scan, the CI definitions, the release script tests, the age of the dependencies). The `release` job archives the tagged commit with `git archive`, writes `SHA256SUMS`, creates a build-provenance attestation and creates the GitHub release with `GITHUB_TOKEN`. The notes are the subjects of the commits since the previous tag (`scripts/release-notes.sh`). A tag with a `-` in it is a pre-release. Running the workflow by hand runs the checks and keeps the archive for seven days; it never creates a release.

## Verify a download

```sh
sha256sum -c SHA256SUMS            # macOS: shasum -a 256 -c SHA256SUMS
gh attestation verify FILE --repo kienpt91/nextjs-e2e-kit
```

The checksum shows the file is the one listed; the attestation shows which workflow and commit built it. Do both. (Attestations need a public repository.)

## What the workflow has not done

It has not run on GitHub yet: the first tag is its first test. Until then treat it as unexercised; the shell scripts it calls are tested (`scripts/test-release.sh`, CI job `release-scripts`).
