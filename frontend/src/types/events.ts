export type AgentPhase = 'scanning' | 'designing' | 'shopping' | 'summary';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Events FROM backend
export type ArchitectEvent =
  | { type: 'connected'; session_id: string; message: string }
  | { type: 'transcript'; text: string; role: 'user' | 'assistant' }
  | { type: 'phase_change'; phase: AgentPhase }
  | { type: 'room_analysis'; analysis: RoomAnalysis }
  | { type: 'design_generated'; design: DesignConcept }
  | { type: 'products_found'; products: ProductResult[] }
  | { type: 'shopping_list'; list: ShoppingList }
  | { type: 'generating_image' }
  | { type: 'turn_complete' }
  | { type: 'error'; message: string };

export interface RoomAnalysis {
  room_type: string;
  estimated_dimensions?: string;
  current_style: string;
  lighting: string;
  furniture: FurnitureItem[];
  color_palette: string[];
  notes: string;
}

export interface FurnitureItem {
  name: string;
  style: string;
  estimated_dimensions?: string;
  condition?: string;
}

export interface DesignConcept {
  style: string;
  description: string;
  image_url?: string;
  image_b64?: string;
  color_palette: string[];
  mood: string;
}

export interface ProductResult {
  name: string;
  price: number;
  currency: string;
  url?: string;
  image_url?: string;
  source: string;
  style_match: number;
}

export interface ShoppingList {
  items: ProductResult[];
  total: number;
  currency: string;
}

export interface TranscriptLine {
  text: string;
  role: 'user' | 'assistant';
  timestamp: number;
}
