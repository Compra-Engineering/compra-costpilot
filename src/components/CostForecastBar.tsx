import React, { useMemo } from 'react';
import type { Conversation, ModelId } from '../types';
import { getContextTokenCount } from '../utils/contextCompression';
import { formatCost } from '../utils/tokenCounter';
import { calculateForecast, getCompressHint, getCostLevel } from '../utils/costForecast';

interface CostForecastBarProps {
  conversation: Conversation | null;
  promptTokens: number;
  selectedModel: ModelId;
  thinkingEnabled: boolean;
  onOpenCompressionPanel?: () => void;
}

const levelStyles = {
  low: 'border-l-2 border-l-emerald-400 bg-emerald-50/50',
  medium: 'border-l-2 border-l-amber-400 bg-amber-50/50',
  high: 'border-l-2 border-l-red-400 bg-red-50/50',
} as const;

const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toLocaleString();
};

export const CostForecastBar: React.FC<CostForecastBarProps> = ({
  conversation,
  promptTokens,
  selectedModel,
  thinkingEnabled,
  onOpenCompressionPanel,
}) => {
  const contextTokens = useMemo(() => {
    if (!conversation) return 0;
    return getContextTokenCount(conversation);
  }, [conversation]);

  const forecast = useMemo(
    () => calculateForecast(contextTokens, promptTokens, thinkingEnabled),
    [contextTokens, promptTokens, thinkingEnabled]
  );

  const compressHint = useMemo(() => {
    if (!conversation) return { shouldShow: false, currentOpusCost: 0, compressedOpusCost: 0 };
    return getCompressHint(conversation, promptTokens);
  }, [conversation, promptTokens]);

  if (promptTokens === 0) return null;

  const selectedModelForecast = forecast.models.find(m => m.modelId === selectedModel);
  const costLevel = getCostLevel(selectedModelForecast?.totalCost ?? 0);

  return (
    <div className="max-w-[var(--input-max-width)] mx-auto w-full px-4 pb-3 animate-fade-in">
      <div className={`px-3.5 py-2 rounded-xl ${levelStyles[costLevel]}`}>
        {/* Row 1: Token breakdown */}
        <div className="text-[11px] text-[var(--text-tertiary)]">
          <span>&#9889; </span>
          {contextTokens > 0 && (
            <span>~{formatTokenCount(contextTokens)} context + </span>
          )}
          <span>{promptTokens.toLocaleString()} prompt</span>
          <span> &rarr; {forecast.totalInputTokens.toLocaleString()} input tokens</span>
        </div>

        {/* Row 2: All-model costs */}
        <div className="text-[11px] mt-1 flex items-center flex-wrap gap-x-1">
          {forecast.models.map((model, idx) => {
            const isSelected = model.modelId === selectedModel;
            return (
              <span key={model.modelId} className="flex items-center">
                {idx > 0 && <span className="text-[var(--text-tertiary)] mx-0.5">&middot;</span>}
                {isSelected ? (
                  <span className="text-[var(--text-primary)] font-semibold bg-[var(--bg-primary)] px-2 py-0.5 rounded-md">
                    {model.displayName} {formatCost(model.totalCost)}
                  </span>
                ) : (
                  <span className="text-[var(--text-tertiary)]">
                    {model.displayName} {formatCost(model.totalCost)}
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* Row 3: Compress hint */}
        {compressHint.shouldShow && (
          <div className="text-[11px] mt-1 text-amber-600">
            <span>&#128161; Compress first &rarr; Opus drops to {formatCost(compressHint.compressedOpusCost)}</span>
            {onOpenCompressionPanel && (
              <>
                {' '}
                <button
                  onClick={onOpenCompressionPanel}
                  className="underline hover:text-amber-700 transition-colors"
                >
                  Compress
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
