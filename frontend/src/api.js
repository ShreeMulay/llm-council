/**
 * API client for the LLM Council backend.
 */

const API_BASE = 'http://100.106.122.86:8800';

// API key from Vite env (prefixed with VITE_)
const API_KEY = import.meta.env?.VITE_COUNCIL_API_KEY || '';

// Default headers for all requests
const defaultHeaders = {
  'Content-Type': 'application/json',
};
if (API_KEY) {
  defaultHeaders['X-Council-Key'] = API_KEY;
}

export const MODEL_INFO = {
  'gpt-5.5': {
    id: 'gpt-5.5',
    modelId: 'openai/gpt-5.5',
    name: 'GPT-5.5',
    provider: 'OpenAI',
    color: '#10b981',
    bg: '#e6f7f2',
    border: '#a7f3d0',
    icon: '⚡',
  },
  'opus': {
    id: 'opus',
    modelId: 'anthropic/claude-opus-4.8',
    name: 'Claude Opus 4.8',
    provider: 'Anthropic',
    color: '#f97316',
    bg: '#fff7ed',
    border: '#fed7aa',
    icon: '🏺',
  },
  'glm': {
    id: 'glm',
    modelId: 'fireworks/glm-5.1',
    name: 'GLM-5.1',
    provider: 'Fireworks',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: '🎆',
  },
  'gemini': {
    id: 'gemini',
    modelId: 'google/gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    color: '#a855f7',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: '♊',
  },
  'grok': {
    id: 'grok',
    modelId: 'x-ai/grok-4.3',
    name: 'Grok 4.3',
    provider: 'xAI',
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: '✖️',
  },
  'kimi': {
    id: 'kimi',
    modelId: 'fireworks/kimi-k2.6',
    name: 'Kimi K2.6',
    provider: 'Moonshot',
    color: '#ec4899',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    icon: '🌙',
  },
  'deepseek': {
    id: 'deepseek',
    modelId: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    color: '#14b8a6',
    bg: '#f0fdfa',
    border: '#ccfbf1',
    icon: '🐳',
  },
  'llama': {
    id: 'llama',
    modelId: 'meta-llama/llama-4-maverick',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: '🦙',
  },
  'qwen': {
    id: 'qwen',
    modelId: 'qwen/qwen3.5-122b-a10b',
    name: 'Qwen 3.5 122B',
    provider: 'Alibaba',
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#e0e7ff',
    icon: '👑',
  }
};

// All model IDs in order
export const ALL_MODEL_IDS = Object.keys(MODEL_INFO);

// Default active models (all 9)
export const DEFAULT_ACTIVE_MODELS = ALL_MODEL_IDS;

// Preset configurations
export const MODEL_PRESETS = {
  full: {
    name: 'Full Council',
    icon: '🏛️',
    models: ALL_MODEL_IDS,
  },
  compact: {
    name: 'Compact',
    icon: '⚡',
    models: ['gpt-5.5', 'opus', 'glm', 'gemini', 'grok'],
  },
  speed: {
    name: 'Speed',
    icon: '🚀',
    models: ['gpt-5.5', 'opus', 'gemini'],
  },
  minimal: {
    name: 'Minimal',
    icon: '🎯',
    models: ['gpt-5.5', 'opus'],
  },
};

export function getModelInfo(modelId) {
  if (!modelId) {
    return {
      id: 'unknown',
      modelId: 'unknown',
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
    modelId: modelId,
    name: shortName,
    provider: modelId.split('/')[0] || 'Unknown',
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#e0e7ff',
    icon: '🤖',
  };
}

/**
 * Get backend model ID from frontend model ID
 */
export function getBackendModelId(frontendId) {
  const info = MODEL_INFO[frontendId];
  return info ? info.modelId : frontendId;
}

/**
 * Convert array of frontend model IDs to backend model IDs
 */
export function toBackendModelIds(frontendIds) {
  return frontendIds.map(getBackendModelId);
}

/**
 * Convert array of backend model IDs to frontend model IDs
 */
export function toFrontendModelIds(backendIds) {
  const backendToFrontend = {};
  Object.values(MODEL_INFO).forEach(info => {
    backendToFrontend[info.modelId] = info.id;
  });
  return backendIds.map(id => backendToFrontend[id] || id);
}

/**
 * Parse a complete Server-Sent Event block.
 * Handles multi-line data fields and CRLF line endings.
 */
export function parseSseEventBlock(block) {
  const dataLines = block
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6));

  if (dataLines.length === 0) {
    return null;
  }

  return JSON.parse(dataLines.join('\n'));
}

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      headers: { ...defaultHeaders },
    });
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   * @param {string[]} activeModels - Optional array of frontend model IDs to use
   */
  async createConversation(activeModels = null) {
    const body = {};
    if (activeModels && activeModels.length > 0) {
      body.active_models = toBackendModelIds(activeModels);
    }
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: { ...defaultHeaders },
      body: JSON.stringify(body),
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
      `${API_BASE}/api/conversations/${conversationId}`,
      { headers: { ...defaultHeaders } }
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId, content, compact = false, models = null) {
    const body = { content, compact };
    if (models && models.length > 0) {
      body.models = toBackendModelIds(models);
    }
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: { ...defaultHeaders },
        body: JSON.stringify(body),
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
   * @param {string[]} models - Optional array of frontend model IDs to override
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, onEvent, compact = false, models = null) {
    const body = { content, compact };
    if (models && models.length > 0) {
      body.models = toBackendModelIds(models);
    }
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: { ...defaultHeaders },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const processEventBlock = (block) => {
      if (!block.trim()) return;
      try {
        const event = parseSseEventBlock(block);
        if (event) {
          onEvent(event.type, event);
        }
      } catch (e) {
        console.error('Failed to parse SSE event:', e, block.slice(0, 500));
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        if (buffer.trim()) {
          processEventBlock(buffer);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');

      let eventEndIndex = buffer.indexOf('\n\n');
      while (eventEndIndex !== -1) {
        const block = buffer.slice(0, eventEndIndex);
        buffer = buffer.slice(eventEndIndex + 2);
        processEventBlock(block);
        eventEndIndex = buffer.indexOf('\n\n');
      }
    }
  },
};
