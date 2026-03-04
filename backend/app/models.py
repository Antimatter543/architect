from pydantic import BaseModel
from typing import Optional
from enum import Enum


class AgentPhase(str, Enum):
    SCANNING = "scanning"
    DESIGNING = "designing"
    SHOPPING = "shopping"
    SUMMARY = "summary"


class FurnitureItem(BaseModel):
    name: str
    style: str
    estimated_dimensions: Optional[str] = None
    condition: Optional[str] = None


class RoomAnalysis(BaseModel):
    room_type: str  # e.g., "living room", "bedroom"
    estimated_dimensions: Optional[str] = None
    current_style: str  # e.g., "modern", "traditional"
    lighting: str  # e.g., "natural, bright", "dim, artificial"
    furniture: list[FurnitureItem] = []
    color_palette: list[str] = []  # hex codes of dominant colors
    notes: str = ""


class DesignConcept(BaseModel):
    style: str
    description: str
    image_url: Optional[str] = None
    image_b64: Optional[str] = None
    color_palette: list[str] = []
    mood: str = ""


class ProductResult(BaseModel):
    name: str
    price: float
    currency: str = "USD"
    url: Optional[str] = None
    image_url: Optional[str] = None
    source: str = ""
    style_match: float = 0.0  # 0-1 how well it matches


class ShoppingList(BaseModel):
    items: list[ProductResult] = []
    total: float = 0.0
    currency: str = "USD"
