import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { getModelInfo } from '../api';
import './Stage2.css';

function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text;

  let result = text;
  // Replace each "Response X" with the actual model name
  Object.entries(labelToModel).forEach(([label, model]) => {
    const info = getModelInfo(model);
    result = result.replace(
      new RegExp(label, 'g'),
      `<strong class="deanonymized-badge" style="color: ${info.color}; background-color: ${info.bg}; border: 1px solid ${info.border}; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.85em; display: inline-flex; align-items: center; gap: 0.25rem; white-space: nowrap;">${info.icon} ${info.name}</strong>`
    );
  });
  return result;
}

export default function Stage2({ rankings, labelToModel, aggregateRankings }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!rankings || rankings.length === 0) {
    return null;
  }

  const evaluatorCount = rankings.length;

  return (
    <div className="stage stage2">
      <div className="stage-header-row">
        <div className="stage-title-group">
          <span className="stage-badge review-badge">Stage 2</span>
          <h3 className="stage-title">Peer Review & Rankings</h3>
        </div>
        <p className="stage-subtitle-desc">
          Evaluators ranked anonymous responses. Self-preference is excluded.
        </p>
      </div>

      {/* Aggregate Rankings Dashboard */}
      {aggregateRankings && aggregateRankings.length > 0 && (
        <div className="aggregate-dashboard">
          <div className="dashboard-header">
            <div className="dashboard-title-group">
              <h4>Aggregate Consensus (Street Cred)</h4>
              <p className="dashboard-subtitle">
                Compiled from {evaluatorCount} peer evaluations (lower score is better).
              </p>
            </div>
            <div className="evaluator-count-badge">
              <span className="badge-number">{evaluatorCount}</span>
              <span className="badge-text">Evaluators</span>
            </div>
          </div>

          <div className="rankings-chart-list">
            {aggregateRankings.map((agg, index) => {
              const info = getModelInfo(agg.model);
              const totalModels = aggregateRankings.length;
              const maxRank = totalModels > 1 ? totalModels : 5;
              // Map average rank (1.0 to maxRank) to a percentage (100% to 0%)
              const scorePercentage = totalModels > 1
                ? ((maxRank - agg.average_rank) / (maxRank - 1)) * 100
                : 100;

              // Determine medal or badge
              let medal = null;
              let medalClass = '';
              if (index === 0) {
                medal = '🥇';
                medalClass = 'gold';
              } else if (index === 1) {
                medal = '🥈';
                medalClass = 'silver';
              } else if (index === 2) {
                medal = '🥉';
                medalClass = 'bronze';
              }

              return (
                <div key={index} className="ranking-row">
                  <div className="ranking-place-col">
                    {medal ? (
                      <span className={`medal-icon ${medalClass}`}>{medal}</span>
                    ) : (
                      <span className="place-number">#{index + 1}</span>
                    )}
                  </div>

                  <div className="ranking-model-col">
                    <span className="model-emoji">{info.icon}</span>
                    <div className="model-details">
                      <span className="model-name">{info.name}</span>
                      <span className="model-provider">{info.provider}</span>
                    </div>
                  </div>

                  <div className="ranking-bar-col">
                    <div className="bar-container">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.max(scorePercentage, 4)}%`,
                          backgroundColor: info.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="ranking-score-col">
                    <div className="score-main">
                      Avg: <strong style={{ color: info.color }}>{agg.average_rank.toFixed(2)}</strong>
                    </div>
                    <div className="score-votes">
                      {agg.rankings_count} {agg.rankings_count === 1 ? 'vote' : 'votes'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Raw Evaluations Tab Section */}
      <div className="raw-evaluations-section">
        <h4 className="section-subtitle">Individual Peer Review Reports</h4>
        <p className="section-desc">
          Select an evaluator model to view their anonymized ranking and detailed feedback.
        </p>

        <div className="evaluator-tabs-container">
          {rankings.map((rank, index) => {
            const info = getModelInfo(rank.model);
            const isTabActive = activeTab === index;
            return (
              <button
                key={index}
                className={`tab evaluator-tab ${isTabActive ? 'active' : ''}`}
                style={{
                  '--tab-color': info.color,
                  '--tab-bg': info.bg,
                  '--tab-border': info.border,
                }}
                onClick={() => setActiveTab(index)}
              >
                <span className="tab-emoji">{info.icon}</span>
                <span className="tab-model-name">{info.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        <div className="evaluator-report-card">
          {(() => {
            const activeRank = rankings[activeTab];
            const info = getModelInfo(activeRank.model);
            return (
              <>
                <div className="report-header" style={{ borderLeftColor: info.color }}>
                  <span className="report-badge" style={{ backgroundColor: info.bg, color: info.color }}>
                    Evaluator
                  </span>
                  <div className="report-model-info">
                    <h5>{info.name}</h5>
                    <span className="report-provider">Provider: {info.provider}</span>
                  </div>
                </div>

                <div className="report-body markdown-content">
                  <ReactMarkdown 
                    components={{
                      strong: ({ node, children, ...props }) => {
                        // Allow HTML-like tags rendered during de-anonymization
                        return <strong {...props}>{children}</strong>;
                      }
                    }}
                    allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre']}
                  >
                    {deAnonymizeText(activeRank.ranking, labelToModel)}
                  </ReactMarkdown>
                </div>

                {activeRank.parsed_ranking && activeRank.parsed_ranking.length > 0 && (
                  <div className="report-extracted-ranking">
                    <h6>Extracted Ranking Preference:</h6>
                    <div className="extracted-flow">
                      {activeRank.parsed_ranking.map((label, i) => {
                        const modelId = labelToModel ? labelToModel[label] : null;
                        const modelInfo = getModelInfo(modelId);
                        return (
                          <div key={i} className="flow-item">
                            <span className="flow-index">{i + 1}</span>
                            <div
                              className="flow-badge"
                              style={{
                                backgroundColor: modelInfo.bg,
                                borderColor: modelInfo.border,
                                color: modelInfo.color,
                              }}
                            >
                              <span className="flow-emoji">{modelInfo.icon}</span>
                              <span className="flow-model-name">{modelInfo.name}</span>
                              <span className="flow-label">({label})</span>
                            </div>
                            {i < activeRank.parsed_ranking.length - 1 && (
                              <span className="flow-arrow">➔</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
