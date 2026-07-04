import { useState, useEffect } from 'react';
import { MODEL_INFO, MODEL_PRESETS, ALL_MODEL_IDS } from '../api';
import './ModelPicker.css';

export default function ModelPicker({
  selectedModels,
  onChange,
  minModels = 2,
  showPresets = true,
  showSaveDefault = false,
  onSaveDefault,
  compact = false,
}) {
  const [localSelection, setLocalSelection] = useState(selectedModels);

  useEffect(() => {
    setLocalSelection(selectedModels);
  }, [selectedModels]);

  const isSelected = (modelId) => localSelection.includes(modelId);

  const toggleModel = (modelId) => {
    if (isSelected(modelId)) {
      // Don't allow deselecting if it would go below minimum
      if (localSelection.length <= minModels) {
        return;
      }
      const newSelection = localSelection.filter((id) => id !== modelId);
      setLocalSelection(newSelection);
      onChange(newSelection);
    } else {
      const newSelection = [...localSelection, modelId];
      setLocalSelection(newSelection);
      onChange(newSelection);
    }
  };

  const applyPreset = (presetKey) => {
    const preset = MODEL_PRESETS[presetKey];
    if (preset) {
      setLocalSelection(preset.models);
      onChange(preset.models);
    }
  };

  const getPresetForSelection = () => {
    const sortedSelection = [...localSelection].sort().join(',');
    for (const [key, preset] of Object.entries(MODEL_PRESETS)) {
      if ([...preset.models].sort().join(',') === sortedSelection) {
        return key;
      }
    }
    return 'custom';
  };

  const currentPreset = getPresetForSelection();
  const modelCount = localSelection.length;

  return (
    <div className={`model-picker ${compact ? 'compact' : ''}`}>
      {showPresets && (
        <div className="preset-buttons">
          {Object.entries(MODEL_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={`preset-btn ${currentPreset === key ? 'active' : ''}`}
              onClick={() => applyPreset(key)}
              title={`${preset.name} (${preset.models.length} models)`}
            >
              <span className="preset-icon">{preset.icon}</span>
              <span className="preset-name">{preset.name}</span>
              <span className="preset-count">{preset.models.length}</span>
            </button>
          ))}
        </div>
      )}

      <div className="model-count-bar">
        <span className="count-label">
          {modelCount} model{modelCount !== 1 ? 's' : ''} selected
        </span>
        {modelCount < minModels && (
          <span className="count-warning">
            (minimum {minModels} required)
          </span>
        )}
      </div>

      <div className="model-grid">
        {ALL_MODEL_IDS.map((modelId) => {
          const info = MODEL_INFO[modelId];
          const selected = isSelected(modelId);
          return (
            <button
              key={modelId}
              className={`model-chip ${selected ? 'selected' : 'unselected'}`}
              onClick={() => toggleModel(modelId)}
              style={{
                '--model-color': info.color,
                '--model-bg': info.bg,
                '--model-border': info.border,
              }}
              title={`${info.name} (${info.provider})${info.note ? ` — ${info.note}` : ''}`}
            >
              <span className="model-chip-icon">{info.icon}</span>
              <span className="model-chip-text">
                <span className="model-chip-name">{info.name}</span>
                {info.note && <span className="model-chip-note">{info.note}</span>}
              </span>
              {selected && <span className="model-chip-check">✓</span>}
            </button>
          );
        })}
      </div>

      {showSaveDefault && onSaveDefault && (
        <button
          className="save-default-btn"
          onClick={() => onSaveDefault(localSelection)}
        >
          💾 Save as Default
        </button>
      )}
    </div>
  );
}
