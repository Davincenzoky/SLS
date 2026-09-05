import { Prediction } from '../types'

interface PredictionPanelProps {
  predictions: Prediction[]
  currentText: string
  confidenceThreshold: number
}

export function PredictionPanel({ predictions, currentText, confidenceThreshold }: PredictionPanelProps) {
  const topPrediction = predictions[0]

  return (
    <div className="prediction-panel">
      <div className="panel-section">
        <h3>Current Predictions</h3>
        {predictions.length > 0 ? (
          <div className="predictions-list">
            {predictions.map((pred, i) => (
              <div key={i} className={`prediction-item ${i === 0 ? 'top' : ''}`}>
                <div className="prediction-label">{pred.label}</div>
                <div className="prediction-confidence">
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill" 
                      style={{ width: `${pred.confidence * 100}%` }}
                    />
                  </div>
                  <span className="confidence-value">
                    {(pred.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-predictions">
            <span className="hint">Show your hand to camera</span>
          </div>
        )}
      </div>

      <div className="panel-section">
        <h3>Recognized Text</h3>
        <div className="text-display" role="textbox" aria-live="polite">
          {currentText || <span className="placeholder">No text recognized yet</span>}
        </div>
        <div className="threshold-control">
          <label>
            Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={confidenceThreshold}
              onChange={() => {}}
            />
          </label>
        </div>
      </div>

      {topPrediction && topPrediction.confidence >= confidenceThreshold && (
        <div className="panel-section success-indicator">
          <span className="success-icon">✓</span>
          <span>Ready to add: <strong>{topPrediction.label}</strong></span>
        </div>
      )}
    </div>
  )
}