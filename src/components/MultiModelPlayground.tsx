import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  X, Lightbulb, Play, Zap, Cpu, BrainCircuit,
  DollarSign, Clock, Copy, Check, ChevronDown, FlaskConical,
  CheckCircle2, AlertTriangle, Sparkles, ArrowRight
} from 'lucide-react';
import type { ModelId, TokenUsage } from '../types';
import { MODEL_CONFIGS } from '../types';
import { sendMessageToClaude } from '../utils/claudeApi';
import { calculateMessageCost, formatCost, calculateTokenEstimate } from '../utils/tokenCounter';

interface MultiModelPlaygroundProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
}

interface ModelResult {
  content: string;
  thinking: string;
  isStreaming: boolean;
  usage: TokenUsage | null;
  cost: { inputCost: number; outputCost: number; totalCost: number } | null;
  error: string | null;
  latencyMs: number | null;
}

const MODEL_IDS: ModelId[] = ['claude-haiku-4.5', 'claude-sonnet-4.6', 'claude-opus-4.6'];

const MODEL_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; glow: string }> = {
  'claude-haiku-4.5': { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', dot: 'bg-violet-500', glow: 'shadow-violet-100' },
  'claude-sonnet-4.6': { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-600', dot: 'bg-sky-500', glow: 'shadow-sky-100' },
  'claude-opus-4.6': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', dot: 'bg-amber-500', glow: 'shadow-amber-100' },
};

const emptyResult = (): ModelResult => ({
  content: '',
  thinking: '',
  isStreaming: false,
  usage: null,
  cost: null,
  error: null,
  latencyMs: null,
});

const modelIcon = (id: string, size = 16) => {
  if (id.includes('haiku')) return <Zap size={size} />;
  if (id.includes('sonnet')) return <Cpu size={size} />;
  return <BrainCircuit size={size} />;
};

// ── Live elapsed timer hook ──
function useElapsedTimers(results: Record<ModelId, ModelResult>, startTimes: Record<string, number>) {
  const [elapsed, setElapsed] = useState<Record<string, number>>({});

  useEffect(() => {
    const anyStreaming = MODEL_IDS.some(id => results[id].isStreaming);
    if (!anyStreaming) return;

    const tick = () => {
      const now = Date.now();
      const next: Record<string, number> = {};
      MODEL_IDS.forEach(id => {
        if (results[id].isStreaming && startTimes[id]) {
          next[id] = now - startTimes[id];
        }
      });
      setElapsed(next);
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [results, startTimes]);

  return elapsed;
}

export const MultiModelPlayground: React.FC<MultiModelPlaygroundProps> = ({
  isOpen, onClose, apiKey,
}) => {
  const [prompt, setPrompt] = useState('');
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Record<ModelId, ModelResult>>(() => {
    const init: Record<string, ModelResult> = {};
    MODEL_IDS.forEach(id => { init[id] = emptyResult(); });
    return init as Record<ModelId, ModelResult>;
  });

  const startTimesRef = useRef<Record<string, number>>({});
  const [startTimesState, setStartTimesState] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [thinkingOpen, setThinkingOpen] = useState<Record<string, boolean>>({});
  const [justCompleted, setJustCompleted] = useState<Record<string, boolean>>({});

  // Auto-scroll refs for each column
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Elapsed timers
  const elapsed = useElapsedTimers(results, startTimesState);

  // Auto-scroll columns as content streams
  useEffect(() => {
    MODEL_IDS.forEach(id => {
      const el = scrollRefs.current[id];
      if (el && results[id].isStreaming) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [results]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tokenEstimate = prompt.trim() ? calculateTokenEstimate(prompt) : 0;

  const updateResult = useCallback((modelId: ModelId, patch: Partial<ModelResult>) => {
    setResults(prev => ({
      ...prev,
      [modelId]: { ...prev[modelId], ...patch },
    }));
  }, []);

  const handleRun = useCallback(async () => {
    if (!prompt.trim() || isRunning) return;

    // Reset all results
    const fresh: Record<string, ModelResult> = {};
    MODEL_IDS.forEach(id => { fresh[id] = { ...emptyResult(), isStreaming: true }; });
    setResults(fresh as Record<ModelId, ModelResult>);
    setIsRunning(true);
    setThinkingOpen({});
    setJustCompleted({});

    const times: Record<string, number> = {};
    MODEL_IDS.forEach(id => { times[id] = Date.now(); });
    startTimesRef.current = times;
    setStartTimesState({ ...times });

    const promises = MODEL_IDS.map(async (modelId) => {
      const startTime = times[modelId];

      let streamedContent = '';
      let streamedThinking = '';

      const userMessage = {
        id: `playground-${modelId}-${Date.now()}`,
        role: 'user' as const,
        content: prompt,
        timestamp: Date.now(),
      };

      try {
        await sendMessageToClaude(
          [userMessage],
          modelId,
          apiKey,
          {
            onChunk: (text: string) => {
              streamedContent += text;
              updateResult(modelId, { content: streamedContent });
            },
            onThinking: (text: string) => {
              streamedThinking += text;
              updateResult(modelId, { thinking: streamedThinking });
            },
            onUsage: (usage: TokenUsage) => {
              const config = MODEL_CONFIGS[modelId];
              const cost = calculateMessageCost(
                usage.input_tokens,
                usage.output_tokens,
                config.inputPricePerMillion,
                config.outputPricePerMillion,
              );
              const latencyMs = Date.now() - startTime;
              updateResult(modelId, {
                usage,
                cost,
                latencyMs,
                isStreaming: false,
              });
              // Flash the "complete" badge
              setJustCompleted(prev => ({ ...prev, [modelId]: true }));
              setTimeout(() => setJustCompleted(prev => ({ ...prev, [modelId]: false })), 1500);
            },
            onComplete: () => {
              updateResult(modelId, {
                isStreaming: false,
              });
            },
            onError: (error: Error) => {
              updateResult(modelId, {
                error: error.message,
                isStreaming: false,
                latencyMs: Date.now() - startTime,
              });
            },
          },
          thinkingEnabled,
        );
      } catch (err: any) {
        updateResult(modelId, {
          error: err?.message || 'Unknown error',
          isStreaming: false,
          latencyMs: Date.now() - startTime,
        });
      }
    });

    await Promise.allSettled(promises);
    setIsRunning(false);
  }, [prompt, isRunning, apiKey, thinkingEnabled, updateResult]);

  // Computed state
  const allComplete = MODEL_IDS.every(id => !results[id].isStreaming);
  const hasAnyResult = MODEL_IDS.some(id => results[id].content || results[id].error);
  const completedCount = MODEL_IDS.filter(id => !results[id].isStreaming && (results[id].content || results[id].error)).length;

  let cheapestId: ModelId | null = null;
  let fastestId: ModelId | null = null;
  if (allComplete && hasAnyResult) {
    let minCost = Infinity;
    let minLatency = Infinity;
    MODEL_IDS.forEach(id => {
      const r = results[id];
      if (r.cost && !r.error && r.cost.totalCost < minCost) {
        minCost = r.cost.totalCost;
        cheapestId = id;
      }
      if (r.latencyMs !== null && !r.error && r.latencyMs < minLatency) {
        minLatency = r.latencyMs;
        fastestId = id;
      }
    });
  }

  const markdownComponents = {
    pre({ children, ...props }: any) {
      let codeText = '';
      if (children && typeof children === 'object') {
        const childProps = (children as any)?.props;
        if (childProps?.children) codeText = String(childProps.children).replace(/\n$/, '');
      }
      const codeId = `pg-${Math.random().toString(36).substring(7)}`;
      return (
        <div className="relative group my-3 rounded-xl overflow-hidden border border-[#2d2d3f]">
          <div className="flex justify-between items-center bg-[#1e1e2e] px-4 py-2 border-b border-[#2d2d3f]">
            <span className="text-[11px] text-gray-500 font-mono">
              {(((children as any)?.props?.className) || '').replace('language-', '') || 'code'}
            </span>
            <button onClick={() => handleCopy(codeText, codeId)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#3d3d4f] transition-all cursor-pointer">
              {copiedId === codeId ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            </button>
          </div>
          <pre {...props} className="!m-0 !p-4 !bg-[#1e1e2e] overflow-x-auto">{children}</pre>
        </div>
      );
    },
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatElapsed = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col animate-fade-in bg-black/50 backdrop-blur-md">
      <div className="flex-1 flex flex-col bg-white m-0 md:m-3 md:rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-[var(--border-light)]">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b border-[var(--border-light)] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="bg-gradient-to-br from-[var(--compra-orange)] to-orange-600 text-white p-2.5 rounded-xl shadow-lg shadow-orange-200/50">
                <FlaskConical size={20} />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight tracking-tight">Multi-Model Playground</h2>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Compare responses across all Claude models side by side</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model badges */}
            <div className="hidden lg:flex items-center gap-1.5 mr-2">
              {MODEL_IDS.map(id => {
                const colors = MODEL_COLORS[id];
                const config = MODEL_CONFIGS[id];
                return (
                  <span key={id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
                    {modelIcon(id, 11)}
                    {config.displayName.split(' ').pop()}
                  </span>
                );
              })}
            </div>

            {/* Deep Think toggle */}
            <button
              onClick={() => setThinkingEnabled(!thinkingEnabled)}
              title={thinkingEnabled ? 'Deep Think ON' : 'Deep Think OFF'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                thinkingEnabled
                  ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 shadow-sm shadow-amber-100'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-secondary)] border border-transparent'
              }`}
            >
              <Lightbulb size={14} className={thinkingEnabled ? 'text-amber-500' : ''} />
              <span className="hidden sm:inline">Deep Think</span>
            </button>

            <div className="w-px h-6 bg-[var(--border-light)] mx-1" />

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all cursor-pointer"
              title="Close playground"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Input Section ── */}
        <div className="px-6 py-4 border-b border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-primary)] to-white shrink-0">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleRun();
                  }
                }}
                placeholder="Enter your prompt here... (⌘+Enter to run)"
                rows={3}
                disabled={isRunning}
                className="w-full resize-none rounded-xl border border-[var(--border-light)] bg-white px-4 py-3 text-[14px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--compra-orange)] focus:border-transparent transition-all disabled:opacity-60 shadow-sm hover:shadow-md hover:border-[var(--border-medium)]"
              />
              <div className="flex items-center gap-3 mt-2 min-h-[20px]">
                {tokenEstimate > 0 && (
                  <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
                    <Sparkles size={10} className="text-[var(--compra-orange)]" />
                    ~{tokenEstimate.toLocaleString()} input tokens
                  </span>
                )}
                {thinkingEnabled && (
                  <span className="text-[11px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lightbulb size={10} />
                    Deep Think ON
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleRun}
              disabled={!prompt.trim() || isRunning || !apiKey}
              className="flex items-center gap-2 bg-gradient-to-r from-[var(--compra-orange)] to-orange-600 hover:from-[var(--compra-orange-hover)] hover:to-orange-700 text-white px-6 py-3 rounded-xl text-[14px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-orange-200/40 hover:shadow-xl hover:shadow-orange-200/60 cursor-pointer active:scale-[0.97]"
            >
              {isRunning ? (
                <>
                  <div className="playground-btn-spinner" />
                  Running {completedCount}/{MODEL_IDS.length}...
                </>
              ) : (
                <>
                  <Play size={16} fill="white" />
                  Run All
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Comparison Summary Bar ── */}
        {allComplete && hasAnyResult && (
          <div className="px-6 py-3 border-b border-[var(--border-light)] bg-white shrink-0 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MODEL_IDS.map((id, i) => {
                const r = results[id];
                const config = MODEL_CONFIGS[id];
                const colors = MODEL_COLORS[id];
                const isCheapest = id === cheapestId;
                const isFastest = id === fastestId;

                return (
                  <div
                    key={id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all playground-stagger-${i + 1} animate-slide-up ${
                      r.error
                        ? 'border-red-200 bg-red-50/60'
                        : isCheapest
                        ? 'border-green-200 bg-green-50/60 shadow-sm shadow-green-100/50'
                        : `${colors.border} ${colors.bg}/40`
                    }`}
                  >
                    <div className={`shrink-0 p-1.5 rounded-lg ${r.error ? 'text-red-400 bg-red-100' : `${colors.text} ${colors.bg}`}`}>
                      {modelIcon(id, 16)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{config.displayName}</span>
                        {isCheapest && (
                          <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                            Cheapest
                          </span>
                        )}
                        {isFastest && !isCheapest && (
                          <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                            Fastest
                          </span>
                        )}
                        {thinkingEnabled && r.thinking && !r.error && (
                          <Lightbulb size={12} className="text-amber-500" />
                        )}
                      </div>
                      {r.error ? (
                        <span className="text-[11px] text-red-500 truncate block">Error</span>
                      ) : (
                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] mt-0.5">
                          {r.cost && (
                            <span className="font-semibold text-[var(--text-secondary)] flex items-center gap-0.5">
                              <DollarSign size={10} className="text-emerald-500" />
                              {formatCost(r.cost.totalCost)}
                            </span>
                          )}
                          {r.latencyMs !== null && (
                            <span className="flex items-center gap-0.5">
                              <Clock size={9} />
                              {formatLatency(r.latencyMs)}
                            </span>
                          )}
                          {r.usage && (
                            <span className="text-[var(--text-tertiary)]">
                              {r.usage.output_tokens.toLocaleString()} tokens
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3-Column Response Grid ── */}
        <div className="flex-1 overflow-hidden">
          {!hasAnyResult && !isRunning ? (
            /* ── Empty State ── */
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md px-6">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 flex items-center justify-center mx-auto shadow-lg shadow-orange-100/50">
                    <FlaskConical size={36} className="text-[var(--compra-orange)] opacity-60" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 flex items-center justify-center shadow-sm">
                    <Zap size={14} className="text-violet-500" />
                  </div>
                  <div className="absolute -top-1 -left-1 w-7 h-7 rounded-lg bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 flex items-center justify-center shadow-sm">
                    <Cpu size={12} className="text-sky-500" />
                  </div>
                  <div className="absolute -top-2 -right-3 w-6 h-6 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 flex items-center justify-center shadow-sm">
                    <BrainCircuit size={11} className="text-amber-500" />
                  </div>
                </div>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Ready to Compare</h3>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5">
                  Enter a prompt and run it across <strong>Haiku</strong>, <strong>Sonnet</strong>, and <strong>Opus</strong> simultaneously to compare quality, speed, and cost.
                </p>
                <div className="flex items-center justify-center gap-2 text-[12px] text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-light)]">
                    Type a prompt
                  </span>
                  <ArrowRight size={14} className="text-[var(--text-tertiary)]" />
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 text-[var(--compra-orange)] font-medium">
                    <Play size={10} fill="currentColor" />
                    Run All
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 h-full divide-x divide-[var(--border-light)]">
              {MODEL_IDS.map((id) => {
                const r = results[id];
                const config = MODEL_CONFIGS[id];
                const colors = MODEL_COLORS[id];
                const hasThinking = r.thinking.length > 0;
                const isActivelyThinking = hasThinking && r.isStreaming && !r.content;
                const isThinkingOpenForModel = thinkingOpen[id] ?? false;
                const isComplete = !r.isStreaming && (r.content || r.error);
                const isJustDone = justCompleted[id];
                const elapsedMs = elapsed[id];
                const liveCharCount = r.content.length;

                return (
                  <div
                    key={id}
                    className="playground-column flex flex-col"
                  >
                    {/* Column Header */}
                    <div className={`px-4 py-3 border-b border-[var(--border-light)] shrink-0 ${
                      r.isStreaming ? 'bg-gradient-to-r from-orange-50/50 to-transparent' : 'bg-[var(--bg-primary)]'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg transition-all ${
                            r.isStreaming
                              ? 'bg-orange-100 text-[var(--compra-orange)]'
                              : `${colors.bg} ${colors.text}`
                          }`}>
                            {modelIcon(id, 14)}
                          </div>
                          <div>
                            <span className="text-[13px] font-bold text-[var(--text-primary)] block leading-tight">{config.displayName}</span>
                            {r.isStreaming && elapsedMs !== undefined && (
                              <span className="text-[10px] font-mono text-[var(--text-tertiary)] tabular-nums">
                                {formatElapsed(elapsedMs)} elapsed
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status pill */}
                        <div className="flex items-center gap-2">
                          {r.content && !r.isStreaming && (
                            <button
                              onClick={() => handleCopy(r.content, `col-${id}`)}
                              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white transition-all cursor-pointer"
                              title="Copy response"
                            >
                              {copiedId === `col-${id}` ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                            </button>
                          )}
                          {r.error ? (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-semibold bg-red-100 text-red-600">
                              <AlertTriangle size={10} />
                              Error
                            </span>
                          ) : r.isStreaming ? (
                            <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg font-semibold bg-orange-50 text-[var(--compra-orange)] border border-orange-200">
                              <span className="playground-pulse-dot" />
                              {r.content ? 'Streaming' : hasThinking ? 'Thinking' : 'Starting'}
                            </span>
                          ) : isJustDone ? (
                            <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-semibold bg-green-100 text-green-600 animate-scale-in">
                              <CheckCircle2 size={11} />
                              Done!
                            </span>
                          ) : isComplete ? (
                            <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-semibold bg-green-50 text-green-600 border border-green-200">
                              <Check size={10} />
                              Complete
                            </span>
                          ) : (
                            <span className="text-[10px] px-2.5 py-1 rounded-lg font-semibold bg-gray-100 text-gray-400">
                              Waiting
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column Body */}
                    <div
                      className="flex-1 overflow-y-auto px-5 py-4"
                      ref={(el) => { scrollRefs.current[id] = el; }}
                    >
                      {/* Skeleton shimmer while waiting for first token */}
                      {r.isStreaming && !r.content && !hasThinking && (
                        <div className="space-y-3 animate-fade-in">
                          <div className="playground-shimmer h-4 rounded-lg w-[90%]" />
                          <div className="playground-shimmer h-4 rounded-lg w-[70%]" />
                          <div className="playground-shimmer h-4 rounded-lg w-[82%]" />
                          <div className="playground-shimmer h-4 rounded-lg w-[55%]" />
                          <div className="playground-shimmer h-4 rounded-lg w-[65%]" />
                          <div className="mt-5 flex items-center gap-2 text-[var(--text-tertiary)] text-[12px]">
                            <div className="playground-btn-spinner !w-[12px] !h-[12px] !border-[var(--compra-orange)] !border-t-transparent" style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--compra-orange)' }} />
                            <span>Waiting for first token...</span>
                          </div>
                        </div>
                      )}

                      {/* Thinking block */}
                      {hasThinking && (
                        <div className="mb-3 animate-fade-in">
                          <button
                            onClick={() => setThinkingOpen(prev => ({ ...prev, [id]: !prev[id] }))}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all w-full text-left cursor-pointer ${
                              isActivelyThinking
                                ? 'bg-amber-50 border border-amber-200 text-amber-700 shadow-sm shadow-amber-100/50'
                                : 'bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)] hover:border-[var(--border-medium)]'
                            }`}
                          >
                            {isActivelyThinking ? (
                              <div className="thinking-spinner shrink-0" />
                            ) : (
                              <Lightbulb size={14} className="text-amber-500 shrink-0" />
                            )}
                            <span className="flex-1">
                              {isActivelyThinking ? 'Thinking...' : 'Thought process'}
                            </span>
                            <ChevronDown
                              size={14}
                              className={`text-[var(--text-tertiary)] transition-transform shrink-0 ${
                                isThinkingOpenForModel || isActivelyThinking ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {(isThinkingOpenForModel || isActivelyThinking) && (
                            <div className="mt-1.5 px-3.5 py-3 bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-xl overflow-hidden animate-fade-in">
                              <div className="text-[13px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap max-h-[200px] overflow-y-auto thinking-content">
                                {r.thinking}
                                {isActivelyThinking && (
                                  <span className="playground-cursor" />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error */}
                      {r.error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-[13px] animate-scale-in">
                          <div className="flex items-center gap-2 mb-1.5">
                            <AlertTriangle size={14} />
                            <span className="font-bold">Request failed</span>
                          </div>
                          <p className="text-red-600 text-[12px] leading-relaxed">{r.error}</p>
                        </div>
                      )}

                      {/* Response content */}
                      {r.content && (
                        <div className="markdown-content animate-fade-in">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={markdownComponents}
                          >
                            {r.content}
                          </ReactMarkdown>
                          {r.isStreaming && (
                            <span className="playground-cursor" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Column Footer Metadata */}
                    <div className="px-4 py-2.5 border-t border-[var(--border-light)] bg-[var(--bg-primary)] shrink-0 min-h-[40px]">
                      {/* Live streaming stats */}
                      {r.isStreaming && r.content && (
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)] animate-fade-in">
                          <span className="playground-pulse-dot" />
                          <span className="font-mono tabular-nums font-medium">{liveCharCount.toLocaleString()} chars</span>
                          {elapsedMs !== undefined && (
                            <>
                              <span className="text-[var(--border-medium)]">&middot;</span>
                              <span className="font-mono tabular-nums">{formatElapsed(elapsedMs)}</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Waiting state footer */}
                      {r.isStreaming && !r.content && (
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                          <span className="playground-pulse-dot" />
                          <span>{hasThinking ? 'Deep thinking...' : 'Waiting...'}</span>
                        </div>
                      )}

                      {/* Completed stats */}
                      {!r.isStreaming && (r.cost || r.usage) && (
                        <div className={`flex items-center gap-2.5 text-[11px] text-[var(--text-tertiary)] flex-wrap ${isJustDone ? 'animate-slide-up' : ''}`}>
                          {r.cost && (
                            <span className="flex items-center gap-1 font-semibold text-[var(--text-secondary)]">
                              <DollarSign size={11} className="text-emerald-500" />
                              {formatCost(r.cost.totalCost)}
                            </span>
                          )}
                          {r.usage && (
                            <>
                              <span className="text-[var(--border-medium)]">&middot;</span>
                              <span>{r.usage.input_tokens.toLocaleString()} in</span>
                              <span className="text-[var(--border-medium)]">&middot;</span>
                              <span>{r.usage.output_tokens.toLocaleString()} out</span>
                            </>
                          )}
                          {r.latencyMs !== null && (
                            <>
                              <span className="text-[var(--border-medium)]">&middot;</span>
                              <span className="flex items-center gap-0.5">
                                <Clock size={9} />
                                {formatLatency(r.latencyMs)}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-2.5 border-t border-[var(--border-light)] bg-[var(--bg-primary)] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[var(--text-tertiary)]">
            All models receive the same prompt &middot; Responses stream in parallel
          </span>
          <div className="flex items-center gap-1.5">
            {MODEL_IDS.map(id => {
              const colors = MODEL_COLORS[id];
              return (
                <span key={id} className={`w-2 h-2 rounded-full ${colors.dot}`} title={MODEL_CONFIGS[id].displayName} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
