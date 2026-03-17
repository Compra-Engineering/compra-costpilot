import React from 'react';
import { Archive } from 'lucide-react';
import type { ContextCompression } from '../types';

interface CompressionDividerProps {
  compression: ContextCompression;
  compressedMessageCount: number;
  onUndo: () => void;
}

export const CompressionDivider: React.FC<CompressionDividerProps> = ({
  compression,
  compressedMessageCount,
  onUndo,
}) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3 my-2 mx-auto max-w-[var(--chat-max-width)]">
      <div className="flex-1 border-t border-dashed border-amber-300" />
      <div className="flex items-center gap-2 text-[11px] text-amber-600 shrink-0">
        <Archive size={12} />
        <span>
          Compressed: {compressedMessageCount} messages into ~{(compression.summaryTokenEstimate / 1000).toFixed(1)}k token summary
        </span>
        <button
          onClick={onUndo}
          className="text-amber-500 hover:text-amber-700 underline transition-colors"
        >
          Undo
        </button>
      </div>
      <div className="flex-1 border-t border-dashed border-amber-300" />
    </div>
  );
};
