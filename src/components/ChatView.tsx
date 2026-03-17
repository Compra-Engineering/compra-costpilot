import React, { useRef, useEffect } from 'react';
import type { Conversation, ModelId, FileAttachment } from '../types';
import type { Artifact } from '../utils/artifactParser';
import { MessageBubble } from './MessageBubble';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageInput } from './MessageInput';
import { ModelSelector } from './ModelSelector';
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
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation, onSendMessage, selectedModel, onSelectModel,
  isTyping, isThinking, disabled, onToggleSidebar, onOpenArtifact, activeArtifactId,
  thinkingEnabled, onToggleThinking
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSuggestionClick = (prompt: string) => {
    onSendMessage(prompt, []);
  };

  const hasMessages = conversation && conversation.messages.length > 0;

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
            {conversation.messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onOpenArtifact={onOpenArtifact}
                activeArtifactId={activeArtifactId}
              />
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
        <MessageInput onSend={onSendMessage} disabled={disabled || isTyping} selectedModel={conversation?.model || selectedModel} thinkingEnabled={thinkingEnabled} />
      </div>
    </div>
  );
};
