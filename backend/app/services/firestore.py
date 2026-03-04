import uuid
from datetime import datetime, timezone
from google.cloud import firestore
from app.config import FIRESTORE_COLLECTION

_db = None

def _get_db():
    global _db
    if _db is None:
        _db = firestore.Client()
    return _db


def save_room_analysis(session_id: str, analysis: dict) -> str:
    db = _get_db()
    doc_id = str(uuid.uuid4())
    db.collection(FIRESTORE_COLLECTION).document(session_id).collection("analyses").document(doc_id).set({
        "id": doc_id,
        "session_id": session_id,
        **analysis,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return doc_id


def get_latest_analysis(session_id: str) -> dict | None:
    db = _get_db()
    docs = (
        db.collection(FIRESTORE_COLLECTION)
        .document(session_id)
        .collection("analyses")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(1)
        .stream()
    )
    for doc in docs:
        return doc.to_dict()
    return None


def save_design(session_id: str, design: dict) -> str:
    db = _get_db()
    doc_id = str(uuid.uuid4())
    db.collection(FIRESTORE_COLLECTION).document(session_id).collection("designs").document(doc_id).set({
        "id": doc_id,
        "session_id": session_id,
        **design,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return doc_id


def get_designs(session_id: str) -> list[dict]:
    db = _get_db()
    docs = (
        db.collection(FIRESTORE_COLLECTION)
        .document(session_id)
        .collection("designs")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(20)
        .stream()
    )
    return [doc.to_dict() for doc in docs]


def save_shopping_list(session_id: str, shopping_list: dict) -> str:
    db = _get_db()
    doc_id = str(uuid.uuid4())
    db.collection(FIRESTORE_COLLECTION).document(session_id).collection("shopping").document(doc_id).set({
        "id": doc_id,
        "session_id": session_id,
        **shopping_list,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return doc_id
