import React from 'react';
import { Layers, DollarSign, Archive } from 'lucide-react';
import type { Message, ModelId, ContextCompression } from '../types';
import { MODEL_CONFIGS } from '../types';
import { calculateTokenEstimate, formatCost } from '../utils/tokenCounter';

interface ContextBarProps {
  messages: Message[];
  model: ModelId;
  compression?: ContextCompression;
  onOpenCompressionPanel?: () => void;
  onUndoCompression?: () => void;
}

export const ContextBar: React.FC<ContextBarProps> = ({
  messages,
  model,
  compression,
  onOpenCompressionPanel,
  onUndoCompression,
}) => {
  const excluded = messages.filter(m => m.excludeFromContext).length;
  const hasCompression = !!compression;

  // Show bar if there are excluded messages or compression is active or manual trigger available
  if (excluded === 0 && !hasCompression) return null;

  const modelConfig = MODEL_CONFIGS[model];

  if (hasCompression) {
    const activeMessages = messages.slice(compression.compressedUpToIndex).filter(m => !m.excludeFromContext);
    const activeTokens = activeMessages.reduce((sum, m) => sum + calculateTokenEstimate(m.content), 0);
    const totalContextTokens = compression.summaryTokenEstimate + activeTokens;
    const estimatedInputCost = (totalContextTokens / 1_000_000) * modelConfig.inputPricePerMillion;

    return (
      <div className="max-w-[var(--input-max-width)] mx-auto w-full px-4 animate-fade-in">
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-700 flex-wrap">
          <span className="flex items-center gap-1 font-medium">
            <Archive size={12} />
            Compressed: {(compression.summaryTokenEstimate / 1000).toFixed(1)}k tok summary
          </span>
          <span className="text-amber-300">&middot;</span>
          <span>{activeMessages.length} active messages</span>
          <span className="text-amber-300">&middot;</span>
          <span>~{totalContextTokens.toLocaleString()} tok context</span>
          <span className="text-amber-300">&middot;</span>
          <span className="flex items-center gap-0.5">
            <DollarSign size={10} className="text-emerald-600" />
            ~{formatCost(estimatedInputCost)} input/msg
          </span>
          {onUndoCompression && (
            <>
              <span className="text-amber-300">&middot;</span>
              <button
                onClick={onUndoCompression}
                className="text-amber-600 hover:text-amber-800 underline font-medium transition-colors"
              >
                Undo
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Default: exclusion-only bar
  const inContext = messages.filter(m => !m.excludeFromContext);
  const totalTokens = inContext.reduce(
    (sum, m) => sum + calculateTokenEstimate(m.content),
    0,
  );
  const estimatedInputCost = (totalTokens / 1_000_000) * modelConfig.inputPricePerMillion;

  return (
    <div className="max-w-[var(--input-max-width)] mx-auto w-full px-4 animate-fade-in">
      <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[11px] text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1 font-medium text-[var(--text-secondary)]">
          <Layers size={12} />
          {inContext.length}/{messages.length} messages in context
        </span>
        <span className="text-[var(--border-medium)]">&middot;</span>
        <span>~{totalTokens.toLocaleString()} tokens</span>
        <span className="text-[var(--border-medium)]">&middot;</span>
        <span className="flex items-center gap-0.5">
          <DollarSign size={10} className="text-emerald-600" />
          ~{formatCost(estimatedInputCost)} input/msg
        </span>
        {onOpenCompressionPanel && messages.length >= 6 && (
          <>
            <span className="text-[var(--border-medium)]">&middot;</span>
            <button
              onClick={onOpenCompressionPanel}
              className="flex items-center gap-1 text-[var(--compra-orange)] hover:underline font-medium transition-colors"
            >
              <Archive size={10} />
              Compress
            </button>
          </>
        )}
      </div>
    </div>
  );
};
