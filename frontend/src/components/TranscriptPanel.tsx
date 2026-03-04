import { useEffect, useRef } from 'react';
import { TranscriptLine } from '../types/events';

interface TranscriptPanelProps {
  lines: TranscriptLine[];
}

export function TranscriptPanel({ lines }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="flex flex-col gap-3 overflow-y-auto h-full p-4">
      {lines.length === 0 && (
        <p className="text-gray-500 text-sm text-center mt-8">
          Start a session and show me a room...
        </p>
      )}
      {lines.map((line, i) => (
        <div key={i} className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
            line.role === 'user'
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-800 text-gray-100 rounded-bl-sm'
          }`}>
            {line.text}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
