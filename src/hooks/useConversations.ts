import { useState, useEffect } from 'react';
import type { Conversation, Message, ModelId } from '../types';
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
  };
};
