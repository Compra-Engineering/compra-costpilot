import React, { useState, useMemo } from 'react';
import { X, Archive, Loader2 } from 'lucide-react';
import type { Conversation, ModelId } from '../types';
import { MODEL_CONFIGS } from '../types';
import {
  getContextTokenCount,
  calculateCompressionSplit,
  estimateCompressionCost,
  estimateProjectedSavings,
} from '../utils/contextCompression';
import { formatCost } from '../utils/tokenCounter';

interface CompressionPanelProps {
  conversation: Conversation;
  isOpen: boolean;
  onClose: () => void;
  onCompress: (model: ModelId, keepRecent: number) => void;
  isCompressing: boolean;
  compressionProgress: string;
  compressionError: string | null;
}

const KEEP_RECENT_OPTIONS = [2, 4, 6, 8];
const COMPRESSION_MODELS: ModelId[] = ['claude-haiku-4.5', 'claude-sonnet-4.6', 'claude-opus-4.6'];

export const CompressionPanel: React.FC<CompressionPanelProps> = ({
  conversation,
  isOpen,
  onClose,
  onCompress,
  isCompressing,
  compressionProgress,
  compressionError,
}) => {
  const [selectedModel, setSelectedModel] = useState<ModelId>('claude-haiku-4.5');
  const [keepRecent, setKeepRecent] = useState(4);

  const stats = useMemo(() => {
    const tokenCount = getContextTokenCount(conversation);
    const msgCount = conversation.messages.length;
    const modelConfig = MODEL_CONFIGS[conversation.model];
    const costPerMsg = (tokenCount / 1_000_000) * modelConfig.inputPricePerMillion;
    return { tokenCount, msgCount, costPerMsg };
  }, [conversation]);

  const split = useMemo(
    () => calculateCompressionSplit(conversation, keepRecent),
    [conversation, keepRecent]
  );

  const compressionCost = useMemo(
    () =>
      estimateCompressionCost(
        split.messagesToCompress,
        selectedModel,
        conversation.compression?.summary
      ),
    [split.messagesToCompress, selectedModel, conversation.compression?.summary]
  );

  const projectedSavings = useMemo(
    () =>
      estimateProjectedSavings(conversation, selectedModel, keepRecent, conversation.model),
    [conversation, selectedModel, keepRecent]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-2">
            <Archive size={18} className="text-amber-600" />
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Compress Context</h2>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Current stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--bg-primary)] rounded-xl px-3 py-2.5 text-center">
              <div className="text-[18px] font-semibold text-[var(--text-primary)]">
                {(stats.tokenCount / 1000).toFixed(1)}k
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">tokens in context</div>
            </div>
            <div className="bg-[var(--bg-primary)] rounded-xl px-3 py-2.5 text-center">
              <div className="text-[18px] font-semibold text-[var(--text-primary)]">
                {stats.msgCount}
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">messages</div>
            </div>
            <div className="bg-[var(--bg-primary)] rounded-xl px-3 py-2.5 text-center">
              <div className="text-[18px] font-semibold text-[var(--text-primary)]">
                {formatCost(stats.costPerMsg)}
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">input cost/msg</div>
            </div>
          </div>

          {/* Model picker */}
          <div>
            <label className="text-[12px] font-medium text-[var(--text-secondary)] mb-2 block">
              Compression model
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COMPRESSION_MODELS.map((modelId) => {
                const config = MODEL_CONFIGS[modelId];
                const isSelected = selectedModel === modelId;
                return (
                  <button
                    key={modelId}
                    onClick={() => setSelectedModel(modelId)}
                    disabled={isCompressing}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[var(--compra-orange)] bg-[var(--compra-orange-light)]'
                        : 'border-[var(--border-light)] hover:border-[var(--border-medium)]'
                    }`}
                  >
                    <div className="text-[12px] font-medium text-[var(--text-primary)]">
                      {config.displayName}
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                      ${config.inputPricePerMillion}/M in
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Keep recent */}
          <div>
            <label className="text-[12px] font-medium text-[var(--text-secondary)] mb-2 block">
              Keep recent messages
            </label>
            <div className="flex gap-2">
              {KEEP_RECENT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setKeepRecent(n)}
                  disabled={isCompressing}
                  className={`px-4 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                    keepRecent === n
                      ? 'border-[var(--compra-orange)] bg-[var(--compra-orange-light)] text-[var(--compra-orange)]'
                      : 'border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-[var(--bg-primary)] rounded-xl p-3.5 space-y-2 text-[12px]">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Messages to compress</span>
              <span className="font-medium">{split.messagesToCompress.length}</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Estimated compression cost</span>
              <span className="font-medium">{formatCost(compressionCost.estimatedCost)}</span>
            </div>
            <div className="border-t border-[var(--border-light)] pt-2 flex justify-between">
              <span className="text-[var(--text-secondary)]">Projected savings/msg</span>
              <span className="font-medium text-emerald-600">
                -{formatCost(projectedSavings.savingsCostPerMsg)} ({(projectedSavings.savingsPerMsg / 1000).toFixed(1)}k tokens)
              </span>
            </div>
          </div>

          {/* Progress */}
          {isCompressing && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 size={14} className="text-amber-600 animate-spin" />
                <span className="text-[12px] font-medium text-amber-700">Compressing...</span>
              </div>
              {compressionProgress && (
                <div className="text-[11px] text-amber-800 max-h-[100px] overflow-y-auto leading-relaxed">
                  {compressionProgress.slice(0, 500)}
                  {compressionProgress.length > 500 && '...'}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {compressionError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[12px] text-red-700 animate-fade-in">
              {compressionError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-light)]">
          <button
            onClick={onClose}
            disabled={isCompressing}
            className="px-4 py-2 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onCompress(selectedModel, keepRecent)}
            disabled={isCompressing || split.messagesToCompress.length === 0}
            className="px-5 py-2 rounded-xl text-[13px] font-medium bg-[var(--compra-orange)] text-white hover:bg-[var(--compra-orange-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompressing ? 'Compressing...' : 'Compress Now'}
          </button>
        </div>
      </div>
    </div>
  );
};
