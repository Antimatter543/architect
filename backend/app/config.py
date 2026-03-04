import os
from dotenv import load_dotenv

load_dotenv()

# Models
ORCHESTRATOR_MODEL = "gemini-2.0-flash-live-001"
IMAGE_GEN_MODEL = "gemini-2.0-flash-exp-image-generation"
SUBAGENT_MODEL = "gemini-2.0-flash"

# GCP
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "")
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "architect-images")
FIRESTORE_COLLECTION = os.getenv("FIRESTORE_COLLECTION", "architect_sessions")

# Server
HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "8080"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
