import { useRef, useState, useEffect } from 'react';

interface UseAudioCaptureOptions {
  onPCMChunk: (buffer: ArrayBuffer) => void;
  enabled: boolean;
}

export function useAudioCapture({ onPCMChunk, enabled }: UseAudioCaptureOptions) {
  const [audioLevel, setAudioLevel] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      if (workletRef.current) {
        workletRef.current.disconnect();
        workletRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      cancelAnimationFrame(rafRef.current);
      setAudioLevel(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const ctx = new AudioContext({ sampleRate: 48000 });
        ctxRef.current = ctx;

        await ctx.audioWorklet.addModule('/pcm-capture-processor.js');
        const worklet = new AudioWorkletNode(ctx, 'pcm-capture-processor', {
          processorOptions: { targetSampleRate: 16000, chunkSize: 4096 },
        });
        workletRef.current = worklet;

        worklet.port.onmessage = (e) => {
          if (e.data?.type === 'pcm') onPCMChunk(e.data.buffer);
        };

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        source.connect(analyser);
        source.connect(worklet);
        worklet.connect(ctx.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
          setAudioLevel(avg);
          rafRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (err) {
        console.error('Audio capture failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, onPCMChunk]);

  return { audioLevel };
}
