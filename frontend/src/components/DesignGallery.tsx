import { useState } from 'react';
import { DesignConcept } from '../types/events';

interface DesignGalleryProps {
  designs: DesignConcept[];
}

export function DesignGallery({ designs }: DesignGalleryProps) {
  const [selected, setSelected] = useState<number | null>(null);

  if (designs.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center p-8">
        Redesign images will appear here...
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {designs.map((design, i) => (
          <div
            key={i}
            className="relative rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
            onClick={() => setSelected(selected === i ? null : i)}
          >
            <img
              src={design.image_b64 ? `data:image/jpeg;base64,${design.image_b64}` : design.image_url}
              alt={design.description}
              className="w-full aspect-square object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <span className="text-xs text-white font-medium">{design.style}</span>
            </div>
          </div>
        ))}
      </div>
      {selected !== null && designs[selected] && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <img
            src={designs[selected].image_b64 ? `data:image/jpeg;base64,${designs[selected].image_b64}` : designs[selected].image_url}
            alt={designs[selected].description}
            className="w-full rounded-lg mb-3"
          />
          <p className="text-sm text-gray-300">{designs[selected].description}</p>
          {designs[selected].color_palette.length > 0 && (
            <div className="flex gap-2 mt-2">
              {designs[selected].color_palette.map((color, j) => (
                <div key={j} className="w-8 h-8 rounded-full border border-gray-600" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
