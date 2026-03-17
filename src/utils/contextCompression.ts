import type { Conversation, ModelId, Message } from '../types';
import { MODEL_CONFIGS } from '../types';
import { calculateTokenEstimate } from './tokenCounter';

export const getActiveContextMessages = (conversation: Conversation): Message[] => {
  const startIndex = conversation.compression
    ? conversation.compression.compressedUpToIndex
    : 0;
  return conversation.messages
    .slice(startIndex)
    .filter(m => !m.excludeFromContext && !m.isStreaming);
};

export const getContextTokenCount = (conversation: Conversation): number => {
  let total = 0;
  if (conversation.compression) {
    total += conversation.compression.summaryTokenEstimate;
  }
  const active = getActiveContextMessages(conversation);
  for (const m of active) {
    total += calculateTokenEstimate(m.content);
  }
  return total;
};

export const shouldSuggestCompression = (
  conversation: Conversation,
  threshold: number = 20000
): boolean => {
  if (conversation.messages.length < 6) return false;
  const tokenCount = getContextTokenCount(conversation);
  return tokenCount > threshold;
};

export const buildSummarizePrompt = (
  messagesToCompress: Message[],
  existingSummary?: string
): { role: string; content: string }[] => {
  let contextBlock = '';

  if (existingSummary) {
    contextBlock += `<previous_summary>\n${existingSummary}\n</previous_summary>\n\n`;
  }

  contextBlock += '<conversation_to_compress>\n';
  for (const msg of messagesToCompress) {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    contextBlock += `[${role}]: ${msg.content}\n\n`;
  }
  contextBlock += '</conversation_to_compress>';

  return [
    {
      role: 'user',
      content: `Summarize the following conversation into a concise but comprehensive context summary. Preserve all key facts, decisions, user preferences, code snippets, data structures, and any information that would be needed to continue the conversation naturally. Do NOT include pleasantries or meta-commentary about the summarization itself.\n\n${contextBlock}`,
    },
  ];
};

export const calculateCompressionSplit = (
  conversation: Conversation,
  keepRecent: number = 4
): {
  compressUpToIndex: number;
  messagesToCompress: Message[];
  messagesToKeep: Message[];
} => {
  const startIndex = conversation.compression
    ? conversation.compression.compressedUpToIndex
    : 0;
  const relevantMessages = conversation.messages.slice(startIndex);

  // Keep at least `keepRecent` messages intact
  const splitPoint = Math.max(0, relevantMessages.length - keepRecent);
  const messagesToCompress = relevantMessages.slice(0, splitPoint);
  const messagesToKeep = relevantMessages.slice(splitPoint);

  return {
    compressUpToIndex: startIndex + splitPoint,
    messagesToCompress,
    messagesToKeep,
  };
};

export const estimateCompressionCost = (
  messagesToCompress: Message[],
  compressionModel: ModelId,
  existingSummary?: string
): {
  inputTokens: number;
  estimatedOutputTokens: number;
  estimatedCost: number;
} => {
  let inputTokens = 0;
  for (const m of messagesToCompress) {
    inputTokens += calculateTokenEstimate(m.content);
  }
  if (existingSummary) {
    inputTokens += calculateTokenEstimate(existingSummary);
  }
  // Prompt overhead
  inputTokens += 100;

  // Summary typically ~15-25% of input
  const estimatedOutputTokens = Math.ceil(inputTokens * 0.2);

  const config = MODEL_CONFIGS[compressionModel];
  const estimatedCost =
    (inputTokens / 1_000_000) * config.inputPricePerMillion +
    (estimatedOutputTokens / 1_000_000) * config.outputPricePerMillion;

  return { inputTokens, estimatedOutputTokens, estimatedCost };
};

export const estimateProjectedSavings = (
  conversation: Conversation,
  _compressionModel: ModelId,
  keepRecent: number,
  chatModel: ModelId
): {
  currentTokensPerMsg: number;
  projectedTokensPerMsg: number;
  savingsPerMsg: number;
  savingsCostPerMsg: number;
} => {
  const currentTokensPerMsg = getContextTokenCount(conversation);

  const { messagesToCompress } = calculateCompressionSplit(conversation, keepRecent);
  let compressedTokens = 0;
  for (const m of messagesToCompress) {
    compressedTokens += calculateTokenEstimate(m.content);
  }

  // Estimate summary size at ~20% of original
  const summaryTokens = Math.ceil(compressedTokens * 0.2);
  const projectedTokensPerMsg = currentTokensPerMsg - compressedTokens + summaryTokens;

  const savingsPerMsg = currentTokensPerMsg - projectedTokensPerMsg;
  const chatConfig = MODEL_CONFIGS[chatModel];
  const savingsCostPerMsg = (savingsPerMsg / 1_000_000) * chatConfig.inputPricePerMillion;

  return {
    currentTokensPerMsg,
    projectedTokensPerMsg,
    savingsPerMsg,
    savingsCostPerMsg,
  };
};

export const buildCompressedMessages = (
  conversation: Conversation
): Message[] => {
  if (!conversation.compression) {
    return conversation.messages;
  }

  const { compression } = conversation;

  // Synthetic summary as user/assistant pair
  const summaryUser: Message = {
    id: '__compression_summary_user',
    role: 'user',
    content: `[Context Summary from earlier conversation]\n\n${compression.summary}\n\nPlease continue our conversation with this context in mind.`,
    timestamp: compression.timestamp,
  };
  const summaryAssistant: Message = {
    id: '__compression_summary_assistant',
    role: 'assistant',
    content:
      'Understood. I have the full context from our earlier conversation and will continue seamlessly.',
    timestamp: compression.timestamp,
  };

  // Messages after compression boundary (not excluded, not streaming)
  const activeMessages = conversation.messages.slice(
    compression.compressedUpToIndex
  );

  return [summaryUser, summaryAssistant, ...activeMessages];
};
