import ReactMarkdown from 'react-markdown';
import { getModelInfo } from '../api';
import './Stage3.css';

export default function Stage3({ finalResponse }) {
  if (!finalResponse) {
    return null;
  }

  const chairmanInfo = getModelInfo(finalResponse.model);

  return (
    <div className="stage stage3">
      <div className="stage-header-row">
        <div className="stage-title-group">
          <span className="stage-badge synthesis-badge">Stage 3</span>
          <h3 className="stage-title">Final Council Synthesis</h3>
        </div>
        <p className="stage-subtitle-desc">
          The Chairman distilled consensus from the highest-ranked individual responses.
        </p>
      </div>

      <div className="final-response-card">
        {/* Chairman Banner */}
        <div 
          className="chairman-banner"
          style={{
            backgroundColor: chairmanInfo.bg,
            borderColor: chairmanInfo.border,
          }}
        >
          <div className="chairman-title-group">
            <span className="chairman-crown">👑</span>
            <div className="chairman-details">
              <span className="chairman-label" style={{ color: chairmanInfo.color }}>Council Chairman</span>
              <h4 className="chairman-name">{chairmanInfo.name}</h4>
            </div>
          </div>
          <span className="certified-badge">
            <span className="certified-check">✓</span> Consensus Certified
          </span>
        </div>

        {/* Final Response Content */}
        <div className="final-text markdown-content">
          <ReactMarkdown>{finalResponse.response}</ReactMarkdown>
        </div>

        {/* Card Footer */}
        <div className="card-footer-watermark">
          <div className="watermark-content">
            <span className="watermark-logo">🏛️</span>
            <span>LLM Council Consensus Protocol v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
