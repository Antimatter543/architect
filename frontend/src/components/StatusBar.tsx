import { ConnectionStatus, AgentPhase } from '../types/events';

interface StatusBarProps {
  status: ConnectionStatus;
  phase: AgentPhase | null;
  isMicOn: boolean;
  isCameraOn: boolean;
}

const phaseLabels: Record<AgentPhase, string> = {
  scanning: 'Scanning Room',
  designing: 'Generating Design',
  shopping: 'Finding Furniture',
  summary: 'Summary',
};

export function StatusBar({ status, phase, isMicOn, isCameraOn }: StatusBarProps) {
  const statusColors: Record<ConnectionStatus, string> = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-xs text-gray-400 capitalize">{status}</span>
      </div>
      {phase && (
        <span className="text-xs text-blue-400 font-medium">{phaseLabels[phase]}</span>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{isMicOn ? 'Mic ON' : 'Mic OFF'}</span>
        <span>{isCameraOn ? 'Cam ON' : 'Cam OFF'}</span>
      </div>
    </div>
  );
}
