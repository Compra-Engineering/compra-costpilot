import type { Message } from '../types';

export const calculateTokenEstimate = (text: string): number => {
  // A rough but generally accurate estimate for Claude models without bringing in a heavy tokenizer
  // English words are typically ~1.3 tokens per word, plus punctuation
  const words = text.split(/\s+/).length;
  const chars = text.length;
  // Estimate: ~4 characters per token on average for English text
  return Math.ceil(Math.max(words * 1.3, chars / 4));
};

export const formatCost = (cost: number): string => {
  if (cost === 0) return '$0.000';
  if (cost < 0.001) return `< $0.001`;
  return `$${cost.toFixed(3)}`;
};

export const calculateMessageCost = (
  inputTokens: number,
  outputTokens: number,
  inputPricePerMillion: number,
  outputPricePerMillion: number
): { inputCost: number; outputCost: number; totalCost: number } => {
  const inputCost = (inputTokens / 1_000_000) * inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * outputPricePerMillion;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
};

export const aggregateCosts = (messages: Message[]) => {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;

  for (const msg of messages) {
    if (msg.usage) {
      totalInputTokens += msg.usage.input_tokens || 0;
      totalOutputTokens += msg.usage.output_tokens || 0;
    }
    if (msg.cost) {
      totalCost += msg.cost.totalCost || 0;
    }
  }

  return {
    totalInputTokens,
    totalOutputTokens,
    totalCost,
  };
};
