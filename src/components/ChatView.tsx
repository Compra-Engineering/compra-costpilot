import React, { useRef, useEffect, useState } from 'react';
import type { Conversation, ModelId, FileAttachment } from '../types';
import type { Artifact } from '../utils/artifactParser';
import { shouldSuggestCompression } from '../utils/contextCompression';
import { MessageBubble } from './MessageBubble';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageInput } from './MessageInput';
import { ModelSelector } from './ModelSelector';
import { ContextBar } from './ContextBar';
import { CompressionBanner } from './CompressionBanner';
import { CompressionDivider } from './CompressionDivider';
import { Menu } from 'lucide-react';

interface ChatViewProps {
  conversation: Conversation | null;
  onSendMessage: (content: string, attachments: FileAttachment[]) => void;
  selectedModel: ModelId;
  onSelectModel: (model: ModelId) => void;
  isTyping: boolean;
  isThinking?: boolean;
  disabled?: boolean;
  onToggleSidebar?: () => void;
  onOpenArtifact?: (artifact: Artifact) => void;
  activeArtifactId?: string | null;
  thinkingEnabled: boolean;
  onToggleThinking: (enabled: boolean) => void;
  onForkFromMessage?: (index: number) => void;
  onToggleMessageContext?: (msgId: string) => void;
  onOpenCompressionPanel?: () => void;
  onUndoCompression?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation, onSendMessage, selectedModel, onSelectModel,
  isTyping, isThinking, disabled, onToggleSidebar, onOpenArtifact, activeArtifactId,
  thinkingEnabled, onToggleThinking,
  onForkFromMessage, onToggleMessageContext,
  onOpenCompressionPanel, onUndoCompression,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [bannerDismissed, setBannerDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSuggestionClick = (prompt: string) => {
    onSendMessage(prompt, []);
  };

  const handleDismissBanner = () => {
    if (conversation) {
      setBannerDismissed(prev => new Set(prev).add(conversation.id));
    }
  };

  const hasMessages = conversation && conversation.messages.length > 0;

  const showBanner = conversation
    && !isTyping
    && !bannerDismissed.has(conversation.id)
    && shouldSuggestCompression(conversation);

  const compressionIndex = conversation?.compression?.compressedUpToIndex ?? null;

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Top bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--border-light)] bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <button onClick={onToggleSidebar} className="p-1 md:hidden text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg">
            <Menu size={20} />
          </button>
          {hasMessages ? (
            <h2 className="text-[13.5px] font-medium text-[var(--text-primary)] truncate max-w-xs">{conversation.title}</h2>
          ) : (
            <span className="text-[13.5px] text-[var(--text-tertiary)]">New conversation</span>
          )}
        </div>
        <ModelSelector
          selectedModel={conversation?.model || selectedModel}
          onSelect={onSelectModel}
          disabled={disabled || !!conversation}
          thinkingEnabled={thinkingEnabled}
          onToggleThinking={onToggleThinking}
        />
      </div>

      {/* Content */}
      {!hasMessages ? (
        <WelcomeScreen
          selectedModel={selectedModel}
          onSelectModel={onSelectModel}
          onSuggestionClick={handleSuggestionClick}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[var(--chat-max-width)] mx-auto py-6">
            {conversation.messages.map((msg, idx) => (
              <React.Fragment key={msg.id}>
                {compressionIndex !== null && idx === compressionIndex && (
                  <CompressionDivider
                    compression={conversation.compression!}
                    compressedMessageCount={compressionIndex}
                    onUndo={() => onUndoCompression?.()}
                  />
                )}
                <MessageBubble
                  message={msg}
                  messageIndex={idx}
                  onOpenArtifact={onOpenArtifact}
                  activeArtifactId={activeArtifactId}
                  onFork={onForkFromMessage}
                  onToggleContext={onToggleMessageContext}
                  isCompressed={compressionIndex !== null && idx < compressionIndex}
                />
              </React.Fragment>
            ))}
            {isTyping && !conversation.messages.some(m => m.isStreaming && m.content) && (
              <div className="flex gap-3 px-4 py-4">
                <div className="w-7 h-7 rounded-full bg-[var(--bg-sidebar)] border border-[var(--border-light)] shrink-0" />
                <div className="pt-1">
                  {isThinking ? (
                    <div className="flex items-center gap-2 text-[13px] text-amber-600">
                      <div className="thinking-spinner" />
                      <span className="font-medium">Thinking...</span>
                    </div>
                  ) : (
                    <div className="typing-indicator pt-1"><span /><span /><span /></div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 relative bg-white">
        <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        {showBanner && (
          <CompressionBanner
            conversation={conversation!}
            onCompress={() => onOpenCompressionPanel?.()}
            onDismiss={handleDismissBanner}
          />
        )}
        {hasMessages && (
          <ContextBar
            messages={conversation.messages}
            model={conversation.model}
            compression={conversation.compression}
            onOpenCompressionPanel={onOpenCompressionPanel}
            onUndoCompression={onUndoCompression}
          />
        )}
        <MessageInput
          onSend={onSendMessage}
          disabled={disabled || isTyping}
          selectedModel={conversation?.model || selectedModel}
          thinkingEnabled={thinkingEnabled}
          onSwitchModel={!conversation ? onSelectModel : undefined}
        />
      </div>
    </div>
  );
};
