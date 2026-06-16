import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import ModelPicker from './ModelPicker';
import './ChatInterface.css';

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
  globalModelConfig,
  onToggleSidebar,
}) {
  const [input, setInput] = useState('');
  const [showModelOverride, setShowModelOverride] = useState(false);
  const [overrideModels, setOverrideModels] = useState(null);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const modelPickerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages?.length, isLoading]);

  // Close model picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(event.target)) {
        setShowModelOverride(false);
      }
    };
    if (showModelOverride) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelOverride]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      // Send with override models if set, otherwise null (will use conversation/global default)
      onSendMessage(input, overrideModels);
      setInput('');
      // Clear override after sending
      setOverrideModels(null);
      setShowModelOverride(false);
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handlePromptCardClick = (promptText) => {
    if (!isLoading) {
      onSendMessage(promptText, overrideModels);
      // Clear override after sending
      setOverrideModels(null);
      setShowModelOverride(false);
    }
  };

  const getActiveModels = () => {
    if (overrideModels) return overrideModels;
    if (conversation?.active_models) return conversation.active_models;
    return globalModelConfig;
  };

  const getModelSummary = () => {
    const models = getActiveModels();
    if (models.length === 9) return 'Full Council (9)';
    if (models.length === 5) return 'Compact (5)';
    if (models.length === 3) return 'Speed (3)';
    if (models.length === 2) return 'Minimal (2)';
    return `Custom (${models.length})`;
  };

  if (!conversation) {
    return (
      <div className="chat-interface empty">
        <header className="chat-header mobile-only-header">
          <button className="menu-toggle-btn" onClick={onToggleSidebar} aria-label="Open Menu">
            ☰
          </button>
          <div className="header-title">LLM Council</div>
        </header>
        <div className="empty-state-container">
          <div className="empty-state-hero">
            <span className="chamber-icon">🏛️</span>
            <h2>LLM Council Chamber</h2>
            <p className="hero-subtitle">
              A multi-model consensus engine. Consult 9 expert models, witness anonymous peer review, and receive a high-fidelity synthesized answer.
            </p>
          </div>

          <div className="council-roster-preview">
            <h3>The Council Members</h3>
            <div className="roster-grid">
              <div className="roster-item openai">
                <span className="roster-icon">⚡</span>
                <span className="roster-name">GPT-5.5</span>
                <span className="roster-role">Anchor Reasoning</span>
              </div>
              <div className="roster-item anthropic">
                <span className="roster-icon">🏺</span>
                <span className="roster-name">Claude Opus 4.8</span>
                <span className="roster-role">Chairman & Coder</span>
              </div>
              <div className="roster-item fireworks">
                <span className="roster-icon">🎆</span>
                <span className="roster-name">GLM-5.2</span>
                <span className="roster-role">Tool Specialist</span>
              </div>
              <div className="roster-item google">
                <span className="roster-icon">♊</span>
                <span className="roster-name">Gemini 3.1 Pro</span>
                <span className="roster-role">Knowledge Generalist</span>
              </div>
              <div className="roster-item xai">
                <span className="roster-icon">✖️</span>
                <span className="roster-name">Grok 4.3</span>
                <span className="roster-role">Real-time Intel</span>
              </div>
              <div className="roster-item moonshot">
                <span className="roster-icon">🌙</span>
                <span className="roster-name">Kimi K2.6</span>
                <span className="roster-role">Long-context Expert</span>
              </div>
              <div className="roster-item deepseek">
                <span className="roster-icon">🐳</span>
                <span className="roster-name">DeepSeek V4 Pro</span>
                <span className="roster-role">Math & Code Pro</span>
              </div>
              <div className="roster-item meta">
                <span className="roster-icon">🦙</span>
                <span className="roster-name">Llama 4 Maverick</span>
                <span className="roster-role">Open-weight Generalist</span>
              </div>
              <div className="roster-item alibaba">
                <span className="roster-icon">👑</span>
                <span className="roster-name">Qwen 3.7 Max</span>
                <span className="roster-role">Multilingual Specialist</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeModels = getActiveModels();
  const activeModelsCount = activeModels.length;
  const hasOverride = overrideModels !== null;

  return (
    <div className="chat-interface" ref={containerRef}>
      {/* Header */}
      <header className="chat-header">
        <button className="menu-toggle-btn" onClick={onToggleSidebar} aria-label="Toggle Sidebar">
          ☰
        </button>
        <div className="header-info">
          <h2 className="header-title">{conversation.title || 'New Consultation'}</h2>
          <div className="header-meta">
            <span className="status-dot pulsing"></span>
            <span className="status-text">
              {getModelSummary()} • {activeModelsCount} Model{activeModelsCount !== 1 ? 's' : ''} Active
            </span>
            {hasOverride && (
              <span className="override-badge">Override</span>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="messages-container">
        {conversation.messages.length === 0 ? (
          <div className="welcome-prompts-container">
            <div className="welcome-hero">
              <span className="welcome-icon">🏛️</span>
              <h3>The Council is Assembled</h3>
              <p>Present your query to initiate the 3-stage deliberation process.</p>
            </div>
            
            <div className="prompt-cards-grid">
              <div 
                className="prompt-card" 
                onClick={() => handlePromptCardClick("Compare quantum computing with classical computing in simple terms, highlighting key benefits.")}
              >
                <span className="card-emoji">🔬</span>
                <h4>Explain Quantum</h4>
                <p>Compare quantum and classical computing in simple terms.</p>
              </div>
              <div 
                className="prompt-card" 
                onClick={() => handlePromptCardClick("Write a highly optimized Python function to find the longest common subsequence of two strings with O(M*N) space and time complexity, and explain the dynamic programming approach.")}
              >
                <span className="card-emoji">💻</span>
                <h4>Optimize Code</h4>
                <p>Request an optimized LCS algorithm with complexity analysis.</p>
              </div>
              <div 
                className="prompt-card" 
                onClick={() => handlePromptCardClick("What are the most likely geopolitical and economic consequences of global supply chain decoupling over the next decade?")}
              >
                <span className="card-emoji">🌐</span>
                <h4>Geopolitical Analysis</h4>
                <p>Analyze consequences of global supply chain decoupling.</p>
              </div>
              <div 
                className="prompt-card" 
                onClick={() => handlePromptCardClick("Debate the ethical implications of creating sentient artificial intelligence. Present arguments from both deontological and utilitarian perspectives.")}
              >
                <span className="card-emoji">⚖️</span>
                <h4>Ethical Debate</h4>
                <p>Debate sentient AI ethics from utilitarian and deontological views.</p>
              </div>
            </div>
          </div>
        ) : (
          conversation.messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            
            // Check if this is a streaming/loading assistant message
            const isMsgLoading = msg.role === 'assistant' && (msg.loading?.stage1 || msg.loading?.stage2 || msg.loading?.stage3);
            const hasData = msg.stage1 || msg.stage2 || msg.stage3;

            return (
              <div key={index} className={`message-group ${isUser ? 'user-group' : 'assistant-group'}`}>
                {isUser ? (
                  <div className="user-message">
                    <div className="message-avatar">U</div>
                    <div className="message-bubble">
                      <div className="markdown-content">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="assistant-message">
                    <div className="assistant-header-badge">
                      <span className="badge-icon">🏛️</span>
                      <span>Council Deliberation</span>
                    </div>

                    {/* Stage Progress Timeline (Shown when loading OR when message is complete) */}
                    {(isMsgLoading || hasData) && (
                      <div className="deliberation-timeline">
                        <div className={`timeline-step ${msg.stage1 ? 'completed' : msg.loading?.stage1 ? 'active' : ''}`}>
                          <div className="step-number">1</div>
                          <div className="step-label">Stage 1: Collection</div>
                        </div>
                        <div className="timeline-connector"></div>
                        <div className={`timeline-step ${msg.stage2 ? 'completed' : msg.loading?.stage2 ? 'active' : ''}`}>
                          <div className="step-number">2</div>
                          <div className="step-label">Stage 2: Peer Review</div>
                        </div>
                        <div className="timeline-connector"></div>
                        <div className={`timeline-step ${msg.stage3 ? 'completed' : msg.loading?.stage3 ? 'active' : ''}`}>
                          <div className="step-number">3</div>
                          <div className="step-label">Stage 3: Synthesis</div>
                        </div>
                      </div>
                    )}

                    {/* Stage 1 */}
                    {msg.loading?.stage1 && (
                      <div className="stage-loading-card">
                        <div className="pulse-loader"></div>
                        <div className="loading-text-group">
                          <h4>Stage 1: Querying Council Members...</h4>
                          <p>Collecting independent perspectives from {activeModelsCount} models in parallel.</p>
                        </div>
                      </div>
                    )}
                    {msg.stage1 && <Stage1 responses={msg.stage1} />}

                    {/* Stage 2 */}
                    {msg.loading?.stage2 && (
                      <div className="stage-loading-card">
                        <div className="pulse-loader review"></div>
                        <div className="loading-text-group">
                          <h4>Stage 2: Conducting Peer Review...</h4>
                          <p>Evaluators are ranking anonymized responses using self-exclusion guidelines.</p>
                        </div>
                      </div>
                    )}
                    {msg.stage2 && (
                      <Stage2
                        rankings={msg.stage2}
                        labelToModel={msg.metadata?.label_to_model || msg.label_to_model}
                        aggregateRankings={msg.metadata?.aggregate_rankings || msg.aggregate_rankings}
                      />
                    )}

                    {/* Stage 3 */}
                    {msg.loading?.stage3 && (
                      <div className="stage-loading-card">
                        <div className="pulse-loader synthesis"></div>
                        <div className="loading-text-group">
                          <h4>Stage 3: Synthesizing Final Answer...</h4>
                          <p>The Chairman is distilling consensus, resolving discrepancies, and drafting the final response.</p>
                        </div>
                      </div>
                    )}
                    {msg.stage3 && <Stage3 finalResponse={msg.stage3} />}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* General Loading Indicator */}
        {isLoading && conversation.messages.length > 0 && 
         !conversation.messages[conversation.messages.length - 1].loading?.stage1 && 
         !conversation.messages[conversation.messages.length - 1].loading?.stage2 && 
         !conversation.messages[conversation.messages.length - 1].loading?.stage3 && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Consulting the Council...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form - FIXED: ALWAYS visible when conversation exists */}
      <div className="input-area-container">
        <form className="input-form" onSubmit={handleSubmit}>
          <textarea
            className="message-input"
            placeholder={isLoading ? "The Council is deliberating..." : "Ask the Council a question... (Press Enter to send, Shift+Enter for new line)"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />
          <div className="input-actions">
            {/* Model Override Button */}
            <div className="model-override-wrapper" ref={modelPickerRef}>
              <button
                type="button"
                className={`model-override-btn ${hasOverride ? 'active' : ''}`}
                onClick={() => setShowModelOverride(!showModelOverride)}
                disabled={isLoading}
                title={hasOverride ? `Override: ${getModelSummary()}` : 'Configure models for this message'}
                aria-label="Model Override"
              >
                <span className="override-icon">⚙️</span>
                <span className="override-label">{getModelSummary()}</span>
              </button>
              
              {showModelOverride && (
                <div className="model-override-dropdown">
                  <div className="override-dropdown-header">
                    <h4>Models for This Message</h4>
                    <p>Override the default model selection</p>
                  </div>
                  <ModelPicker
                    selectedModels={overrideModels || activeModels}
                    onChange={setOverrideModels}
                    showPresets={true}
                    showSaveDefault={false}
                    compact={true}
                  />
                  <div className="override-dropdown-footer">
                    <button
                      type="button"
                      className="reset-override-btn"
                      onClick={() => {
                        setOverrideModels(null);
                        setShowModelOverride(false);
                      }}
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="send-button"
              disabled={!input.trim() || isLoading}
              aria-label="Send Message"
            >
              {isLoading ? (
                <span className="btn-spinner"></span>
              ) : (
                <span className="send-icon">▲</span>
              )}
            </button>
          </div>
        </form>
        <div className="input-footer">
          LLM Council Deliberation Engine • Multi-Model Peer Review & Synthesis
        </div>
      </div>
    </div>
  );
}
