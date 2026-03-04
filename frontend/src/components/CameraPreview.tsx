interface CameraPreviewProps {
  stream: MediaStream | null;
  isActive: boolean;
}

export function CameraPreview({ stream, isActive }: CameraPreviewProps) {
  const videoRef = (el: HTMLVideoElement | null) => {
    if (el && stream) { el.srcObject = stream; }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          {isActive ? 'Starting camera...' : 'Camera off'}
        </div>
      )}
      {isActive && (
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">LIVE</span>
        </div>
      )}
    </div>
  );
}
