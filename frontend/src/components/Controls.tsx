interface ControlsProps {
  isRunning: boolean
  modelStatus: string
  onToggle: () => void
  onClear: () => void
  onSpeak: () => void
  confidenceThreshold: number
  onConfidenceChange: (value: number) => void
  currentText: string
}

export function Controls({
  isRunning,
  modelStatus,
  onToggle,
  onClear,
  onSpeak,
  confidenceThreshold,
  onConfidenceChange,
  currentText
}: ControlsProps) {
  const canSpeak = currentText.trim().length > 0

  return (
    <div className="controls-panel">
      <div className="control-group">
        <button 
          className={`btn btn-primary ${isRunning ? 'running' : ''}`}
          onClick={onToggle}
          disabled={modelStatus !== 'ready'}
          aria-pressed={isRunning}
        >
          <span className="btn-icon">{isRunning ? '⏸' : '▶'}</span>
          <span>{isRunning ? 'Pause' : 'Start'}</span>
        </button>
      </div>

      <div className="control-group">
        <button 
          className="btn btn-secondary"
          onClick={onClear}
          disabled={!currentText}
        >
          <span className="btn-icon">🗑</span>
          <span>Clear Text</span>
        </button>
        
        <button 
          className="btn btn-accent"
          onClick={onSpeak}
          disabled={!canSpeak}
        >
          <span className="btn-icon">🔊</span>
          <span>Speak</span>
        </button>
      </div>

      <div className="control-group">
        <label className="threshold-label">
          <span>Confidence: {(confidenceThreshold * 100).toFixed(0)}%</span>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
            className="threshold-slider"
          />
        </label>
      </div>

      <div className="control-info">
        <p className="info-item">
          <span className="info-icon">📷</span>
          <span>Position hands clearly in frame</span>
        </p>
        <p className="info-item">
          <span className="info-icon">🤲</span>
          <span>Hold sign steady for 2-3 seconds</span>
        </p>
        <p className="info-item">
          <span className="info-icon">💡</span>
          <span>Good lighting improves accuracy</span>
        </p>
      </div>
    </div>
  )
}