import type { Message, ModelId, TokenUsage } from '../types';
import { MODEL_CONFIGS } from '../types';

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onThinking?: (text: string) => void;
  onUsage: (usage: TokenUsage) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export const sendMessageToClaude = async (
  messages: Message[],
  model: ModelId,
  apiKey: string,
  callbacks: StreamCallbacks,
  thinkingEnabled: boolean = false
) => {
  try {
    // Format messages for Claude API
    const formattedMessages = messages
      .filter(m => !m.isStreaming)
      .map(msg => {
        let content = msg.content;

        // Append attachments to user messages
        if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
          const attachmentsContext = msg.attachments
            .map(a => `\n\n--- FILE: ${a.name} ---\n${a.content}\n--- END OF FILE ---\n\n`)
            .join('');
          content += attachmentsContext;
        }

        return {
          role: msg.role,
          content: content
        };
      });

    const modelConfig = MODEL_CONFIGS[model];

    const systemPrompt = `You are an expert AI assistant named CostPilot by Compra, styled like Claude, operating within a tool specifically designed to estimate the real-time cost of report generation and data iteration. Provide clear, accurate, and helpful responses.

When you generate substantial content like reports, code files, data tables, or documents, wrap them in artifact tags:
<artifact title="Report Title" type="document">
...markdown content...
</artifact>

Supported artifact types:
- "document" for markdown reports, analyses, and written content
- "code" with a language attribute for code files, e.g. <artifact title="Script" type="code" language="python">
- "csv" for data tables in CSV format
- "html" for rich HTML content

Only use artifacts for substantial, standalone content. Do not use artifacts for short inline code snippets or brief explanations.`;

    const requestBody: Record<string, unknown> = {
      model: modelConfig.apiModelId,
      max_tokens: modelConfig.maxTokens,
      messages: formattedMessages,
      system: systemPrompt,
    };

    // Add thinking config when enabled
    if (thinkingEnabled) {
      const budgetTokens = Math.min(Math.floor(modelConfig.maxTokens * 0.6), 32000);
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: budgetTokens,
      };
    }

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiBase}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.details || `API Request failed with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body stream available');
    }

    // Parse Server-Sent Events (SSE)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let currentUsage: TokenUsage | null = null;
    let currentBlockType: 'text' | 'thinking' | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;

          try {
            const data = JSON.parse(dataStr);

            switch (data.type) {
              case 'message_start':
                if (data.message && data.message.usage) {
                  currentUsage = {
                    input_tokens: data.message.usage.input_tokens || 0,
                    output_tokens: 0,
                  };
                }
                break;

              case 'content_block_start':
                if (data.content_block) {
                  currentBlockType = data.content_block.type === 'thinking' ? 'thinking' : 'text';
                }
                break;

              case 'content_block_stop':
                currentBlockType = null;
                break;

              case 'content_block_delta':
                if (data.delta) {
                  if (data.delta.type === 'thinking_delta' && data.delta.thinking) {
                    callbacks.onThinking?.(data.delta.thinking);
                  } else if (data.delta.type === 'text_delta' && data.delta.text) {
                    callbacks.onChunk(data.delta.text);
                  } else if (data.delta.text && currentBlockType === 'text') {
                    // Fallback for older format
                    callbacks.onChunk(data.delta.text);
                  }
                }
                break;

              case 'message_delta':
                if (data.usage) {
                  if (currentUsage) {
                    currentUsage.output_tokens = data.usage.output_tokens || currentUsage.output_tokens;
                  } else {
                    currentUsage = {
                      input_tokens: 0,
                      output_tokens: data.usage.output_tokens || 0,
                    };
                  }
                }
                break;
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e, dataStr);
          }
        }
      }
    }

    if (currentUsage) {
      callbacks.onUsage(currentUsage);
    }

    callbacks.onComplete();

  } catch (error) {
    console.error('Error sending message:', error);
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error occurred'));
  }
};
