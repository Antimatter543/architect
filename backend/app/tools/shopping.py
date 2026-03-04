import json
import logging
from google import genai
from app.services.firestore import save_shopping_list

logger = logging.getLogger(__name__)


def search_furniture(
    session_id: str,
    query: str,
    style: str,
    max_budget: float = 0,
    room_type: str = "",
) -> dict:
    """Search for furniture items matching a style and description.

    Args:
        session_id: The current session ID.
        query: What to search for (e.g., "mid-century modern sofa", "Scandinavian dining table").
        style: Target design style.
        max_budget: Maximum budget in USD (0 = no limit).
        room_type: Type of room the furniture is for.

    Returns:
        dict with list of product results.
    """
    try:
        client = genai.Client()
        budget_str = f" under ${max_budget}" if max_budget > 0 else ""
        prompt = (
            f"You are a furniture shopping assistant. Find 3-5 real furniture products matching: "
            f"'{query}' in {style} style{budget_str}. "
            f"Return a JSON array of products with these fields: "
            f'"name" (str), "price" (number in USD), "source" (store name like IKEA, West Elm, etc), '
            f'"url" (realistic product URL), "style_match" (0-1 float). '
            f"Only return the JSON array, no other text."
        )

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )

        products = json.loads(response.text.strip().strip("```json").strip("```"))
        total = sum(p.get("price", 0) for p in products)

        result = {
            "success": True,
            "products": products,
            "total": total,
            "query": query,
            "style": style,
        }

        save_shopping_list(session_id, {
            "items": products,
            "total": total,
            "currency": "USD",
            "query": query,
        })

        return result
    except Exception as e:
        logger.error(f"Furniture search failed: {e}")
        return {"success": False, "error": str(e), "products": []}


def build_complete_shopping_list(
    session_id: str,
    items_json: str,
) -> dict:
    """Compile a complete shopping list with totals from previously found items.

    Args:
        session_id: The current session ID.
        items_json: JSON array of items to include, each with "name", "price", "source", "url".

    Returns:
        dict with organized shopping list and totals.
    """
    try:
        items = json.loads(items_json) if items_json else []
        total = sum(item.get("price", 0) for item in items)

        shopping_list = {
            "items": items,
            "total": round(total, 2),
            "currency": "USD",
            "item_count": len(items),
        }

        save_shopping_list(session_id, shopping_list)

        return {"success": True, **shopping_list}
    except Exception as e:
        logger.error(f"Shopping list build failed: {e}")
        return {"success": False, "error": str(e)}
