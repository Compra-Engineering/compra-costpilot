import React, { useState, useMemo } from 'react';
import { Calculator, ChevronDown, Zap, Cpu, BrainCircuit, Check, Lightbulb } from 'lucide-react';
import type { ModelId } from '../types';
import { MODEL_CONFIGS } from '../types';
import { compareCostsAcrossModels } from '../utils/costComparison';
import { formatCost } from '../utils/tokenCounter';

interface CostEstimatorProps {
  inputTokens: number;
  selectedModel: ModelId;
  isExpanded: boolean;
  onToggle: () => void;
  thinkingEnabled?: boolean;
}

const OUTPUT_PRESETS = [
  { label: 'Short', tokens: 500, thinkingTokens: 4000, description: '~500 tok', thinkingDescription: '~4.5K tok' },
  { label: 'Medium', tokens: 2000, thinkingTokens: 8000, description: '~2K tok', thinkingDescription: '~10K tok' },
  { label: 'Long', tokens: 8000, thinkingTokens: 16000, description: '~8K tok', thinkingDescription: '~24K tok' },
] as const;

const modelIcon = (id: string, size = 14) => {
  if (id.includes('haiku')) return <Zap size={size} className="text-blue-500" />;
  if (id.includes('sonnet')) return <Cpu size={size} className="text-violet-500" />;
  return <BrainCircuit size={size} className="text-amber-500" />;
};

export const CostEstimator: React.FC<CostEstimatorProps> = ({
  inputTokens,
  selectedModel,
  isExpanded,
  onToggle,
  thinkingEnabled = false,
}) => {
  const [outputPreset, setOutputPreset] = useState(1); // default Medium

  const preset = OUTPUT_PRESETS[outputPreset];
  const outputTokens = thinkingEnabled
    ? preset.tokens + preset.thinkingTokens
    : preset.tokens;

  const comparisons = useMemo(
    () => compareCostsAcrossModels(inputTokens, outputTokens, selectedModel),
    [inputTokens, outputTokens, selectedModel]
  );

  const selectedCost = comparisons.find((c) => c.isSelected);

  if (inputTokens <= 0) return null;

  return (
    <div className="border-b border-[var(--border-light)]">
      {/* Collapsed bar */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3.5 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
      >
        <Calculator size={13} className="text-[var(--compra-orange)] shrink-0" />
        <span className="font-medium">Est. cost:</span>
        <span className="font-mono text-[var(--text-primary)]">
          {selectedCost ? formatCost(selectedCost.totalCost) : '--'}
        </span>
        <span className="text-[var(--text-tertiary)]">
          ({MODEL_CONFIGS[selectedModel].displayName})
        </span>
        {thinkingEnabled && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
            <Lightbulb size={10} />
            Deep Think
          </span>
        )}
        <ChevronDown
          size={13}
          className={`ml-auto text-[var(--text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="px-3.5 pb-3 animate-expand">
          {/* Thinking mode notice */}
          {thinkingEnabled && (
            <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
              <Lightbulb size={12} className="text-amber-500 shrink-0" />
              <span className="text-[11px] text-amber-700">
                Deep Think is on — estimates include ~{(preset.thinkingTokens / 1000).toFixed(0)}K thinking tokens in output
              </span>
            </div>
          )}

          {/* Output length selector */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
              Output length:
            </span>
            <div className="flex gap-1">
              {OUTPUT_PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => setOutputPreset(i)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                    outputPreset === i
                      ? 'bg-[var(--text-primary)] text-white'
                      : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)]'
                  }`}
                >
                  {p.label}
                  <span className="ml-1 opacity-60">{thinkingEnabled ? p.thinkingDescription : p.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comparison table */}
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                <th className="text-left font-medium pb-1.5">Model</th>
                <th className="text-right font-medium pb-1.5">Input</th>
                <th className="text-right font-medium pb-1.5">Output</th>
                <th className="text-right font-medium pb-1.5">Total</th>
                <th className="text-right font-medium pb-1.5 w-[90px]"></th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => (
                <tr
                  key={c.modelId}
                  className={`text-[12px] ${c.isSelected ? 'bg-[var(--compra-orange-light)]' : ''}`}
                >
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      {modelIcon(c.modelId)}
                      <span className={`font-medium ${c.isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
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
                    {c.isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--compra-orange)] bg-[var(--compra-orange-light)] px-1.5 py-0.5 rounded-full">
                        <Check size={10} />
                        Selected
                      </span>
                    ) : c.multiplier ? (
                      <span className={`text-[10px] font-medium ${
                        c.savingsVsThis > 0 ? 'text-emerald-600' : 'text-[var(--text-tertiary)]'
                      }`}>
                        {c.multiplier}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <p className="text-[10px] text-[var(--text-tertiary)] mt-2 leading-relaxed">
            Estimates based on ~4 chars/token. Actual costs vary.{thinkingEnabled && ' Thinking token usage depends on prompt complexity.'}
          </p>
        </div>
      )}
    </div>
  );
};
