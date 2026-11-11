#!/usr/bin/env bash
# npm run deploy — build the image in Cloud Build and roll it out to Cloud Run (manual deploy from WSL).
# One-time project setup (APIs, Artifact Registry, secret, runtime service account, public invoker) is in
# the Container Setup Spec; the free-tier guardrails are in README.md → Deployment.
set -euo pipefail

REGION=asia-southeast1
SERVICE=dmw-demo

command -v gcloud >/dev/null || {
  echo "deploy: install the gcloud CLI first (https://cloud.google.com/sdk/docs/install), then gcloud auth login" >&2
  exit 1
}
PROJECT=$(gcloud config get-value project 2>/dev/null || true)
[ -n "$PROJECT" ] || { echo "deploy: no project set: gcloud config set project <PROJECT_ID>" >&2; exit 1; }

# The image is tagged with the commit SHA, but Cloud Build uploads the working tree: refuse a dirty tree
# so the tag always matches what shipped.
if [ -n "$(git status --porcelain)" ] && [ "${ALLOW_DIRTY:-}" != "1" ]; then
  echo "deploy: uncommitted changes; commit first (or ALLOW_DIRTY=1 npm run deploy)" >&2
  exit 1
fi

npm run --silent check:index
TAG=$(git rev-parse --short HEAD)
echo "deploy: building $SERVICE:$TAG in $PROJECT ($REGION)"
gcloud builds submit --config cloudbuild.yaml --region "$REGION" --substitutions "_TAG=$TAG"

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
echo "deploy: live at $URL"
curl -fsS --retry 5 --retry-all-errors "$URL/api/health" && echo
