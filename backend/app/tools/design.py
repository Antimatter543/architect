import base64
import logging
from google import genai
from app.config import IMAGE_GEN_MODEL
from app.services.cloud_storage import upload_image_b64
from app.services.firestore import save_design

logger = logging.getLogger(__name__)


def generate_redesign(
    session_id: str,
    room_description: str,
    target_style: str,
    specific_requests: str = "",
    color_preferences: str = "",
) -> dict:
    """Generate a photorealistic redesign image for a room.

    Args:
        session_id: The current session ID.
        room_description: Description of the current room (from spatial analysis).
        target_style: Target design style (e.g., "mid-century modern", "Scandinavian").
        specific_requests: Any specific user requests (e.g., "keep the bookshelf", "add plants").
        color_preferences: Preferred color palette description.

    Returns:
        dict with success status, image URL, and design details.
    """
    prompt = (
        f"Professional interior design photograph of a {room_description} "
        f"redesigned in {target_style} style. "
        f"{'Specific details: ' + specific_requests + '. ' if specific_requests else ''}"
        f"{'Color palette: ' + color_preferences + '. ' if color_preferences else ''}"
        f"Photorealistic, magazine-quality, natural lighting, high resolution."
    )

    try:
        client = genai.Client()
        response = client.models.generate_content(
            model=IMAGE_GEN_MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )

        image_b64 = None
        description = ""
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                image_b64 = base64.b64encode(part.inline_data.data).decode()
            elif part.text:
                description = part.text

        if not image_b64:
            return {"success": False, "error": "No image generated"}

        image_url = upload_image_b64(image_b64, session_id, prefix="designs")

        design_data = {
            "style": target_style,
            "description": description or prompt,
            "image_url": image_url,
            "prompt_used": prompt,
        }
        save_design(session_id, design_data)

        return {
            "success": True,
            "image_b64": image_b64,
            "image_url": image_url,
            "style": target_style,
            "description": description or f"Room redesigned in {target_style} style",
            "prompt_used": prompt,
        }
    except Exception as e:
        logger.error(f"Design generation failed: {e}")
        return {"success": False, "error": str(e)}


def generate_color_palette(style: str, room_type: str) -> dict:
    """Generate a color palette for a design style.

    Args:
        style: Design style (e.g., "mid-century modern").
        room_type: Type of room (e.g., "living room").

    Returns:
        dict with color palette details.
    """
    try:
        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=(
                f"Generate a color palette for a {room_type} in {style} style. "
                f"Return exactly 5 hex color codes with names, formatted as JSON array: "
                f'[{{"hex": "#RRGGBB", "name": "Color Name"}}]. Only JSON, no other text.'
            ),
        )
        import json
        palette = json.loads(response.text.strip().strip("```json").strip("```"))
        return {"success": True, "palette": palette, "style": style}
    except Exception as e:
        logger.error(f"Palette generation failed: {e}")
        return {"success": False, "error": str(e)}
