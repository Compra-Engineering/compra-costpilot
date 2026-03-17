import { useState, useCallback } from 'react';
import type { Conversation, ModelId, ContextCompression } from '../types';
import { MODEL_CONFIGS } from '../types';
import { summarizeContext } from '../utils/claudeApi';
import {
  calculateCompressionSplit,
  buildSummarizePrompt,
} from '../utils/contextCompression';
import { calculateTokenEstimate, calculateMessageCost } from '../utils/tokenCounter';
import { useConversations } from './useConversations';

export const useCompression = (
  conversationHook: ReturnType<typeof useConversations>,
  apiKey: string
) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState('');
  const [compressionError, setCompressionError] = useState<string | null>(null);
  const [showCompressionPanel, setShowCompressionPanel] = useState(false);

  const compressContext = useCallback(
    async (conversation: Conversation, compressionModel: ModelId, keepRecent: number) => {
      if (!apiKey) {
        setCompressionError('API key is required');
        return;
      }

      setIsCompressing(true);
      setCompressionError(null);
      setCompressionProgress('');

      try {
        const { compressUpToIndex, messagesToCompress } = calculateCompressionSplit(
          conversation,
          keepRecent
        );

        if (messagesToCompress.length === 0) {
          setCompressionError('No messages to compress');
          setIsCompressing(false);
          return;
        }

        const existingSummary = conversation.compression?.summary;
        const promptMessages = buildSummarizePrompt(messagesToCompress, existingSummary);

        const { summary, usage } = await summarizeContext(
          promptMessages,
          compressionModel,
          apiKey,
          (partial) => setCompressionProgress(partial)
        );

        // Calculate costs
        const modelConfig = MODEL_CONFIGS[compressionModel];
        const cost = {
          ...calculateMessageCost(
            usage.input_tokens,
            usage.output_tokens,
            modelConfig.inputPricePerMillion,
            modelConfig.outputPricePerMillion
          ),
          model: compressionModel,
        };

        // Estimate tokens
        let originalTokenEstimate = 0;
        for (const m of messagesToCompress) {
          originalTokenEstimate += calculateTokenEstimate(m.content);
        }
        if (existingSummary) {
          originalTokenEstimate += calculateTokenEstimate(existingSummary);
        }

        const compression: ContextCompression = {
          summary,
          compressedUpToIndex: compressUpToIndex,
          model: compressionModel,
          timestamp: Date.now(),
          originalTokenEstimate,
          summaryTokenEstimate: calculateTokenEstimate(summary),
          cost,
        };

        conversationHook.setCompression(conversation.id, compression);
        setShowCompressionPanel(false);
      } catch (err) {
        setCompressionError(
          err instanceof Error ? err.message : 'Compression failed'
        );
      } finally {
        setIsCompressing(false);
      }
    },
    [apiKey, conversationHook]
  );

  const undoCompression = useCallback(
    (conversationId: string) => {
      conversationHook.clearCompression(conversationId);
    },
    [conversationHook]
  );

  return {
    isCompressing,
    compressionProgress,
    compressionError,
    setCompressionError,
    showCompressionPanel,
    setShowCompressionPanel,
    compressContext,
    undoCompression,
  };
};
