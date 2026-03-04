import { useRef, useCallback } from 'react';

export function useAudioPlayback() {
  const ctxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);

  const initialize = useCallback(async () => {
    if (workletRef.current) return;
    const ctx = new AudioContext({ sampleRate: 48000 });
    ctxRef.current = ctx;
    await ctx.audioWorklet.addModule('/pcm-playback-processor.js');
    const worklet = new AudioWorkletNode(ctx, 'pcm-playback-processor', {
      processorOptions: { sourceSampleRate: 24000, bufferSize: 48000 * 4 },
      outputChannelCount: [1],
    });
    worklet.connect(ctx.destination);
    workletRef.current = worklet;
  }, []);

  const playAudio = useCallback((audioBuffer: ArrayBuffer) => {
    const node = workletRef.current;
    if (!node) return;
    const copy = audioBuffer.slice(0);
    node.port.postMessage({ type: 'audio', buffer: copy }, [copy]);
  }, []);

  const clearBuffer = useCallback(() => {
    workletRef.current?.port.postMessage({ type: 'clear' });
  }, []);

  return { initialize, playAudio, clearBuffer };
}
