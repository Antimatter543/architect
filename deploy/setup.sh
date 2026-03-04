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

# Store API key in Secret Manager (prompt user)
echo "Enter your GOOGLE_API_KEY:"
read -r API_KEY
echo -n "$API_KEY" | gcloud secrets create google-api-key --data-file=- 2>/dev/null || \
  echo -n "$API_KEY" | gcloud secrets versions add google-api-key --data-file=-

# Grant Cloud Run SA access to secrets
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding google-api-key \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

echo ""
echo "Setup complete! Now run:"
echo "  gcloud builds submit --config=deploy/cloudbuild.yaml ."
