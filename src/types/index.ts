export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  usage?: TokenUsage;
  cost?: CostBreakdown;
  attachments?: FileAttachment[];
  isStreaming?: boolean;
  thinking?: string;
  excludeFromContext?: boolean;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
}

export interface ContextCompression {
  summary: string;
  compressedUpToIndex: number;
  model: ModelId;
  timestamp: number;
  originalTokenEstimate: number;
  summaryTokenEstimate: number;
  cost: CostBreakdown;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: ModelId;
  createdAt: number;
  updatedAt: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  compression?: ContextCompression;
}

export type ModelId = 'claude-haiku-4.5' | 'claude-sonnet-4.6' | 'claude-opus-4.6';

export interface ModelConfig {
  id: ModelId;
  name: string;
  displayName: string;
  apiModelId: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  description: string;
  maxTokens: number;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  'claude-haiku-4.5': {
    id: 'claude-haiku-4.5',
    name: 'claude-haiku-4-5',
    displayName: 'Haiku 4.5',
    apiModelId: 'claude-haiku-4-5',
    inputPricePerMillion: 1.0,
    outputPricePerMillion: 5.0,
    description: 'Fastest & most affordable',
    maxTokens: 64000,
  },
  'claude-sonnet-4.6': {
    id: 'claude-sonnet-4.6',
    name: 'claude-sonnet-4-6',
    displayName: 'Sonnet 4.6',
    apiModelId: 'claude-sonnet-4-6',
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    description: 'Speed + intelligence',
    maxTokens: 64000,
  },
  'claude-opus-4.6': {
    id: 'claude-opus-4.6',
    name: 'claude-opus-4-6',
    displayName: 'Opus 4.6',
    apiModelId: 'claude-opus-4-6',
    inputPricePerMillion: 5.0,
    outputPricePerMillion: 25.0,
    description: 'Most intelligent',
    maxTokens: 128000,
  },
};
