import type { Conversation, ModelId } from '../types';
import { MODEL_CONFIGS } from '../types';
import { getContextTokenCount, shouldSuggestCompression, estimateProjectedSavings } from './contextCompression';

export interface ModelForecast {
  modelId: ModelId;
  displayName: string;
  inputCost: number;
  totalCost: number;
}

export interface Forecast {
  totalInputTokens: number;
  estimatedOutputTokens: number;
  models: ModelForecast[];
}

export interface CompressHint {
  shouldShow: boolean;
  currentOpusCost: number;
  compressedOpusCost: number;
}

export const calculateForecast = (
  contextTokens: number,
  promptTokens: number,
  thinkingEnabled: boolean
): Forecast => {
  const totalInputTokens = contextTokens + promptTokens;

  let estimatedOutputTokens = Math.min(Math.max(promptTokens * 2, 200), 2000);
  if (thinkingEnabled) {
    estimatedOutputTokens += Math.min(promptTokens * 3, 10000);
  }

  const modelIds = Object.keys(MODEL_CONFIGS) as ModelId[];
  const models: ModelForecast[] = modelIds.map(modelId => {
    const config = MODEL_CONFIGS[modelId];
    const inputCost = (totalInputTokens / 1_000_000) * config.inputPricePerMillion;
    const outputCost = (estimatedOutputTokens / 1_000_000) * config.outputPricePerMillion;
    return {
      modelId,
      displayName: config.displayName,
      inputCost,
      totalCost: inputCost + outputCost,
    };
  });

  return { totalInputTokens, estimatedOutputTokens, models };
};

export const getCompressHint = (
  conversation: Conversation,
  promptTokens: number
): CompressHint => {
  if (!shouldSuggestCompression(conversation)) {
    return { shouldShow: false, currentOpusCost: 0, compressedOpusCost: 0 };
  }

  const contextTokens = getContextTokenCount(conversation);
  const currentForecast = calculateForecast(contextTokens, promptTokens, false);
  const currentOpusCost = currentForecast.models.find(m => m.modelId === 'claude-opus-4.6')!.totalCost;

  const savings = estimateProjectedSavings(conversation, 'claude-haiku-4.5', 4, 'claude-opus-4.6');
  const compressedForecast = calculateForecast(savings.projectedTokensPerMsg, promptTokens, false);
  const compressedOpusCost = compressedForecast.models.find(m => m.modelId === 'claude-opus-4.6')!.totalCost;

  const savingsPercent = currentOpusCost > 0 ? (currentOpusCost - compressedOpusCost) / currentOpusCost : 0;

  return {
    shouldShow: savingsPercent > 0.3,
    currentOpusCost,
    compressedOpusCost,
  };
};

export const getCostLevel = (cost: number): 'low' | 'medium' | 'high' => {
  if (cost < 0.01) return 'low';
  if (cost < 0.05) return 'medium';
  return 'high';
};
