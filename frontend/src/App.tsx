import { useState, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useCameraCapture } from './hooks/useCameraCapture';
import { CameraPreview } from './components/CameraPreview';
import { TranscriptPanel } from './components/TranscriptPanel';
import { DesignGallery } from './components/DesignGallery';
import { ShoppingPanel } from './components/ShoppingPanel';
import { StatusBar } from './components/StatusBar';
import { RoomAnalysisCard } from './components/RoomAnalysisCard';
import {
  ArchitectEvent, AgentPhase, TranscriptLine, DesignConcept,
  ProductResult, RoomAnalysis,
} from './types/events';

type Tab = 'transcript' | 'designs' | 'shopping';

export default function App() {
  const [sessionId] = useState(() => `arch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [phase, setPhase] = useState<AgentPhase | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [designs, setDesigns] = useState<DesignConcept[]>([]);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [shoppingTotal, setShoppingTotal] = useState(0);
  const [roomAnalysis, setRoomAnalysis] = useState<RoomAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('transcript');
  const audioInitRef = useRef(false);

  const { playAudio, initialize: initAudio } = useAudioPlayback();

  const onEvent = useCallback((event: ArchitectEvent) => {
    switch (event.type) {
      case 'connected':
        setTranscript(prev => [...prev, { text: event.message, role: 'assistant', timestamp: Date.now() }]);
        break;
      case 'transcript':
        setTranscript(prev => [...prev, { text: event.text, role: event.role, timestamp: Date.now() }]);
        break;
      case 'phase_change':
        setPhase(event.phase);
        break;
      case 'room_analysis':
        setRoomAnalysis(event.analysis);
        break;
      case 'design_generated':
        setDesigns(prev => [...prev, event.design]);
        setActiveTab('designs');
        break;
      case 'products_found':
        setProducts(prev => [...prev, ...event.products]);
        setShoppingTotal(prev => prev + event.products.reduce((sum, p) => sum + p.price, 0));
        setActiveTab('shopping');
        break;
      case 'shopping_list':
        setProducts(event.list.items);
        setShoppingTotal(event.list.total);
        setActiveTab('shopping');
        break;
      case 'error':
        setTranscript(prev => [...prev, { text: `Error: ${event.message}`, role: 'assistant', timestamp: Date.now() }]);
        break;
    }
  }, []);

  const onAudio = useCallback((pcmBytes: ArrayBuffer) => {
    playAudio(pcmBytes);
  }, [playAudio]);

  const { status, connect, disconnect, sendBinary, sendJSON } = useWebSocket({ sessionId, onEvent, onAudio });

  const { audioLevel } = useAudioCapture({ onPCMChunk: sendBinary, enabled: isMicOn });
  const { stream: cameraStream } = useCameraCapture({
    onFrame: (b64) => sendJSON({ type: 'video_frame', data: b64 }),
    enabled: isCameraOn,
  });

  const handleStartSession = async () => {
    if (!audioInitRef.current) {
      await initAudio();
      audioInitRef.current = true;
    }
    connect();
    setIsSessionActive(true);
    setIsMicOn(true);
    setIsCameraOn(true);
  };

  const handleEndSession = () => {
    setIsMicOn(false);
    setIsCameraOn(false);
    disconnect();
    setIsSessionActive(false);
    setPhase(null);
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'transcript', label: 'Chat' },
    { key: 'designs', label: 'Designs', count: designs.length },
    { key: 'shopping', label: 'Shopping', count: products.length },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      <StatusBar status={status} phase={phase} isMicOn={isMicOn} isCameraOn={isCameraOn} />

      <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ARCHITECT</h1>
          <p className="text-xs text-gray-500">Reimagine any space, in real-time</p>
        </div>
        {!isSessionActive ? (
          <button onClick={handleStartSession} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Start Session
          </button>
        ) : (
          <button onClick={handleEndSession} className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            End Session
          </button>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Camera + Room Analysis */}
        <div className="w-1/3 border-r border-gray-800 flex flex-col p-4 gap-4 overflow-y-auto">
          <CameraPreview stream={cameraStream} isActive={isCameraOn} />
          {audioLevel > 0 && (
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-100 rounded-full" style={{ width: `${audioLevel * 100}%` }} />
            </div>
          )}
          <RoomAnalysisCard analysis={roomAnalysis} />
          <div className="flex gap-2 mt-auto">
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              disabled={!isSessionActive}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                isMicOn ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-800 hover:bg-gray-700'
              } disabled:opacity-50`}
            >
              {isMicOn ? 'Mute' : 'Unmute'}
            </button>
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              disabled={!isSessionActive}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCameraOn ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-800 hover:bg-gray-700'
              } disabled:opacity-50`}
            >
              {isCameraOn ? 'Cam Off' : 'Cam On'}
            </button>
          </div>
        </div>

        {/* Right: Tabbed content */}
        <div className="flex-1 flex flex-col">
          <div className="flex border-b border-gray-800">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
                {tab.count ? <span className="ml-1.5 text-xs bg-gray-800 px-1.5 py-0.5 rounded-full">{tab.count}</span> : null}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'transcript' && <TranscriptPanel lines={transcript} />}
            {activeTab === 'designs' && <DesignGallery designs={designs} />}
            {activeTab === 'shopping' && <ShoppingPanel products={products} total={shoppingTotal} />}
          </div>
        </div>
      </main>
    </div>
  );
}
