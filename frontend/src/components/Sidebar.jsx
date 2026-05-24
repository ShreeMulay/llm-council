import { useState } from 'react';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  compact,
  onToggleCompact,
  isOpen,
  onClose,
}) {
  const handleSelect = (id) => {
    onSelectConversation(id);
    if (onClose) {
      onClose(); // Close sidebar on mobile after selecting
    }
  };

  const handleNew = () => {
    onNewConversation();
    if (onClose) {
      onClose(); // Close sidebar on mobile after creating new
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-area">
            <span className="logo-icon">⚖️</span>
            <h1>LLM Council</h1>
          </div>
          {isOpen && (
            <button className="sidebar-close-btn" onClick={onClose} aria-label="Close Sidebar">
              ✕
            </button>
          )}
          <button className="new-conversation-btn" onClick={handleNew}>
            <span className="btn-icon">+</span> New Conversation
          </button>
        </div>

        <div className="conversation-list">
          <div className="section-title">Conversations</div>
          {conversations.length === 0 ? (
            <div className="no-conversations">
              <span className="empty-icon">💬</span>
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${
                  conv.id === currentConversationId ? 'active' : ''
                }`}
                onClick={() => handleSelect(conv.id)}
              >
                <div className="conversation-marker" />
                <div className="conversation-content">
                  <div className="conversation-title">
                    {conv.title || 'New Conversation'}
                  </div>
                  <div className="conversation-meta">
                    <span className="meta-badge">
                      {conv.message_count} {conv.message_count === 1 ? 'msg' : 'msgs'}
                    </span>
                    <span className="meta-date">
                      {new Date(conv.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Settings Panel at the Bottom */}
        <div className="sidebar-settings">
          <div className="settings-header">
            <span className="settings-icon">⚙️</span>
            <span>Settings</span>
          </div>
          
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-label-group">
                <span className="settings-label">Compact Mode</span>
                <span className="settings-desc">Use core 5 models instead of 9</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={compact}
                  onChange={onToggleCompact}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="active-models-preview">
              <span className="preview-title">Active Models ({compact ? '5' : '9'}):</span>
              <div className="preview-badges">
                {compact ? (
                  <>
                    <span className="preview-badge openai">GPT-5.5</span>
                    <span className="preview-badge anthropic">Opus 4.7</span>
                    <span className="preview-badge fireworks">GLM-5.1</span>
                    <span className="preview-badge google">Gemini 3.1</span>
                    <span className="preview-badge xai">Grok 4.3</span>
                  </>
                ) : (
                  <>
                    <span className="preview-badge openai">GPT-5.5</span>
                    <span className="preview-badge anthropic">Opus 4.7</span>
                    <span className="preview-badge fireworks">GLM-5.1</span>
                    <span className="preview-badge google">Gemini 3.1</span>
                    <span className="preview-badge xai">Grok 4.3</span>
                    <span className="preview-badge moonshot">Kimi K2.6</span>
                    <span className="preview-badge deepseek">DeepSeek V4</span>
                    <span className="preview-badge meta">Llama 4</span>
                    <span className="preview-badge alibaba">Qwen 3.5</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
