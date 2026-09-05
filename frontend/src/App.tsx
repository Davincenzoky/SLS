import { useState, useEffect, useRef, useCallback } from 'react'
import { HandDetection, Prediction, ModelStatus } from './types'
import { VideoFeed } from './components/VideoFeed'
import { PredictionPanel } from './components/PredictionPanel'
import { Controls } from './components/Controls'
import { useHandDetection } from './hooks/useHandDetection'
import { useASLClassifier } from './hooks/useASLClassifier'
import { speakText } from './utils/speech'

export function App() {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [detections, setDetections] = useState<HandDetection[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [currentText, setCurrentText] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7)
  
  const lastPredictionRef = useRef<string>('')
  const predictionStreakRef = useRef(0)
  const textBufferRef = useRef<string>('')

  const { startDetection, stopDetection, status: handStatus } = useHandDetection({
    onDetections: setDetections,
    onError: (e) => setError(e.message)
  })

  const { classify, loadModel, status: classifierStatus } = useASLClassifier()

  useEffect(() => {
    const init = async () => {
      setModelStatus('loading')
      try {
        await loadModel()
        setModelStatus('ready')
      } catch (err) {
        setModelStatus('error')
        setError('Failed to load ASL model')
      }
    }
    init()
  }, [loadModel])

  const processFrame = useCallback(async () => {
    if (!isRunning || detections.length === 0) return

    const detection = detections[0]
    const result = await classify(detection.landmarks)
    
    if (result) {
      const topPrediction = result[0]
      setPredictions(result)

      if (topPrediction.confidence >= confidenceThreshold) {
        handlePrediction(topPrediction.label)
      }
    }
  }, [isRunning, detections, classify, confidenceThreshold])

  const handlePrediction = (label: string) => {
    if (label === lastPredictionRef.current) {
      predictionStreakRef.current++
    } else {
      predictionStreakRef.current = 1
      lastPredictionRef.current = label
    }

    if (predictionStreakRef.current >= 3) {
      if (label === 'SPACE') {
        textBufferRef.current += ' '
      } else if (label === 'DELETE') {
        textBufferRef.current = textBufferRef.current.slice(0, -1)
      } else if (label !== 'NOTHING') {
        textBufferRef.current += label
      }
      
      setCurrentText(textBufferRef.current)
      predictionStreakRef.current = 0
    }
  }

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(processFrame, 200)
    return () => clearInterval(interval)
  }, [isRunning, processFrame])

  const toggleRunning = () => {
    if (isRunning) {
      stopDetection()
      setIsRunning(false)
    } else {
      startDetection()
      setIsRunning(true)
      setError(null)
    }
  }

  const clearText = () => {
    textBufferRef.current = ''
    setCurrentText('')
  }

  const speakCurrentText = () => {
    if (currentText.trim()) {
      speakText(currentText)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>ASL Interpreter</h1>
        <div className="status-indicator">
          <span className={`status-dot ${modelStatus}`}></span>
          <span className="status-text">
            {modelStatus === 'loading' ? 'Loading model...' : 
             modelStatus === 'ready' ? 'Ready' : 
             modelStatus === 'error' ? 'Error' : 'Initializing'}
          </span>
        </div>
      </header>

      <main className="main">
        <div className="video-section">
          <VideoFeed 
            detections={detections} 
            isRunning={isRunning}
            handStatus={handStatus}
            classifierStatus={classifierStatus}
          />
        </div>

        <div className="side-panel">
          <PredictionPanel 
            predictions={predictions} 
            currentText={currentText}
            confidenceThreshold={confidenceThreshold}
          />
          
          <Controls
            isRunning={isRunning}
            modelStatus={modelStatus}
            onToggle={toggleRunning}
            onClear={clearText}
            onSpeak={speakCurrentText}
            confidenceThreshold={confidenceThreshold}
            onConfidenceChange={setConfidenceThreshold}
            currentText={currentText}
          />
        </div>
      </main>

      {error && (
        <div className="error-toast" role="alert">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
    </div>
  )
}

export default App