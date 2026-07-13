/**
 * API client for the LLM Council backend.
 */
import modelRegistry from './generated/model-registry.json' with { type: 'json' };

export const API_BASE = import.meta.env?.VITE_API_BASE || 'http://localhost:8800';

// API key from Vite env (prefixed with VITE_)
const API_KEY = import.meta.env?.VITE_COUNCIL_API_KEY || '';

// Default headers for all requests
const defaultHeaders = {
  'Content-Type': 'application/json',
};
if (API_KEY) {
  defaultHeaders['X-Council-Key'] = API_KEY;
}

const FAMILY_STYLE = {
  openai: { color: '#10b981', bg: '#e6f7f2', border: '#a7f3d0', icon: '⚡' },
  anthropic: { color: '#f97316', bg: '#fff7ed', border: '#fed7aa', icon: '📜' },
  fireworks: { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '🎆' },
  google: { color: '#a855f7', bg: '#f5f3ff', border: '#ddd6fe', icon: '♊' },
  'x-ai': { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: '✖️' },
  deepseek: { color: '#14b8a6', bg: '#f0fdfa', border: '#ccfbf1', icon: '🐳' },
  'meta-llama': { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: '🦙' },
  qwen: { color: '#6366f1', bg: '#eef2ff', border: '#e0e7ff', icon: '👑' },
};
const DEFAULT_STYLE = { color: '#6366f1', bg: '#eef2ff', border: '#e0e7ff', icon: '🤖' };

function registryModelInfo(model, id = model.aliases[0] || model.id) {
  return {
    id,
    modelId: model.id,
    name: model.label,
    provider: model.provider,
    challenger: model.challenger,
    legacy: model.legacy,
    ...(FAMILY_STYLE[model.family] || DEFAULT_STYLE),
  };
}

export const MODEL_INFO = Object.fromEntries(modelRegistry.models.flatMap((model) => {
  const keys = model.aliases.length ? model.aliases : [model.id];
  return keys.map((key) => [key, registryModelInfo(model, key)]);
}));

// All default production model aliases in canonical seat order.
export const ALL_MODEL_IDS = modelRegistry.default_roster.map((modelId) => {
  const model = modelRegistry.models.find((item) => item.id === modelId);
  return model?.aliases[0] || modelId;
});

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
    models: modelRegistry.compact_roster.map((modelId) => {
      const model = modelRegistry.models.find((item) => item.id === modelId);
      return model?.aliases[0] || modelId;
    }),
  },
  speed: {
    name: 'Speed',
    icon: '🚀',
    models: [ALL_MODEL_IDS[0], ALL_MODEL_IDS[1], ALL_MODEL_IDS[3]],
  },
  minimal: {
    name: 'Minimal',
    icon: '🎯',
    models: ALL_MODEL_IDS.slice(0, 2),
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
  if (MODEL_INFO[lower]) return MODEL_INFO[lower];
  const model = modelRegistry.models.find((item) =>
    item.id.toLowerCase() === lower || item.provider_model_id.toLowerCase() === lower
  );
  if (model) return registryModelInfo(model);

  // Fallback
  const shortName = modelId.split('/')[1] || modelId;
  return {
    id: shortName.toLowerCase(),
    modelId: modelId,
    name: shortName,
    provider: 'Unknown',
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
    if (!backendToFrontend[info.modelId] || !info.challenger) {
      backendToFrontend[info.modelId] = info.id;
    }
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
