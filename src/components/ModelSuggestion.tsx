import React from 'react';
import { Zap, Cpu, BrainCircuit, X } from 'lucide-react';
import type { ModelId } from '../types';
import { MODEL_CONFIGS } from '../types';

interface ModelSuggestionProps {
  suggestedModel: ModelId;
  reason: string;
  onAccept: () => void;
  onDismiss: () => void;
}

const MODEL_ICONS: Record<ModelId, React.ReactNode> = {
  'claude-haiku-4.5': <Zap size={14} className="text-blue-500" />,
  'claude-sonnet-4.6': <Cpu size={14} className="text-blue-500" />,
  'claude-opus-4.6': <BrainCircuit size={14} className="text-blue-500" />,
};

export const ModelSuggestion: React.FC<ModelSuggestionProps> = ({
  suggestedModel,
  reason,
  onAccept,
  onDismiss,
}) => {
  const config = MODEL_CONFIGS[suggestedModel];

  return (
    <div className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 border-b border-blue-100 text-[12px] animate-fade-in">
      {MODEL_ICONS[suggestedModel]}
      <span className="flex-1 text-blue-800">
        Try <strong>{config.displayName}</strong> &mdash; {reason}
      </span>
      <button
        onClick={onAccept}
        className="px-2.5 py-1 rounded-lg bg-blue-500 text-white text-[11px] font-medium hover:bg-blue-600 transition-colors"
      >
        Switch
      </button>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};
