import { MODEL_CONFIGS } from '../types';
import type { ModelId } from '../types';
import { calculateMessageCost } from './tokenCounter';

export interface ModelCostComparison {
  modelId: ModelId;
  displayName: string;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  isSelected: boolean;
  isActual: boolean;
  savingsVsThis: number;
  multiplier: string;
}

export function compareCostsAcrossModels(
  inputTokens: number,
  outputTokens: number,
  activeModelId: ModelId
): ModelCostComparison[] {
  const models = Object.values(MODEL_CONFIGS);
  const activeCost = calculateMessageCost(
    inputTokens,
    outputTokens,
    MODEL_CONFIGS[activeModelId].inputPricePerMillion,
    MODEL_CONFIGS[activeModelId].outputPricePerMillion
  );

  return models.map((model) => {
    const cost = calculateMessageCost(
      inputTokens,
      outputTokens,
      model.inputPricePerMillion,
      model.outputPricePerMillion
    );

    const isActive = model.id === activeModelId;
    const savings = activeCost.totalCost - cost.totalCost;

    let multiplier = '';
    if (!isActive && activeCost.totalCost > 0 && cost.totalCost > 0) {
      if (cost.totalCost < activeCost.totalCost) {
        const ratio = Math.round(activeCost.totalCost / cost.totalCost);
        if (ratio >= 2) {
          multiplier = `${ratio}x cheaper`;
        } else {
          multiplier = 'cheaper';
        }
      } else if (cost.totalCost > activeCost.totalCost) {
        const ratio = Math.round(cost.totalCost / activeCost.totalCost);
        if (ratio >= 2) {
          multiplier = `${ratio}x more`;
        } else {
          multiplier = 'more expensive';
        }
      }
    }

    return {
      modelId: model.id,
      displayName: model.displayName,
      inputCost: cost.inputCost,
      outputCost: cost.outputCost,
      totalCost: cost.totalCost,
      isSelected: isActive,
      isActual: isActive,
      savingsVsThis: savings,
      multiplier,
    };
  });
}
