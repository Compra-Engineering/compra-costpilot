import { useState, useCallback } from 'react';
import type { Message, FileAttachment, ModelId } from '../types';
import { sendMessageToClaude } from '../utils/claudeApi';
import { useConversations } from './useConversations';

interface ConversationOverride {
  id: string;
  model: ModelId;
  messages: Message[];
}

export const useChat = (conversationHook: ReturnType<typeof useConversations>) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('compra-ai-api-key') || '');
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);

  const saveApiKey = (key: string) => {
    localStorage.setItem('compra-ai-api-key', key);
    setApiKey(key);
  };

  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const resp = await fetch(`${apiBase}/api/validate-key`, {
        method: 'POST',
        headers: {
          'x-api-key': key
        }
      });
      const data = await resp.json();
      return data.valid === true;
    } catch (e) {
      console.error('Failed to validate key', e);
      return false;
    }
  };

  const sendMessage = useCallback(async (content: string, attachments: FileAttachment[] = [], targetConv?: ConversationOverride) => {
    if (!apiKey) {
      setError('Please set an Anthropic API key first');
      return;
    }

    const conv = targetConv || conversationHook.getActiveConversation();
    if (!conv) {
      setError('No active conversation');
      return;
    }

    // 1. Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined
    };
    conversationHook.addMessage(conv.id, userMessage);

    // 2. Prep assistant skeleton
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    };
    conversationHook.addMessage(conv.id, assistantMessage);

    setIsTyping(true);
    setError(null);

    let streamedContent = '';
    let streamedThinking = '';

    if (thinkingEnabled) {
      setIsThinking(true);
    }

    try {
      const messagesWithUser = [...conv.messages, userMessage];

      await sendMessageToClaude(messagesWithUser, conv.model, apiKey, {
        onThinking: (text) => {
          streamedThinking += text;
          conversationHook.updateMessage(conv.id, assistantMessageId, {
            thinking: streamedThinking
          });
        },
        onChunk: (text) => {
          // Once text starts arriving, thinking is done
          if (isThinking) {
            setIsThinking(false);
          }
          streamedContent += text;
          conversationHook.updateMessage(conv.id, assistantMessageId, {
            content: streamedContent
          });
        },
        onUsage: (usage) => {
          conversationHook.updateMessage(conv.id, assistantMessageId, {
            usage,
            isStreaming: false
          });
        },
        onComplete: () => {
          setIsTyping(false);
          setIsThinking(false);
        },
        onError: (err) => {
          setError(err.message || 'Error communicating with Claude API');
          setIsTyping(false);
          setIsThinking(false);
          conversationHook.updateMessage(conv.id, assistantMessageId, {
            isStreaming: false,
            content: streamedContent + `\n\n> ❌ **Error**: ${err.message}`
          });
        }
      }, thinkingEnabled);
    } catch (err) {
      setIsTyping(false);
      setIsThinking(false);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      conversationHook.updateMessage(conv.id, assistantMessageId, {
        isStreaming: false,
        content: `> ❌ **Error**: Failed to start stream`
      });
    }
  }, [apiKey, conversationHook, thinkingEnabled]);

  return {
    apiKey,
    saveApiKey,
    validateApiKey,
    sendMessage,
    isTyping,
    isThinking,
    error,
    setError,
    thinkingEnabled,
    setThinkingEnabled
  };
};
