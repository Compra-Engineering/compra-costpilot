import React from 'react';
import { Archive, X } from 'lucide-react';
import type { Conversation } from '../types';
import { getContextTokenCount } from '../utils/contextCompression';
import { estimateProjectedSavings } from '../utils/contextCompression';

interface CompressionBannerProps {
  conversation: Conversation;
  onCompress: () => void;
  onDismiss: () => void;
}

export const CompressionBanner: React.FC<CompressionBannerProps> = ({
  conversation,
  onCompress,
  onDismiss,
}) => {
  const tokenCount = getContextTokenCount(conversation);
  const tokenK = (tokenCount / 1000).toFixed(0);

  const { savingsCostPerMsg } = estimateProjectedSavings(
    conversation,
    'claude-haiku-4.5',
    4,
    conversation.model
  );

  return (
    <div className="max-w-[var(--input-max-width)] mx-auto w-full px-4 animate-slide-down">
      <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[12px]">
        <Archive size={14} className="text-amber-600 shrink-0" />
        <span className="text-amber-800 flex-1">
          Context is ~{tokenK}k tokens. Compress to save ~${savingsCostPerMsg.toFixed(3)}/message
        </span>
        <button
          onClick={onCompress}
          className="px-3 py-1 rounded-lg bg-[var(--compra-orange)] text-white text-[11px] font-medium hover:bg-[var(--compra-orange-hover)] transition-colors"
        >
          Compress
        </button>
        <button
          onClick={onDismiss}
          className="p-0.5 text-amber-400 hover:text-amber-600 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
