import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { getModelInfo } from '../api';
import './Stage1.css';

export default function Stage1({ responses }) {
  const [activeTab, setActiveTab] = useState('compare'); // Default to Compare All for high impact

  if (!responses || responses.length === 0) {
    return null;
  }

  return (
    <div className="stage stage1">
      <div className="stage-header-row">
        <div className="stage-title-group">
          <span className="stage-badge">Stage 1</span>
          <h3 className="stage-title">Individual Council Responses</h3>
        </div>
        <p className="stage-subtitle-desc">
          All models processed the query independently in parallel.
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab compare-tab ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          <span className="tab-icon">📊</span> Compare All
        </button>
        <div className="tabs-divider" />
        <div className="model-tabs">
          {responses.map((resp, index) => {
            const info = getModelInfo(resp.model);
            const isTabActive = activeTab === index;
            return (
              <button
                key={index}
                className={`tab model-tab ${isTabActive ? 'active' : ''}`}
                style={{
                  '--tab-color': info.color,
                  '--tab-bg': info.bg,
                  '--tab-border': info.border,
                }}
                onClick={() => setActiveTab(index)}
              >
                <span className="tab-emoji">{info.icon}</span>
                <span className="tab-model-name">{info.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content-area">
        {activeTab === 'compare' ? (
          <div className="compare-grid">
            {responses.map((resp, index) => {
              const info = getModelInfo(resp.model);
              return (
                <div
                  key={index}
                  className="compare-card"
                  style={{
                    '--card-border-hover': info.color,
                    '--card-header-bg': info.bg,
                  }}
                >
                  <div className="compare-card-header">
                    <div className="compare-model-badge">
                      <span className="compare-icon">{info.icon}</span>
                      <div className="compare-name-group">
                        <span className="compare-name">{info.name}</span>
                        <span className="compare-provider">{info.provider}</span>
                      </div>
                    </div>
                  </div>
                  <div className="compare-card-body markdown-content">
                    <ReactMarkdown>
                      {resp.response.length > 350
                        ? `${resp.response.slice(0, 350)}...`
                        : resp.response}
                    </ReactMarkdown>
                  </div>
                  {resp.response.length > 350 && (
                    <div className="compare-card-footer">
                      <button
                        className="view-full-btn"
                        style={{ color: info.color }}
                        onClick={() => setActiveTab(index)}
                      >
                        Read Full Response →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          (() => {
            const activeResp = responses[activeTab];
            const info = getModelInfo(activeResp.model);
            return (
              <div 
                className="individual-response-view"
                style={{ '--model-theme': info.color }}
              >
                <div className="response-header-banner" style={{ backgroundColor: info.bg, borderColor: info.border }}>
                  <div className="header-badge-large">
                    <span className="banner-emoji">{info.icon}</span>
                    <div className="banner-text-group">
                      <h4 className="banner-model-name">{info.name}</h4>
                      <span className="banner-provider">Provider: {info.provider}</span>
                    </div>
                  </div>
                  {activeResp.usage && (
                    <div className="token-usage-badge">
                      <span>Tokens: </span>
                      <strong>
                        {activeResp.usage.total_tokens || 
                         (activeResp.usage.input_tokens + activeResp.usage.output_tokens) || 
                         'N/A'}
                      </strong>
                    </div>
                  )}
                </div>
                <div className="response-text markdown-content">
                  <ReactMarkdown>{activeResp.response}</ReactMarkdown>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
