import { RoomAnalysis } from '../types/events';

interface RoomAnalysisCardProps {
  analysis: RoomAnalysis | null;
}

export function RoomAnalysisCard({ analysis }: RoomAnalysisCardProps) {
  if (!analysis) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-2">
      <h3 className="text-sm font-bold text-white">Room Analysis</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-gray-400">Type:</span> <span className="text-white">{analysis.room_type}</span></div>
        <div><span className="text-gray-400">Size:</span> <span className="text-white">{analysis.estimated_dimensions || 'N/A'}</span></div>
        <div><span className="text-gray-400">Style:</span> <span className="text-white">{analysis.current_style}</span></div>
        <div><span className="text-gray-400">Light:</span> <span className="text-white">{analysis.lighting}</span></div>
      </div>
      {analysis.furniture.length > 0 && (
        <div>
          <span className="text-xs text-gray-400">Furniture ({analysis.furniture.length}):</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {analysis.furniture.map((item, i) => (
              <span key={i} className="text-xs bg-gray-700 px-2 py-0.5 rounded">{item.name}</span>
            ))}
          </div>
        </div>
      )}
      {analysis.color_palette.length > 0 && (
        <div className="flex gap-1">
          {analysis.color_palette.map((color, i) => (
            <div key={i} className="w-5 h-5 rounded-full border border-gray-600" style={{ backgroundColor: color }} />
          ))}
        </div>
      )}
    </div>
  );
}
