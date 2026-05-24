/**
 * API client for the LLM Council backend.
 */

const API_BASE = 'http://localhost:8800';

export const MODEL_INFO = {
  'gpt-5.5': {
    id: 'gpt-5.5',
    name: 'GPT-5.5',
    provider: 'OpenAI',
    color: '#10b981',
    bg: '#e6f7f2',
    border: '#a7f3d0',
    icon: '⚡',
  },
  'opus': {
    id: 'opus',
    name: 'Claude Opus 4.7',
    provider: 'Anthropic',
    color: '#f97316',
    bg: '#fff7ed',
    border: '#fed7aa',
    icon: '🏺',
  },
  'glm': {
    id: 'glm',
    name: 'GLM-5.1',
    provider: 'Fireworks',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: '🎆',
  },
  'gemini': {
    id: 'gemini',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    color: '#a855f7',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: '♊',
  },
  'grok': {
    id: 'grok',
    name: 'Grok 4.3',
    provider: 'xAI',
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: '✖️',
  },
  'kimi': {
    id: 'kimi',
    name: 'Kimi K2.6',
    provider: 'Moonshot',
    color: '#ec4899',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    icon: '🌙',
  },
  'deepseek': {
    id: 'deepseek',
    name: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    color: '#14b8a6',
    bg: '#f0fdfa',
    border: '#ccfbf1',
    icon: '🐳',
  },
  'llama': {
    id: 'llama',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: '🦙',
  },
  'qwen': {
    id: 'qwen',
    name: 'Qwen 3.5 122B',
    provider: 'Alibaba',
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#e0e7ff',
    icon: '👑',
  }
};

export function getModelInfo(modelId) {
  if (!modelId) {
    return {
      id: 'unknown',
      name: 'Unknown Model',
      provider: 'Unknown',
      color: '#64748b',
      bg: '#f1f5f9',
      border: '#e2e8f0',
      icon: '🤖',
    };
  }
  const lower = modelId.toLowerCase();
  if (lower.includes('gpt') || lower.includes('openai')) return MODEL_INFO['gpt-5.5'];
  if (lower.includes('opus') || lower.includes('claude') || lower.includes('anthropic')) return MODEL_INFO['opus'];
  if (lower.includes('glm') || (lower.includes('fireworks') && lower.includes('glm'))) return MODEL_INFO['glm'];
  if (lower.includes('gemini') || lower.includes('google') || lower.includes('pro')) return MODEL_INFO['gemini'];
  if (lower.includes('grok') || lower.includes('x-ai') || lower.includes('xai')) return MODEL_INFO['grok'];
  if (lower.includes('kimi') || lower.includes('moonshot')) return MODEL_INFO['kimi'];
  if (lower.includes('deepseek')) return MODEL_INFO['deepseek'];
  if (lower.includes('llama') || lower.includes('meta')) return MODEL_INFO['llama'];
  if (lower.includes('qwen')) return MODEL_INFO['qwen'];
  
  // Fireworks direct fallback
  if (lower.includes('fireworks')) {
    if (lower.includes('kimi')) return MODEL_INFO['kimi'];
    return MODEL_INFO['glm'];
  }

  // Fallback
  const shortName = modelId.split('/')[1] || modelId;
  return {
    id: shortName.toLowerCase(),
    name: shortName,
    provider: modelId.split('/')[0] || 'Unknown',
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#e0e7ff',
    icon: '🤖',
  };
}

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`);
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId, content, compact = false) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, compact }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @param {boolean} compact - Use core 5 models only
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, onEvent, compact = false) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, compact }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  },
};
