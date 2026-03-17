import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ArrowUp, Plus, X, FileText, Calculator } from 'lucide-react';
import type { FileAttachment, ModelId } from '../types';
import { parseFile, formatFileSize } from '../utils/fileParser';
import { calculateTokenEstimate } from '../utils/tokenCounter';
import { CostEstimator } from './CostEstimator';
import { ModelSuggestion } from './ModelSuggestion';
import { suggestModel } from '../utils/modelSuggester';

interface MessageInputProps {
  onSend: (message: string, attachments: FileAttachment[]) => void;
  disabled?: boolean;
  selectedModel?: ModelId;
  thinkingEnabled?: boolean;
  onSwitchModel?: (model: ModelId) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled, selectedModel = 'claude-sonnet-4.6', thinkingEnabled = false, onSwitchModel }) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showEstimator, setShowEstimator] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const suggestion = useMemo(() => {
    if (suggestionDismissed) return null;
    return suggestModel(input, attachments, selectedModel);
  }, [input, attachments, selectedModel, suggestionDismissed]);

  const handleSend = () => {
    if ((input.trim() || attachments.length > 0) && !disabled) {
      onSend(input, [...attachments]);
      setInput('');
      setAttachments([]);
      setShowEstimator(false);
      setSuggestionDismissed(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const parsed = await Promise.all(files.slice(0, 5).map(f => parseFile(f)));
      setAttachments(prev => [...prev, ...parsed]);
    } catch { alert('Error parsing file.'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    try {
      const parsed = await Promise.all(files.slice(0, 5).map(f => parseFile(f)));
      setAttachments(prev => [...prev, ...parsed]);
    } catch { alert('Error parsing file.'); }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const canSend = (input.trim() || attachments.length > 0) && !disabled;
  const estimatedTokens = calculateTokenEstimate(input) + attachments.reduce((s, a) => s + calculateTokenEstimate(a.content), 0);

  return (
    <div className="max-w-[var(--input-max-width)] mx-auto w-full px-4 pb-4 pt-2">
      {/* Input card */}
      <div
        ref={containerRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-2xl border shadow-sm transition-all duration-200 ${
          isDragOver
            ? 'border-[var(--compra-orange)] bg-[var(--compra-orange-light)] shadow-[0_0_0_3px_rgba(254,60,0,0.08)]'
            : isFocused
              ? 'border-[var(--border-medium)] bg-white shadow-md'
              : 'border-[var(--border-light)] bg-white hover:shadow-md hover:border-[var(--border-medium)]'
        }`}
      >
        {/* Model suggestion */}
        {suggestion && onSwitchModel && (
          <ModelSuggestion
            suggestedModel={suggestion.suggestedModel}
            reason={suggestion.reason}
            onAccept={() => {
              onSwitchModel(suggestion.suggestedModel);
              setSuggestionDismissed(true);
            }}
            onDismiss={() => setSuggestionDismissed(true)}
          />
        )}

        {/* Cost estimator */}
        {estimatedTokens > 0 && (
          <CostEstimator
            inputTokens={estimatedTokens}
            selectedModel={selectedModel}
            isExpanded={showEstimator}
            onToggle={() => setShowEstimator(!showEstimator)}
            thinkingEnabled={thinkingEnabled}
          />
        )}

        {/* Attachments inside the card */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3.5 pt-3 pb-0">
            {attachments.map(att => (
              <div key={att.id} className="group flex items-center gap-2 bg-[var(--bg-primary)] pl-2.5 pr-1.5 py-1.5 rounded-lg border border-[var(--border-light)] text-[12.5px] animate-scale-in">
                <FileText size={14} className="text-[var(--compra-orange)] shrink-0" />
                <span className="font-medium text-[var(--text-primary)] max-w-[120px] truncate">{att.name}</span>
                <span className="text-[var(--text-tertiary)] text-[10.5px]">{formatFileSize(att.size)}</span>
                <button
                  onClick={() => setAttachments(p => p.filter(a => a.id !== att.id))}
                  className="ml-0.5 p-0.5 rounded-md text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea row */}
        <div className="flex items-end gap-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder="Message CostPilot..."
            className="flex-1 resize-none bg-transparent py-3.5 pl-4 pr-1 text-[15px] leading-relaxed placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:opacity-50 min-h-[52px] max-h-[200px] cursor-text"
            rows={1}
          />

          {/* Actions */}
          <div className="flex items-center gap-1 pr-2.5 pb-2.5 shrink-0">
            {estimatedTokens > 0 && (
              <span className="text-[10px] font-mono text-[var(--text-tertiary)] px-1.5 py-0.5 rounded-md bg-[var(--bg-primary)] hidden sm:block select-none animate-fade-in">
                ~{estimatedTokens.toLocaleString()} tok
              </span>
            )}

            {estimatedTokens > 0 && (
              <button
                onClick={() => setShowEstimator(!showEstimator)}
                title="Toggle cost estimator"
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  showEstimator
                    ? 'text-[var(--compra-orange)] bg-[var(--compra-orange-light)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                }`}
              >
                <Calculator size={16} strokeWidth={1.8} />
              </button>
            )}

            <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.json,.txt,.md" />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              title="Attach files (.csv, .json, .txt, .md)"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-30"
            >
              <Plus size={20} strokeWidth={1.8} />
            </button>

            <button
              onClick={handleSend}
              disabled={!canSend}
              title={canSend ? 'Send message (Enter)' : 'Type a message to send'}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${canSend
                ? 'bg-[var(--text-primary)] text-white hover:bg-black active:scale-90'
                : 'bg-[var(--bg-primary)] text-[var(--text-tertiary)]'
              }`}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-center text-[11px] text-[var(--text-tertiary)] mt-2 select-none">
        CostPilot can make mistakes &middot; <span className="opacity-60">Enter to send, Shift+Enter for newline</span>
      </p>
    </div>
  );
};
