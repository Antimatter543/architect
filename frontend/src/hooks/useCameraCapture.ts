import { useRef, useState, useEffect } from 'react';

interface UseCameraCaptureOptions {
  onFrame: (jpegB64: string) => void;
  enabled: boolean;
  fps?: number;
  resolution?: number;
}

export function useCameraCapture({ onFrame, enabled, fps = 1, resolution = 768 }: UseCameraCaptureOptions) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: resolution }, height: { ideal: resolution }, facingMode: 'environment' },
        });
        if (cancelled) { mediaStream.getTracks().forEach(t => t.stop()); return; }
        setStream(mediaStream);

        const video = document.createElement('video');
        video.srcObject = mediaStream;
        video.playsInline = true;
        await video.play();
        videoRef.current = video;

        const canvas = document.createElement('canvas');
        canvasRef.current = canvas;

        intervalRef.current = setInterval(() => {
          if (!video.videoWidth) return;
          canvas.width = Math.min(video.videoWidth, resolution);
          canvas.height = Math.min(video.videoHeight, resolution);
          const ctx2d = canvas.getContext('2d')!;
          ctx2d.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          const b64 = dataUrl.split(',')[1];
          onFrame(b64);
        }, 1000 / fps);
      } catch (err) {
        console.error('Camera capture failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, fps, resolution, onFrame]);

  return { stream };
}
