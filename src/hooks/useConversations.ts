import { useState, useEffect } from 'react';
import type { Conversation, ContextCompression, Message, ModelId } from '../types';
import { calculateMessageCost } from '../utils/tokenCounter';
import { MODEL_CONFIGS } from '../types';

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('compra-ai-conversations');
    if (saved) {
      try {
        const parsed: Conversation[] = JSON.parse(saved);
        // Filter out conversations with stale/invalid model IDs
        return parsed.filter(c => c.model in MODEL_CONFIGS);
      } catch (e) {
        console.error('Failed to parse conversations', e);
        return [];
      }
    }
    return [];
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('compra-ai-conversations', JSON.stringify(conversations));
  }, [conversations]);

  const createConversation = (model: ModelId): string => {
    const id = crypto.randomUUID();
    const newConversation: Conversation = {
      id,
      title: 'New Conversation',
      messages: [],
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveId(id);
    return id;
  };

  const getActiveConversation = () => conversations.find(c => c.id === activeId) || null;

  const updateConversationSettings = (id: string, updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, ...updates, updatedAt: Date.now() } : conv
    ));
  };

  const addMessage = (conversationId: string, message: Message) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      
      const isFirstUserMessage = conv.messages.length === 0 && message.role === 'user';
      let title = conv.title;
      
      if (isFirstUserMessage && title === 'New Conversation') {
        title = message.content.length > 40 
          ? message.content.substring(0, 40) + '...' 
          : message.content;
      }

      return {
        ...conv,
        title,
        updatedAt: Date.now(),
        messages: [...conv.messages, message],
      };
    }));
  };

  const updateMessage = (conversationId: string, messageId: string, updates: Partial<Message>) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;

      const newMessages = conv.messages.map(msg => {
        if (msg.id !== messageId) return msg;
        
        const updatedMsg = { ...msg, ...updates };
        
        // Auto-calculate cost when usage is updated
        if (updates.usage && !updatedMsg.cost) {
          const modelConfig = MODEL_CONFIGS[conv.model];
          updatedMsg.cost = {
            ...calculateMessageCost(
              updates.usage.input_tokens || 0,
              updates.usage.output_tokens || 0,
              modelConfig.inputPricePerMillion,
              modelConfig.outputPricePerMillion
            ),
            model: conv.model
          };
        }
        
        return updatedMsg;
      });
      
      // Recalculate totals
      let totalCost = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      
      newMessages.forEach(msg => {
        if (msg.cost) totalCost += msg.cost.totalCost;
        if (msg.usage) {
          totalInputTokens += msg.usage.input_tokens || 0;
          totalOutputTokens += msg.usage.output_tokens || 0;
        }
      });

      return {
        ...conv,
        messages: newMessages,
        updatedAt: Date.now(),
        totalCost,
        totalInputTokens,
        totalOutputTokens,
      };
    }));
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const forkConversation = (sourceConversationId: string, upToMessageIndex: number): string | null => {
    const source = conversations.find(c => c.id === sourceConversationId);
    if (!source) return null;

    const copiedMessages = source.messages.slice(0, upToMessageIndex + 1).map(msg => ({
      ...msg,
      id: crypto.randomUUID(),
    }));

    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    copiedMessages.forEach(msg => {
      if (msg.cost) totalCost += msg.cost.totalCost;
      if (msg.usage) {
        totalInputTokens += msg.usage.input_tokens || 0;
        totalOutputTokens += msg.usage.output_tokens || 0;
      }
    });

    const newId = crypto.randomUUID();
    const forked: Conversation = {
      id: newId,
      title: `Fork: ${source.title}`,
      messages: copiedMessages,
      model: source.model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalCost,
      totalInputTokens,
      totalOutputTokens,
    };

    // Carry compression forward if fork point is beyond compressedUpToIndex
    if (source.compression && upToMessageIndex >= source.compression.compressedUpToIndex) {
      forked.compression = { ...source.compression };
    }

    setConversations(prev => [forked, ...prev]);
    setActiveId(newId);
    return newId;
  };

  const setCompression = (conversationId: string, compression: ContextCompression) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      return {
        ...conv,
        compression,
        totalCost: conv.totalCost + compression.cost.totalCost,
        updatedAt: Date.now(),
      };
    }));
  };

  const clearCompression = (conversationId: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId || !conv.compression) return conv;
      const compressionCost = conv.compression.cost.totalCost;
      return {
        ...conv,
        compression: undefined,
        totalCost: Math.max(0, conv.totalCost - compressionCost),
        updatedAt: Date.now(),
      };
    }));
  };

  const toggleMessageContext = (conversationId: string, messageId: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;

      const msgIndex = conv.messages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return conv;

      const newMessages = [...conv.messages];
      const target = newMessages[msgIndex];
      const newValue = !target.excludeFromContext;
      newMessages[msgIndex] = { ...target, excludeFromContext: newValue };

      // Pair enforcement: toggle the paired message too
      if (target.role === 'user' && msgIndex + 1 < newMessages.length && newMessages[msgIndex + 1].role === 'assistant') {
        newMessages[msgIndex + 1] = { ...newMessages[msgIndex + 1], excludeFromContext: newValue };
      } else if (target.role === 'assistant' && msgIndex - 1 >= 0 && newMessages[msgIndex - 1].role === 'user') {
        newMessages[msgIndex - 1] = { ...newMessages[msgIndex - 1], excludeFromContext: newValue };
      }

      return { ...conv, messages: newMessages, updatedAt: Date.now() };
    }));
  };

  const clearAllConversations = () => {
    setConversations([]);
    setActiveId(null);
  };

  return {
    conversations,
    activeId,
    setActiveId,
    createConversation,
    getActiveConversation,
    updateConversationSettings,
    addMessage,
    updateMessage,
    deleteConversation,
    clearAllConversations,
    forkConversation,
    toggleMessageContext,
    setCompression,
    clearCompression,
  };
};
