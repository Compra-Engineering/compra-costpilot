import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Bot, User, Copy, Check, DollarSign, Database, HardDrive, ChevronDown, Lightbulb, BarChart3, GitBranch, Eye, EyeOff, Archive } from 'lucide-react';
import type { Message } from '../types';
import type { ModelId } from '../types';
import type { Artifact } from '../utils/artifactParser';
import { parseContent } from '../utils/artifactParser';
import { formatCost } from '../utils/tokenCounter';
import { formatFileSize } from '../utils/fileParser';
import { ArtifactCard } from './ArtifactCard';
import { ModelComparison } from './ModelComparison';

interface MessageBubbleProps {
  message: Message;
  messageIndex?: number;
  onOpenArtifact?: (artifact: Artifact) => void;
  activeArtifactId?: string | null;
  onFork?: (index: number) => void;
  onToggleContext?: (msgId: string) => void;
  isCompressed?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, messageIndex, onOpenArtifact, activeArtifactId, onFork, onToggleContext, isCompressed }) => {
  const isUser = message.role === 'user';
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [thinkingOpen, setThinkingOpen] = React.useState(false);
  const [showComparison, setShowComparison] = React.useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const parsed = React.useMemo(() => {
    if (isUser) return null;
    return parseContent(message.content);
  }, [message.content, isUser]);

  const markdownComponents = {
    pre({ children, ...props }: any) {
      let codeText = '';
      if (children && typeof children === 'object') {
        const childProps = (children as any)?.props;
        if (childProps?.children) codeText = String(childProps.children).replace(/\n$/, '');
      }
      const codeId = Math.random().toString(36).substring(7);

      return (
        <div className="relative group my-3 rounded-xl overflow-hidden border border-[#2d2d3f]">
          <div className="flex justify-between items-center bg-[#1e1e2e] px-4 py-2 border-b border-[#2d2d3f]">
            <span className="text-[11px] text-gray-500 font-mono">
              {(((children as any)?.props?.className) || '').replace('language-', '') || 'code'}
            </span>
            <button onClick={() => handleCopy(codeText, codeId)}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#3d3d4f] transition-colors">
              {copiedId === codeId ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            </button>
          </div>
          <pre {...props} className="!m-0 !p-4 !bg-[#1e1e2e] overflow-x-auto">{children}</pre>
        </div>
      );
    }
  };

  const renderContent = () => {
    // User messages or messages without artifacts: render normally
    if (isUser || !parsed || parsed.artifacts.length === 0) {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={markdownComponents}
        >
          {message.content}
        </ReactMarkdown>
      );
    }

    // Render segments: text → markdown, artifact → card
    return parsed.segments.map((segment, i) => {
      if (segment.type === 'text') {
        return (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {segment.content}
          </ReactMarkdown>
        );
      }
      return (
        <ArtifactCard
          key={segment.artifact.id}
          artifact={segment.artifact}
          isActive={activeArtifactId === segment.artifact.id}
          onClick={() => onOpenArtifact?.(segment.artifact)}
        />
      );
    });
  };

  const hasThinking = !isUser && message.thinking && message.thinking.length > 0;
  const isActivelyThinking = hasThinking && message.isStreaming && !message.content;

  return (
    <div className={`py-4 px-4 transition-opacity ${message.excludeFromContext ? 'opacity-45' : ''} ${isUser ? 'bg-transparent' : 'bg-transparent'}`}>
      <div className="flex gap-3 max-w-[var(--chat-max-width)] mx-auto">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] ${
            isUser
              ? 'bg-[var(--compra-orange)] text-white'
              : 'bg-[var(--bg-sidebar)] border border-[var(--border-light)] text-[var(--text-secondary)]'
          }`}>
            {isUser ? <User size={14} /> : <Bot size={14} />}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
            {isUser ? 'You' : 'Claude'}
          </p>

          {/* User attachments */}
          {isUser && message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 bg-[var(--bg-primary)] px-3 py-1.5 rounded-lg border border-[var(--border-light)] text-[12px]">
                  {att.type.includes('csv') ? <Database size={12} className="text-emerald-600" /> : <HardDrive size={12} className="text-amber-600" />}
                  <span className="font-medium truncate max-w-[120px]">{att.name}</span>
                  <span className="text-[var(--text-tertiary)]">{formatFileSize(att.size)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Thinking block */}
          {hasThinking && (
            <div className="mb-3">
              <button
                onClick={() => setThinkingOpen(!thinkingOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all w-full text-left ${
                  isActivelyThinking
                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                    : 'bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)]'
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
                    thinkingOpen || isActivelyThinking ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {(thinkingOpen || isActivelyThinking) && (
                <div className="mt-1.5 px-3.5 py-3 bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-xl overflow-hidden animate-fade-in">
                  <div className="text-[13px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap max-h-[300px] overflow-y-auto thinking-content">
                    {message.thinking}
                    {isActivelyThinking && (
                      <span className="inline-block w-[6px] h-[15px] bg-amber-400 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Markdown content */}
          <div className="markdown-content">
            {renderContent()}

            {message.isStreaming && message.content && (
              <div className="typing-indicator mt-1"><span /><span /><span /></div>
            )}
          </div>

          {/* Action row: Fork + Context toggle */}
          {!message.isStreaming && (
            <div className="flex items-center gap-3 mt-2">
              {onFork && messageIndex !== undefined && (
                <button
                  onClick={() => onFork(messageIndex)}
                  className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  <GitBranch size={12} />
                  Fork
                </button>
              )}
              {onToggleContext && (
                <button
                  onClick={() => onToggleContext(message.id)}
                  className={`flex items-center gap-1 text-[11px] transition-colors ${
                    message.excludeFromContext
                      ? 'text-amber-500 hover:text-amber-600'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {message.excludeFromContext ? <EyeOff size={12} /> : <Eye size={12} />}
                  {message.excludeFromContext ? 'Excluded' : 'In context'}
                </button>
              )}
              {isCompressed && (
                <span className="flex items-center gap-1 text-[10px] text-amber-500">
                  <Archive size={10} />
                  Compressed
                </span>
              )}
            </div>
          )}

          {/* Cost metadata */}
          {!isUser && message.cost && message.usage && (
            <div className="relative">
              <div className="flex items-center gap-2.5 mt-3 text-[11px] text-[var(--text-tertiary)] animate-fade-in">
                <span className="flex items-center gap-1 font-medium text-[var(--text-secondary)]">
                  <DollarSign size={11} className="text-emerald-600" />
                  {formatCost(message.cost.totalCost)}
                </span>
                <span className="text-[var(--border-medium)]">&middot;</span>
                <span>{message.usage.input_tokens.toLocaleString()} in</span>
                <span className="text-[var(--border-medium)]">&middot;</span>
                <span>{message.usage.output_tokens.toLocaleString()} out</span>
                <span className="text-[var(--border-medium)]">&middot;</span>
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="flex items-center gap-1 text-[var(--compra-orange)] hover:underline transition-colors font-medium"
                >
                  <BarChart3 size={11} />
                  Compare models
                </button>
              </div>
              {showComparison && message.cost.model && (
                <ModelComparison
                  inputTokens={message.usage.input_tokens}
                  outputTokens={message.usage.output_tokens}
                  actualModelId={message.cost.model as ModelId}
                  actualTotalCost={message.cost.totalCost}
                  onClose={() => setShowComparison(false)}
                  thinkingUsed={!!message.thinking && message.thinking.length > 0}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
