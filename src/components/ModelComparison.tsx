import React, { useEffect, useRef } from 'react';
import { X, Zap, Cpu, BrainCircuit, Check, TrendingDown, Lightbulb } from 'lucide-react';
import type { ModelId } from '../types';
import { compareCostsAcrossModels } from '../utils/costComparison';
import { formatCost } from '../utils/tokenCounter';

interface ModelComparisonProps {
  inputTokens: number;
  outputTokens: number;
  actualModelId: ModelId;
  actualTotalCost: number;
  onClose: () => void;
  thinkingUsed?: boolean;
}

const modelIcon = (id: string, size = 14) => {
  if (id.includes('haiku')) return <Zap size={size} className="text-blue-500" />;
  if (id.includes('sonnet')) return <Cpu size={size} className="text-violet-500" />;
  return <BrainCircuit size={size} className="text-amber-500" />;
};

export const ModelComparison: React.FC<ModelComparisonProps> = ({
  inputTokens,
  outputTokens,
  actualModelId,
  actualTotalCost,
  onClose,
  thinkingUsed = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const comparisons = compareCostsAcrossModels(inputTokens, outputTokens, actualModelId);

  // Find cheapest model that isn't the actual one
  const cheapest = comparisons
    .filter((c) => !c.isActual)
    .sort((a, b) => a.totalCost - b.totalCost)[0];

  const savingsSummary = (() => {
    if (!cheapest) return null;
    const diff = actualTotalCost - cheapest.totalCost;
    if (diff > 0) {
      const ratio = Math.round(actualTotalCost / cheapest.totalCost);
      if (ratio >= 2) {
        return `${cheapest.displayName} would have been ${ratio}x cheaper`;
      }
      return `${cheapest.displayName} would have saved ${formatCost(diff)}`;
    }
    // User already picked the cheapest or close to it
    const mostExpensive = comparisons
      .filter((c) => !c.isActual)
      .sort((a, b) => b.totalCost - a.totalCost)[0];
    if (mostExpensive) {
      const saved = mostExpensive.totalCost - actualTotalCost;
      if (saved > 0) {
        return `You saved ${formatCost(saved)} vs ${mostExpensive.displayName}`;
      }
    }
    return null;
  })();

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-[340px] bg-white rounded-xl shadow-lg border border-[var(--border-light)] z-50 animate-scale-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border-light)]">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">Model cost comparison</span>
          {thinkingUsed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              <Lightbulb size={10} />
              Deep Think
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="px-3.5 py-2">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="text-left font-medium pb-1.5">Model</th>
              <th className="text-right font-medium pb-1.5">Input</th>
              <th className="text-right font-medium pb-1.5">Output</th>
              <th className="text-right font-medium pb-1.5">Total</th>
              <th className="text-right font-medium pb-1.5 w-[80px]"></th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((c) => (
              <tr
                key={c.modelId}
                className={`text-[12px] ${c.isActual ? 'bg-emerald-50/50' : ''}`}
              >
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    {modelIcon(c.modelId)}
                    <span className={`font-medium ${c.isActual ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {c.displayName}
                    </span>
                  </div>
                </td>
                <td className="text-right py-1.5 font-mono text-[11px] text-[var(--text-tertiary)]">
                  {formatCost(c.inputCost)}
                </td>
                <td className="text-right py-1.5 font-mono text-[11px] text-[var(--text-tertiary)]">
                  {formatCost(c.outputCost)}
                </td>
                <td className="text-right py-1.5 font-mono text-[11px] font-medium text-[var(--text-primary)]">
                  {formatCost(c.totalCost)}
                </td>
                <td className="text-right py-1.5 pl-2">
                  {c.isActual ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <Check size={10} />
                      Used
                    </span>
                  ) : c.savingsVsThis > 0 ? (
                    <span className="text-[10px] font-medium text-emerald-600">
                      {formatCost(c.savingsVsThis)} less
                    </span>
                  ) : c.savingsVsThis < 0 ? (
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
                      {formatCost(Math.abs(c.savingsVsThis))} more
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Thinking note */}
      {thinkingUsed && (
        <div className="px-3.5 py-1.5 border-t border-[var(--border-light)] flex items-center gap-1.5">
          <Lightbulb size={11} className="text-amber-500 shrink-0" />
          <span className="text-[10px] text-[var(--text-tertiary)]">
            Output tokens include thinking overhead. Costs without thinking would be lower.
          </span>
        </div>
      )}

      {/* Savings summary */}
      {savingsSummary && (
        <div className="px-3.5 py-2 border-t border-[var(--border-light)] flex items-center gap-1.5">
          <TrendingDown size={12} className="text-emerald-500 shrink-0" />
          <span className="text-[11px] text-[var(--text-secondary)]">{savingsSummary}</span>
        </div>
      )}
    </div>
  );
};
