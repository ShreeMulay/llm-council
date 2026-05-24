import { useState } from 'react';
import ModelPicker from './ModelPicker';
import { MODEL_INFO } from '../api';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  compact,
  onToggleCompact,
  globalModelConfig,
  onUpdateGlobalModelConfig,
  isOpen,
  onClose,
}) {
  const [showModelConfig, setShowModelConfig] = useState(false);

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

  const getActiveModelsPreview = (conv) => {
    const models = conv.active_models || globalModelConfig;
    if (!models || models.length === 0) return null;
    return (
      <div className="conv-model-preview">
        {models.slice(0, 3).map((modelId) => {
          const info = MODEL_INFO[modelId];
          return info ? (
            <span
              key={modelId}
              className="conv-model-dot"
              style={{ background: info.color }}
              title={info.name}
            />
          ) : null;
        })}
        {models.length > 3 && (
          <span className="conv-model-more">+{models.length - 3}</span>
        )}
      </div>
    );
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
                  <div className="conversation-title-row">
                    <div className="conversation-title">
                      {conv.title || 'New Conversation'}
                    </div>
                    {getActiveModelsPreview(conv)}
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

        {/* Council Configuration Panel at the Bottom */}
        <div className="sidebar-settings">
          <div
            className="settings-header clickable"
            onClick={() => setShowModelConfig(!showModelConfig)}
          >
            <span className="settings-icon">⚙️</span>
            <span>Council Configuration</span>
            <span className={`settings-chevron ${showModelConfig ? 'open' : ''}`}>▼</span>
          </div>

          {showModelConfig && (
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

              <div className="model-config-section">
                <div className="model-config-label">
                  Default Models for New Conversations
                </div>
                <ModelPicker
                  selectedModels={globalModelConfig}
                  onChange={onUpdateGlobalModelConfig}
                  showPresets={true}
                  showSaveDefault={false}
                  compact={true}
                />
              </div>
            </div>
          )}

          {!showModelConfig && (
            <div className="settings-summary">
              <span className="summary-badge">
                {globalModelConfig.length} models
              </span>
              <span className="summary-text">
                {compact ? 'Compact mode' : 'Full council'}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
