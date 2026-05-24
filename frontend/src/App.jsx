import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { api, DEFAULT_ACTIVE_MODELS, toFrontendModelIds } from './api';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [compact, setCompact] = useState(() => {
    return localStorage.getItem('llm_council_compact') === 'true';
  });

  // Global model configuration (default for new conversations)
  const [globalModelConfig, setGlobalModelConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('llm_council_models');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate: must be array with at least 2 items
        if (Array.isArray(parsed) && parsed.length >= 2) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load model config from localStorage:', e);
    }
    return DEFAULT_ACTIVE_MODELS;
  });

  const handleToggleCompact = () => {
    setCompact((prev) => {
      const next = !prev;
      localStorage.setItem('llm_council_compact', String(next));
      return next;
    });
  };

  const handleUpdateGlobalModelConfig = (models) => {
    setGlobalModelConfig(models);
    localStorage.setItem('llm_council_models', JSON.stringify(models));
  };

  const normalizeConversation = (conv) => ({
    ...conv,
    active_models: conv.active_models ? toFrontendModelIds(conv.active_models) : null,
  });

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      // Convert backend model IDs to frontend IDs for any conversations with active_models
      const normalizedConvs = convs.map(normalizeConversation);
      setConversations(normalizedConvs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const refreshConversation = async (conversationId) => {
    try {
      const conv = await api.getConversation(conversationId);
      setCurrentConversation(normalizeConversation(conv));
    } catch (error) {
      console.error('Failed to refresh conversation:', error);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    let cancelled = false;

    const fetchConversations = async () => {
      try {
        const convs = await api.listConversations();
        if (!cancelled) {
          setConversations(convs.map(normalizeConversation));
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };

    fetchConversations();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load conversation details when selected
  useEffect(() => {
    if (!currentConversationId) return;

    let cancelled = false;

    const fetchConversation = async () => {
      try {
        const conv = await api.getConversation(currentConversationId);
        if (!cancelled) {
          setCurrentConversation(normalizeConversation(conv));
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
      }
    };

    fetchConversation();

    return () => {
      cancelled = true;
    };
  }, [currentConversationId]);

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation(globalModelConfig);
      setConversations([
        {
          id: newConv.id,
          created_at: newConv.created_at,
          message_count: 0,
          active_models: globalModelConfig,
        },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleSendMessage = async (content, overrideModels = null) => {
    if (!currentConversationId) return;

    setIsLoading(true);
    try {
      // Determine which models to use: override > conversation active_models > global default
      const models = overrideModels
        || (currentConversation?.active_models)
        || globalModelConfig;

      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming
      await api.sendMessageStream(currentConversationId, content, (eventType, event) => {
        switch (eventType) {
          case 'stage1_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage1 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage1_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage1 = event.data;
              lastMsg.loading.stage1 = false;
              return { ...prev, messages };
            });
            break;

          case 'stage2_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage2 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage2_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage2 = event.data;
              lastMsg.metadata = event.metadata;
              lastMsg.loading.stage2 = false;
              return { ...prev, messages };
            });
            break;

          case 'stage3_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage3 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage3_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage3 = event.data;
              lastMsg.loading.stage3 = false;
              return { ...prev, messages };
            });
            break;

          case 'title_complete':
            // Reload conversations to get updated title
            loadConversations();
            break;

          case 'complete':
            // Stream complete, reload both list and current conversation.
            // This replaces the optimistic streaming placeholder with the
            // persisted assistant message, recovering cleanly even if a large
            // SSE payload was missed or the tab/network stalled mid-stream.
            loadConversations();
            refreshConversation(currentConversationId);
            setIsLoading(false);
            break;

          case 'error':
            console.error('Stream error:', event.message);
            setIsLoading(false);
            break;

          default:
            console.log('Unknown event type:', eventType);
        }
      }, compact, models);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic messages on error
      setCurrentConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        compact={compact}
        onToggleCompact={handleToggleCompact}
        globalModelConfig={globalModelConfig}
        onUpdateGlobalModelConfig={handleUpdateGlobalModelConfig}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        globalModelConfig={globalModelConfig}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
    </div>
  );
}

export default App;
