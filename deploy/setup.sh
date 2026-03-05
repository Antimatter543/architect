#!/bin/bash
set -euo pipefail

PROJECT_ID=$(gcloud config get-value project)
echo "Setting up ARCHITECT on project: $PROJECT_ID"

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com

# Create Firestore database (if not exists)
gcloud firestore databases create --region=us-central1 2>/dev/null || echo "Firestore already exists"

# Create GCS buckets
gsutil mb -p "$PROJECT_ID" -l us-central1 "gs://architect-images-$PROJECT_ID" 2>/dev/null || echo "Image bucket already exists"
gsutil mb -p "$PROJECT_ID" -l us-central1 "gs://architect-frontend-$PROJECT_ID" 2>/dev/null || echo "Frontend bucket already exists"

# Make frontend bucket public
gsutil iam ch allUsers:objectViewer "gs://architect-frontend-$PROJECT_ID"
gsutil web set -m index.html -e index.html "gs://architect-frontend-$PROJECT_ID"

# Store secrets in Secret Manager
store_secret() {
  local name=$1
  local prompt=$2
  echo "$prompt"
  read -r VALUE
  echo -n "$VALUE" | gcloud secrets create "$name" --data-file=- 2>/dev/null || \
    echo -n "$VALUE" | gcloud secrets versions add "$name" --data-file=-
}

store_secret "google-api-key"   "Enter your GOOGLE_API_KEY:"
store_secret "auth0-domain"     "Enter your AUTH0_DOMAIN (e.g. your-tenant.auth0.com):"
store_secret "auth0-audience"   "Enter your AUTH0_AUDIENCE (e.g. https://architect.api):"
store_secret "auth0-mgmt-token" "Enter your AUTH0_MGMT_TOKEN:"

# Grant Cloud Run SA access to all secrets
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
for secret in google-api-key auth0-domain auth0-audience auth0-mgmt-token; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="$SA" \
    --role="roles/secretmanager.secretAccessor"
done

echo ""
echo "Setup complete! Now run:"
echo "  gcloud builds submit --config=deploy/cloudbuild.yaml ."
echo ""
echo "Then update the frontend Cloud Build step with your Auth0 client ID:"
echo "  VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE"
