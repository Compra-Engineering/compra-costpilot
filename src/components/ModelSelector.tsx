import React from 'react';
import { MODEL_CONFIGS } from '../types';
import type { ModelId } from '../types';
import { ChevronDown, Check, Zap, Cpu, BrainCircuit, Lightbulb } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: ModelId;
  onSelect: (model: ModelId) => void;
  disabled?: boolean;
  thinkingEnabled: boolean;
  onToggleThinking: (enabled: boolean) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel, onSelect, disabled, thinkingEnabled, onToggleThinking
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const icon = (id: string, size = 14, active = false) => {
    const cls = active ? 'text-[var(--compra-orange)]' : 'text-[var(--text-tertiary)]';
    if (id.includes('haiku')) return <Zap size={size} className={cls} />;
    if (id.includes('sonnet')) return <Cpu size={size} className={cls} />;
    return <BrainCircuit size={size} className={cls} />;
  };

  const sel = MODEL_CONFIGS[selectedModel];

  return (
    <div className="flex items-center gap-1.5">
      {/* Thinking toggle */}
      <button
        onClick={() => onToggleThinking(!thinkingEnabled)}
        title={thinkingEnabled ? 'Deep Think ON' : 'Deep Think OFF'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
          thinkingEnabled
            ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
            : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-secondary)]'
        }`}
      >
        <Lightbulb size={14} className={thinkingEnabled ? 'text-amber-500' : ''} />
        <span className="hidden sm:inline">Deep Think</span>
      </button>

      {/* Model selector */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-primary)] transition-colors text-[13px] disabled:opacity-50"
        >
          {icon(sel.id, 14)}
          <span className="font-medium text-[var(--text-secondary)]">{sel.displayName}</span>
          <ChevronDown size={13} className={`text-[var(--text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-[280px] bg-white rounded-xl shadow-lg border border-[var(--border-light)] z-50 overflow-hidden animate-scale-in py-1">
            {(Object.values(MODEL_CONFIGS) as any[]).map((m: any) => (
              <button
                key={m.id}
                onClick={() => { onSelect(m.id); setIsOpen(false); }}
                className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                  selectedModel === m.id ? 'bg-[var(--bg-primary)]' : 'hover:bg-[var(--bg-primary)]'
                }`}
              >
                <div className="pt-0.5">{icon(m.id, 15, selectedModel === m.id)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-[13px] font-medium ${selectedModel === m.id ? 'text-[var(--compra-orange)]' : 'text-[var(--text-primary)]'}`}>
                      {m.displayName}
                    </span>
                    {selectedModel === m.id && <Check size={14} className="text-[var(--compra-orange)]" />}
                  </div>
                  <p className="text-[11.5px] text-[var(--text-tertiary)] mt-0.5">{m.description}</p>
                  <div className="flex gap-3 mt-1 text-[10px] font-mono text-[var(--text-tertiary)]">
                    <span>${m.inputPricePerMillion}/M in</span>
                    <span>${m.outputPricePerMillion}/M out</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
