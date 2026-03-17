import type { ModelId, FileAttachment } from '../types';

export interface SuggestionResult {
  suggestedModel: ModelId;
  reason: string;
  confidence: number;
}

const OPUS_KEYWORDS = [
  'analyze', 'research', 'comprehensive', 'detailed', 'in-depth',
  'compare', 'evaluate', 'critique', 'architecture', 'design',
  'strategy', 'complex', 'advanced', 'thorough', 'multi-step',
  'explain why', 'trade-offs', 'nuanced', 'implications',
];

const HAIKU_KEYWORDS = [
  'translate', 'summarize', 'format', 'convert', 'list',
  'rewrite', 'fix grammar', 'spell check', 'classify',
  'extract', 'simple', 'quick', 'short', 'brief',
  'yes or no', 'true or false', 'one word',
];

export const suggestModel = (
  promptText: string,
  attachments: FileAttachment[],
  currentModel: ModelId,
): SuggestionResult | null => {
  const text = promptText.toLowerCase().trim();
  if (!text && attachments.length === 0) return null;

  let score = 0; // negative = simple (Haiku), positive = complex (Opus)

  // Word count factor
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words > 150) score += 3;
  else if (words > 80) score += 2;
  else if (words > 40) score += 1;
  else if (words < 10) score -= 2;
  else if (words < 20) score -= 1;

  // Complexity keywords
  for (const kw of OPUS_KEYWORDS) {
    if (text.includes(kw)) score += 2;
  }
  for (const kw of HAIKU_KEYWORDS) {
    if (text.includes(kw)) score -= 2;
  }

  // Attachment factor
  const totalAttachmentSize = attachments.reduce((s, a) => s + a.size, 0);
  if (attachments.length > 2 || totalAttachmentSize > 50000) score += 3;
  else if (attachments.length > 0) score += 1;

  // Question marks — multiple questions suggest complexity
  const questionMarks = (text.match(/\?/g) || []).length;
  if (questionMarks > 3) score += 2;
  else if (questionMarks > 1) score += 1;

  // Code signals
  if (/```/.test(text) || /function\s|class\s|import\s|const\s|def\s/.test(text)) {
    score += 2;
  }

  // Determine suggested model
  let suggestedModel: ModelId;
  let reason: string;
  let confidence: number;

  if (score >= 5) {
    suggestedModel = 'claude-opus-4.6';
    reason = 'Complex task detected — Opus handles deep analysis best';
    confidence = Math.min(0.9, 0.5 + score * 0.05);
  } else if (score <= -3) {
    suggestedModel = 'claude-haiku-4.5';
    reason = 'Simple task — Haiku is faster and 5x cheaper';
    confidence = Math.min(0.9, 0.5 + Math.abs(score) * 0.05);
  } else {
    suggestedModel = 'claude-sonnet-4.6';
    reason = 'Balanced task — Sonnet offers the best speed/quality ratio';
    confidence = 0.5;
  }

  // Don't suggest if already on the right model
  if (suggestedModel === currentModel) return null;

  return { suggestedModel, reason, confidence };
};
