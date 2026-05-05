export type QwenIntentLabel = 'reading' | 'shopping' | 'filling_form' | 'confused' | 'browsing';

interface QwenCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class QwenIntentPlugin {
  private endpoint: string;

  constructor(endpoint = 'http://127.0.0.1:8000/v1/chat/completions') {
    this.endpoint = endpoint;
  }

  async analyzePageContext(html: string, cursorHistory: Array<Record<string, unknown>>): Promise<QwenIntentLabel> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen-2.5',
          messages: [
            {
              role: 'system',
              content:
                'Classify user behavior. Return exactly one label: reading, shopping, filling_form, confused, or browsing.',
            },
            {
              role: 'user',
              content: `Page snippet: ${html.slice(0, 1000)}\nCursor history: ${JSON.stringify(cursorHistory.slice(-6))}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Qwen intent request failed (${response.status})`);
      }

      const data = (await response.json()) as QwenCompletionResponse;
      const raw = String(data?.choices?.[0]?.message?.content || '').trim().toLowerCase();
      if (raw.includes('reading')) return 'reading';
      if (raw.includes('shopping')) return 'shopping';
      if (raw.includes('filling_form') || raw.includes('filling form')) return 'filling_form';
      if (raw.includes('confused')) return 'confused';
      return 'browsing';
    } catch (_error) {
      return 'browsing';
    }
  }
}
