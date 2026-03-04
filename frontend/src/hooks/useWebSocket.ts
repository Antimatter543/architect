import { useRef, useState, useCallback } from 'react';
import { ArchitectEvent, ConnectionStatus } from '../types/events';

interface UseWebSocketOptions {
  sessionId: string;
  onEvent: (event: ArchitectEvent) => void;
  onAudio: (pcmBytes: ArrayBuffer) => void;
}

export function useWebSocket({ sessionId, onEvent, onAudio }: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setStatus('connecting');

    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
    const protocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const host = backendUrl.replace(/^https?:\/\//, '');
    const url = `${protocol}://${host}/ws/${sessionId}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onmessage = async (ev) => {
      if (ev.data instanceof Blob) {
        const buf = await ev.data.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const nullIdx = bytes.indexOf(0);
        if (nullIdx === -1) return;
        const audioBytes = buf.slice(nullIdx + 1);
        onAudio(audioBytes);
      } else {
        try {
          const event = JSON.parse(ev.data) as ArchitectEvent;
          onEvent(event);
        } catch { /* ignore parse errors */ }
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;
    };

    ws.onerror = () => {
      setStatus('error');
    };
  }, [sessionId, onEvent, onAudio]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  const sendBinary = useCallback((buffer: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const header = new TextEncoder().encode(JSON.stringify({ type: 'audio' }));
      const nullByte = new Uint8Array([0]);
      const combined = new Uint8Array(header.length + 1 + buffer.byteLength);
      combined.set(header, 0);
      combined.set(nullByte, header.length);
      combined.set(new Uint8Array(buffer), header.length + 1);
      wsRef.current.send(combined.buffer);
    }
  }, []);

  const sendJSON = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, connect, disconnect, sendBinary, sendJSON };
}
