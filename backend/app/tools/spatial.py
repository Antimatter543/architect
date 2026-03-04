import json
import logging
from app.services.firestore import save_room_analysis

logger = logging.getLogger(__name__)


def analyze_room(
    session_id: str,
    room_type: str,
    estimated_dimensions: str,
    current_style: str,
    lighting: str,
    furniture_json: str,
    color_palette_json: str,
    notes: str = "",
) -> dict:
    """Analyze a room based on camera observations. Call this after observing the room through the camera.

    Args:
        session_id: The current session ID.
        room_type: Type of room (e.g., "living room", "bedroom", "kitchen").
        estimated_dimensions: Estimated room dimensions (e.g., "4m x 5m").
        current_style: Current design style (e.g., "modern minimalist", "traditional").
        lighting: Lighting description (e.g., "bright natural light from south windows").
        furniture_json: JSON array of furniture items, each with "name", "style", "estimated_dimensions", "condition".
        color_palette_json: JSON array of hex color strings for dominant colors.
        notes: Additional observations about the space.

    Returns:
        dict with success status and analysis summary.
    """
    try:
        furniture = json.loads(furniture_json) if furniture_json else []
        colors = json.loads(color_palette_json) if color_palette_json else []
    except json.JSONDecodeError:
        furniture = []
        colors = []

    analysis = {
        "room_type": room_type,
        "estimated_dimensions": estimated_dimensions,
        "current_style": current_style,
        "lighting": lighting,
        "furniture": furniture,
        "color_palette": colors,
        "notes": notes,
    }

    doc_id = save_room_analysis(session_id, analysis)
    logger.info(f"Room analysis saved: {doc_id}")

    return {
        "success": True,
        "analysis_id": doc_id,
        "summary": f"{room_type} ({estimated_dimensions}), {current_style} style, {len(furniture)} furniture items detected",
        "analysis": analysis,
    }
